import makeWASocket, {
  WASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  useMultiFileAuthState,
  WAMessage,
  proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import NodeCache from 'node-cache';
import { getConfig } from '../config/env.js';
import { getLogger } from '../core/logger.js';
import { sessionManager } from './session-manager.js';
import { scheduleReconnect, cancelReconnect, resetReconnectState } from './reconnect-manager.js';
import { eventBus } from '../core/events.js';
import { ConnectionState, EVENT_TYPES } from '../config/constants.js';
import { normalizeJid, isGroupJid } from './jid-utils.js';
import { getDatabase } from '../database/client.js';
import { messages, contacts, chats, groups, accounts } from '../database/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';

const logger = getLogger().child({ component: 'BaileysAdapter' });

interface BaileysConnection {
  socket: WASocket;
  accountId: string;
  status: ConnectionState;
  qrCode?: string;
  pairingCode?: string;
  lastActivity: Date;
}

const connections = new Map<string, BaileysConnection>();
const messageCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export async function createConnection(accountId: string): Promise<WASocket> {
  const config = getConfig();

  const { state, saveCreds } = await useMultiFileAuthState(sessionManager.getSessionPath(accountId).replace('.json', ''));

  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info({ accountId, version, isLatest }, 'Baileys version');

  const socket = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: Browsers.macOS('Desktop'),
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
    emitOwnEvents: true,
    logger: logger.child({ accountId }),
    msgRetryCounterCache: messageCache,
  });

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    const conn = connections.get(accountId);
    if (!conn) return;

    if (qr) {
      conn.qrCode = qr;
      conn.status = 'qr_pending';
      await updateAccountStatus(accountId, 'qr_pending');
      eventBus.emit(EVENT_TYPES[2], accountId, qr);
      logger.info({ accountId }, 'QR code generated');
    }

    if (connection === 'open') {
      conn.status = 'connected';
      conn.qrCode = undefined;
      await updateAccountStatus(accountId, 'connected');
      resetReconnectState(accountId);
      eventBus.emit(EVENT_TYPES[0], accountId);
      logger.info({ accountId }, 'WhatsApp connected');
    } else if (connection === 'close') {
      const boomError = lastDisconnect?.error as { output?: { statusCode?: number } } | undefined;
      const shouldReconnect = boomError?.output?.statusCode !== DisconnectReason.loggedOut;

      conn.status = shouldReconnect ? 'reconnecting' : 'logged_out';
      await updateAccountStatus(accountId, conn.status);

      if (shouldReconnect && config.WHATSAPP_AUTO_RECONNECT) {
        logger.warn({ accountId, error: lastDisconnect?.error }, 'Connection closed, scheduling reconnect');
        eventBus.emit(EVENT_TYPES[3], accountId, lastDisconnect?.error);
        scheduleReconnect(accountId, async () => { await createConnection(accountId); });
      } else {
        logger.warn({ accountId }, 'Logged out');
        eventBus.emit(EVENT_TYPES[1], accountId);
        cancelReconnect(accountId);
      }
    } else if (connection === 'connecting') {
      conn.status = 'connecting';
      await updateAccountStatus(accountId, 'connecting');
    }
  });

  socket.ev.on('messages.upsert', async (m) => {
    for (const msg of m.messages) {
      await handleIncomingMessage(accountId, socket, msg);
    }
  });

  socket.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      await handleMessageUpdate(accountId, update);
    }
  });

  socket.ev.on('messages.delete', async (deletion) => {
    await handleMessageDelete(accountId, deletion);
  });

  socket.ev.on('chats.update', async (chatUpdates) => {
    for (const chatUpdate of chatUpdates) {
      await handleChatUpdate(accountId, chatUpdate);
    }
  });

  socket.ev.on('contacts.update', async (contactUpdates) => {
    for (const contactUpdate of contactUpdates) {
      await handleContactUpdate(accountId, contactUpdate);
    }
  });

  socket.ev.on('groups.update', async (groupUpdates) => {
    for (const groupUpdate of groupUpdates) {
      await handleGroupUpdate(accountId, groupUpdate);
    }
  });

  socket.ev.on('group-participants.update', async (update) => {
    await handleGroupParticipantsUpdate(accountId, update);
  });

  const conn: BaileysConnection = {
    socket,
    accountId,
    status: 'connecting',
    lastActivity: new Date(),
  };

  connections.set(accountId, conn);
  await updateAccountStatus(accountId, 'connecting');

  return socket;
}

async function handleIncomingMessage(accountId: string, socket: WASocket, msg: WAMessage): Promise<void> {
  if (!msg.key.remoteJid || msg.key.fromMe) return;

  const chatJid = msg.key.remoteJid;
  const senderJid = msg.key.participant || chatJid;
  const timestamp = new Date(Number(msg.messageTimestamp ?? 0) * 1000);

  const content = extractMessageContent(msg);
  const type = getMessageType(msg);

  await storeMessage({
    accountId,
    chatJid,
    messageId: msg.key.id!,
    senderJid,
    messageType: type,
    messageContent: JSON.stringify(content),
    direction: 'inbound',
    timestamp,
    status: 'delivered',
  });

  await updateChat(accountId, chatJid, {
    lastMessageAt: timestamp,
    unreadCount: 1,
  });

  eventBus.emit(EVENT_TYPES[4], accountId, {
    id: msg.key.id,
    from: senderJid,
    to: chatJid,
    timestamp,
    type,
    content,
    pushName: msg.pushName,
    isFromMe: false,
    isGroup: isGroupJid(chatJid),
  });
}

async function handleMessageUpdate(accountId: string, update: any): Promise<void> {
  if (!update.key?.remoteJid) return;

  await updateMessageStatus(accountId, update.key.id, update.status);

  eventBus.emit(EVENT_TYPES[5], accountId, update);
}

async function handleMessageDelete(accountId: string, deletion: any): Promise<void> {
  if (!deletion.keys?.length) return;

  for (const key of deletion.keys) {
    await deleteMessage(accountId, key.id);
  }

  eventBus.emit(EVENT_TYPES[6], accountId, deletion);
}

async function handleChatUpdate(accountId: string, chatUpdate: any): Promise<void> {
  await updateChat(accountId, chatUpdate.id, chatUpdate);
  eventBus.emit(EVENT_TYPES[8], accountId, chatUpdate);
}

async function handleContactUpdate(accountId: string, contactUpdate: any): Promise<void> {
  await upsertContact(accountId, contactUpdate);
  eventBus.emit(EVENT_TYPES[9], accountId, contactUpdate);
}

async function handleGroupUpdate(accountId: string, groupUpdate: any): Promise<void> {
  await upsertGroup(accountId, groupUpdate);
  eventBus.emit(EVENT_TYPES[10], accountId, groupUpdate);
}

async function handleGroupParticipantsUpdate(accountId: string, update: any): Promise<void> {
  eventBus.emit(EVENT_TYPES[11], accountId, update);
}

function extractMessageContent(msg: WAMessage): any {
  if (!msg.message) return null;

  const messageType = Object.keys(msg.message)[0] as keyof proto.IMessage;
  const content = msg.message[messageType] as Record<string, any>;

  switch (messageType) {
    case 'conversation':
    case 'extendedTextMessage':
      return content?.text ?? '';
    case 'imageMessage':
      return { caption: content?.caption ?? '', mimetype: content?.mimetype ?? '' };
    case 'videoMessage':
      return { caption: content?.caption ?? '', mimetype: content?.mimetype ?? '' };
    case 'documentMessage':
      return { filename: content?.fileName ?? '', mimetype: content?.mimetype ?? '', caption: content?.caption ?? '' };
    case 'audioMessage':
      return { mimetype: content?.mimetype ?? '', seconds: content?.seconds ?? 0 };
    case 'locationMessage':
      return { latitude: content?.degreesLatitude ?? 0, longitude: content?.degreesLongitude ?? 0, name: content?.name ?? '', address: content?.address ?? '' };
    case 'contactMessage':
      return { displayName: content?.displayName ?? '', vcard: content?.vcard ?? '' };
    case 'reactionMessage':
      return { key: content?.key, reaction: content?.text ?? '' };
    case 'stickerMessage':
      return { mimetype: content?.mimetype ?? '' };
    default:
      return { type: messageType };
  }
}

function getMessageType(msg: WAMessage): string {
  if (!msg.message) return 'unknown';
  return Object.keys(msg.message)[0];
}

async function storeMessage(data: {
  accountId: string;
  chatJid: string;
  messageId: string;
  senderJid: string;
  messageType: string;
  messageContent: string;
  direction: 'inbound' | 'outbound';
  timestamp: Date;
  status: string;
}): Promise<void> {
  const db = getDatabase();
  // Map Baileys message types to our enum
  const messageTypeMap: Record<string, 'text' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'contact' | 'reaction' | 'sticker' | 'poll'> = {
    'conversation': 'text',
    'extendedTextMessage': 'text',
    'imageMessage': 'image',
    'videoMessage': 'video',
    'documentMessage': 'document',
    'audioMessage': 'audio',
    'locationMessage': 'location',
    'contactMessage': 'contact',
    'reactionMessage': 'reaction',
    'stickerMessage': 'sticker',
    'pollMessage': 'poll',
  };

  const mappedMessageType = messageTypeMap[data.messageType] || 'text';
  const mappedStatus = ['pending', 'sent', 'delivered', 'read', 'failed'].includes(data.status) ? data.status : 'pending';

  await db.insert(messages).values({
    id: crypto.randomUUID(),
    accountId: data.accountId,
    chatJid: data.chatJid,
    messageId: data.messageId,
    senderJid: data.senderJid,
    messageType: mappedMessageType,
    messageContent: data.messageContent,
    direction: data.direction,
    timestamp: data.timestamp,
    status: mappedStatus as 'pending' | 'sent' | 'delivered' | 'read' | 'failed',
    createdAt: new Date(),
  });
}

async function updateMessageStatus(accountId: string, messageId: string, status: string): Promise<void> {
  const db = getDatabase();
  const mappedStatus = ['pending', 'sent', 'delivered', 'read', 'failed'].includes(status) ? status : 'pending';
  await db
    .update(messages)
    .set({ status: mappedStatus as 'pending' | 'sent' | 'delivered' | 'read' | 'failed' })
    .where(and(eq(messages.accountId, accountId), eq(messages.messageId, messageId)));
}

async function deleteMessage(accountId: string, messageId: string): Promise<void> {
  const db = getDatabase();
  await db
    .delete(messages)
    .where(and(eq(messages.accountId, accountId), eq(messages.messageId, messageId)));
}

async function updateChat(accountId: string, chatJid: string, data: any): Promise<void> {
  const db = getDatabase();
  const existing = await db
    .select()
    .from(chats)
    .where(and(eq(chats.accountId, accountId), eq(chats.chatJid, chatJid)))
    .limit(1);

  const now = new Date();

  if (existing[0]) {
    await db
      .update(chats)
      .set({ ...data, updatedAt: now })
      .where(eq(chats.id, existing[0].id));
  } else {
    await db.insert(chats).values({
      id: crypto.randomUUID(),
      accountId,
      chatJid,
      name: data.name,
      isGroup: isGroupJid(chatJid),
      unreadCount: data.unreadCount ?? 0,
      lastMessageAt: data.lastMessageAt ?? now,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function upsertContact(accountId: string, contact: any): Promise<void> {
  const db = getDatabase();
  const existing = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.accountId, accountId), eq(contacts.jid, contact.id)))
    .limit(1);

  const now = new Date();

  if (existing[0]) {
    await db
      .update(contacts)
      .set({
        name: contact.name || contact.notify,
        phoneNumber: contact.id.split('@')[0],
        profilePictureUrl: contact.imgUrl,
        updatedAt: now,
      })
      .where(eq(contacts.id, existing[0].id));
  } else {
    await db.insert(contacts).values({
      id: crypto.randomUUID(),
      accountId,
      jid: contact.id,
      name: contact.name || contact.notify,
      phoneNumber: contact.id.split('@')[0],
      profilePictureUrl: contact.imgUrl,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function upsertGroup(accountId: string, group: any): Promise<void> {
  const db = getDatabase();
  const existing = await db
    .select()
    .from(groups)
    .where(and(eq(groups.accountId, accountId), eq(groups.groupJid, group.id)))
    .limit(1);

  const now = new Date();

  if (existing[0]) {
    await db
      .update(groups)
      .set({
        subject: group.subject,
        description: group.desc,
        ownerJid: group.owner,
        updatedAt: now,
      })
      .where(eq(groups.id, existing[0].id));
  } else {
    await db.insert(groups).values({
      id: crypto.randomUUID(),
      accountId,
      groupJid: group.id,
      subject: group.subject,
      description: group.desc,
      ownerJid: group.owner,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function updateAccountStatus(accountId: string, status: ConnectionState): Promise<void> {
  const db = getDatabase();
  await db
    .update(accounts)
    .set({ status, updatedAt: new Date() })
    .where(eq(accounts.id, accountId));
}

export function getSocket(accountId: string): WASocket | null {
  return connections.get(accountId)?.socket ?? null;
}

export function getConnectionStatus(accountId: string): ConnectionState {
  return connections.get(accountId)?.status ?? 'disconnected';
}

export function getQRCode(accountId: string): string | undefined {
  return connections.get(accountId)?.qrCode;
}

export function getPairingCode(accountId: string): string | undefined {
  return connections.get(accountId)?.pairingCode;
}

export async function disconnectAccount(accountId: string): Promise<void> {
  const conn = connections.get(accountId);
  if (conn) {
    await conn.socket.logout();
    connections.delete(accountId);
    cancelReconnect(accountId);
    await updateAccountStatus(accountId, 'disconnected');
  }
}

export async function logoutAccount(accountId: string): Promise<void> {
  const conn = connections.get(accountId);
  if (conn) {
    await conn.socket.logout();
    await sessionManager.deleteSession(accountId);
    connections.delete(accountId);
    cancelReconnect(accountId);
    await updateAccountStatus(accountId, 'logged_out');
  }
}

export async function requestPairingCode(accountId: string, phoneNumber: string): Promise<string> {
  const socket = getSocket(accountId);
  if (!socket) throw new Error('Not connected');

  const code = await socket.requestPairingCode(phoneNumber);
  const conn = connections.get(accountId);
  if (conn) {
    conn.pairingCode = code;
  }
  return code;
}