import { getSocket } from './baileys-adapter.js';
import { getLogger } from '../core/logger.js';
import { normalizeJid, isGroupJid } from './jid-utils.js';
import { getDatabase } from '../database/client.js';
import { messages, contacts, chats } from '../database/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from '@whiskeysockets/baileys';
import { AppError, ERROR_CODES } from '../core/errors.js';

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

export async function sendTextMessage(options: SendMessageOptions): Promise<{ messageId: string; timestamp: Date }> {
  const socket = getSocket(options.to.split('@')[0]);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const to = normalizeJid(options.to);
  const content = generateWAMessageFromContent(
    to,
    proto.Message.fromObject({
      conversation: options.text || '',
    }),
    { userJid: socket.user?.id }
  );

  if (options.replyTo) {
    const [msg] = await socket.relayMessage(to, content.message!, {
      messageId: content.key.id!,
      participant: options.replyTo,
    });
    return { messageId: msg?.key?.id || content.key.id!, timestamp: new Date() };
  }

  const result = await socket.relayMessage(to, content.message!, { messageId: content.key.id! });
  return { messageId: result?.key?.id || content.key.id!, timestamp: new Date() };
}

export async function sendMediaMessage(options: SendMediaOptions): Promise<{ messageId: string; timestamp: Date }> {
  const socket = getSocket(options.to.split('@')[0]);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const to = normalizeJid(options.to);
  const { path: mediaPath, mimetype, filename, caption } = options.media;

  const media = await prepareWAMessageMedia({ media: mediaPath }, 'regular', { logger });

  let messageContent: proto.IMessage;

  if (mimetype.startsWith('image/')) {
    messageContent = proto.Message.fromObject({
      imageMessage: {
        ...media,
        caption: caption || '',
        mimetype,
        jpegThumbnail: media.jpegThumbnail,
      },
    });
  } else if (mimetype.startsWith('video/')) {
    messageContent = proto.Message.fromObject({
      videoMessage: {
        ...media,
        caption: caption || '',
        mimetype,
      },
    });
  } else if (mimetype.startsWith('audio/')) {
    messageContent = proto.Message.fromObject({
      audioMessage: {
        ...media,
        mimetype,
        ptt: mimetype === 'audio/ogg; codecs=opus',
      },
    });
  } else {
    messageContent = proto.Message.fromObject({
      documentMessage: {
        ...media,
        mimetype,
        fileName: filename || 'document',
        caption: caption || '',
      },
    });
  }

  const content = generateWAMessageFromContent(to, messageContent, { userJid: socket.user?.id });

  if (options.replyTo) {
    const [msg] = await socket.relayMessage(to, content.message!, {
      messageId: content.key.id!,
      participant: options.replyTo,
    });
    return { messageId: msg?.key?.id || content.key.id!, timestamp: new Date() };
  }

  const result = await socket.relayMessage(to, content.message!, { messageId: content.key.id! });
  return { messageId: result?.key?.id || content.key.id!, timestamp: new Date() };
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
  const content = generateWAMessageFromContent(
    normalizedTo,
    proto.Message.fromObject({
      locationMessage: {
        degreesLatitude: location.degreesLatitude,
        degreesLongitude: location.degreesLongitude,
        name: location.name,
        address: location.address,
      },
    }),
    { userJid: socket.user?.id }
  );

  const result = await socket.relayMessage(normalizedTo, content.message!, { messageId: content.key.id! });
  return { messageId: result?.key?.id || content.key.id!, timestamp: new Date() };
}

export async function sendContactMessage(to: string, contact: {
  displayName: string;
  vcard: string;
}): Promise<{ messageId: string; timestamp: Date }> {
  const socket = getSocket(to.split('@')[0]);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedTo = normalizeJid(to);
  const content = generateWAMessageFromContent(
    normalizedTo,
    proto.Message.fromObject({
      contactMessage: {
        displayName: contact.displayName,
        vcard: contact.vcard,
      },
    }),
    { userJid: socket.user?.id }
  );

  const result = await socket.relayMessage(normalizedTo, content.message!, { messageId: content.key.id! });
  return { messageId: result?.key?.id || content.key.id!, timestamp: new Date() };
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
    conditions.push(messages.timestamp.lt(before));
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
      messages.messageContent.like(`%${query}%`)
    ))
    .orderBy(desc(messages.timestamp))
    .limit(limit);
}