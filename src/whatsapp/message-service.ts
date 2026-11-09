import { getSocket } from './baileys-adapter.js';
import { getLogger } from '../core/logger.js';
import { normalizeJid, isGroupJid } from './jid-utils.js';
import { getDatabase } from '../database/client.js';
import { messages, contacts, chats } from '../database/schema/index.js';
import { eq, and, desc, lt, sql } from 'drizzle-orm';
import { AppError, ERROR_CODES } from '../core/errors.js';
import { randomUUID } from 'crypto';
import fs from 'fs';

const logger = getLogger().child({ component: 'MessageService' });

export interface SendMessageOptions {
  to: string;
  text?: string;
  replyTo?: string;
  mentions?: string[];
}

export interface SendMediaOptions {
  to: string;
  media: {
    path: string;
    mimetype: string;
    filename?: string;
    caption?: string;
  };
  replyTo?: string;
}

function extractMessageId(result: any, fallbackId: string): string {
  if (typeof result === 'string') return result;
  if (result?.key?.id) return result.key.id;
  return fallbackId;
}

export async function sendTextMessage(options: SendMessageOptions): Promise<{ messageId: string; timestamp: Date }> {
  const socket = getSocket(options.to.split('@')[0]);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const to = normalizeJid(options.to);
  const result = await socket.sendMessage(to, {
    text: options.text || '',
  }, { quoted: options.replyTo ? { key: { id: options.replyTo, remoteJid: to } } : undefined });

  const messageId = extractMessageId(result, randomUUID());
  return { messageId, timestamp: new Date() };
}

export async function sendMediaMessage(options: SendMediaOptions): Promise<{ messageId: string; timestamp: Date }> {
  const socket = getSocket(options.to.split('@')[0]);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const to = normalizeJid(options.to);
  const { path: mediaPath, mimetype, filename, caption } = options.media;

  // Read the file as buffer
  const buffer = fs.readFileSync(mediaPath);

  let messageContent: any;

  if (mimetype.startsWith('image/')) {
    messageContent = {
      image: buffer,
      caption: caption || '',
      mimetype,
    };
  } else if (mimetype.startsWith('video/')) {
    messageContent = {
      video: buffer,
      caption: caption || '',
      mimetype,
    };
  } else if (mimetype.startsWith('audio/')) {
    messageContent = {
      audio: buffer,
      mimetype,
      ptt: mimetype === 'audio/ogg; codecs=opus',
    };
  } else {
    messageContent = {
      document: buffer,
      mimetype,
      fileName: filename || 'document',
      caption: caption || '',
    };
  }

  const result = await socket.sendMessage(to, messageContent, {
    quoted: options.replyTo ? { key: { id: options.replyTo, remoteJid: to } } : undefined,
  });

  const messageId = extractMessageId(result, randomUUID());
  return { messageId, timestamp: new Date() };
}

export async function sendLocationMessage(to: string, location: {
  degreesLatitude: number;
  degreesLongitude: number;
  name?: string;
  address?: string;
}): Promise<{ messageId: string; timestamp: Date }> {
  const socket = getSocket(to.split('@')[0]);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedTo = normalizeJid(to);
  const result = await socket.sendMessage(normalizedTo, {
    location: {
      degreesLatitude: location.degreesLatitude,
      degreesLongitude: location.degreesLongitude,
      name: location.name,
      address: location.address,
    },
  });

  const messageId = extractMessageId(result, randomUUID());
  return { messageId, timestamp: new Date() };
}

export async function sendContactMessage(to: string, contact: {
  displayName: string;
  vcard: string;
}): Promise<{ messageId: string; timestamp: Date }> {
  const socket = getSocket(to.split('@')[0]);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedTo = normalizeJid(to);
  const result = await socket.sendMessage(normalizedTo, {
    contacts: {
      displayName: contact.displayName,
      contacts: [{ vcard: contact.vcard }],
    },
  });

  const messageId = extractMessageId(result, randomUUID());
  return { messageId, timestamp: new Date() };
}

export async function reactToMessage(to: string, messageId: string, reaction: string): Promise<void> {
  const socket = getSocket(to.split('@')[0]);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedTo = normalizeJid(to);
  await socket.sendMessage(normalizedTo, {
    react: {
      text: reaction,
      key: { id: messageId, remoteJid: normalizedTo },
    },
  });
}

export async function deleteMessage(accountId: string, messageId: string, remoteJid: string): Promise<void> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  await socket.sendMessage(normalizeJid(remoteJid), {
    delete: {
      remoteJid: normalizeJid(remoteJid),
      id: messageId,
      participant: remoteJid,
    },
  });
}

export async function getMessages(
  accountId: string,
  chatJid: string,
  limit: number = 50,
  before?: Date
): Promise<any[]> {
  const db = getDatabase();
  const normalizedChatJid = normalizeJid(chatJid);

  const conditions = [
    eq(messages.accountId, accountId),
    eq(messages.chatJid, normalizedChatJid),
  ];

  if (before) {
    conditions.push(lt(messages.timestamp, before));
  }

  return db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.timestamp))
    .limit(limit);
}

export async function markAsRead(accountId: string, chatJid: string, messageIds: string[]): Promise<void> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedChatJid = normalizeJid(chatJid);
  await socket.readMessages(messageIds.map(id => ({ id, remoteJid: normalizedChatJid })));

  const db = getDatabase();
  await db
    .update(chats)
    .set({ unreadCount: 0, updatedAt: new Date() })
    .where(and(eq(chats.accountId, accountId), eq(chats.chatJid, normalizedChatJid)));
}

export async function searchMessages(accountId: string, query: string, limit: number = 50): Promise<any[]> {
  const db = getDatabase();
  return db
    .select()
    .from(messages)
    .where(and(
      eq(messages.accountId, accountId),
      sql`${messages.messageContent} LIKE ${'%' + query + '%'}`
    ))
    .orderBy(desc(messages.timestamp))
    .limit(limit);
}