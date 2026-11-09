import { getSocket } from './baileys-adapter.js';
import { getLogger } from '../core/logger.js';
import { normalizeJid, isGroupJid } from './jid-utils.js';
import { getDatabase } from '../database/client.js';
import { chats, messages } from '../database/schema/index.js';
import { eq, and, desc, count, like } from 'drizzle-orm';
import { AppError, ERROR_CODES } from '../core/errors.js';

const logger = getLogger().child({ component: 'ChatService' });

export async function getChats(
  accountId: string,
  limit: number = 50,
  offset: number = 0,
  options?: { isGroup?: boolean; search?: string }
): Promise<any[]> {
  const db = getDatabase();

  const conditions = [eq(chats.accountId, accountId)];

  if (options?.isGroup !== undefined) {
    conditions.push(eq(chats.isGroup, options.isGroup));
  }

  if (options?.search) {
    conditions.push(like(chats.name, `%${options.search}%`));
  }

  return db
    .select()
    .from(chats)
    .where(and(...conditions))
    .orderBy(desc(chats.lastMessageAt))
    .limit(limit)
    .offset(offset);
}

export async function getChat(accountId: string, chatJid: string): Promise<any | null> {
  const db = getDatabase();
  const normalizedJid = normalizeJid(chatJid);

  const result = await db
    .select()
    .from(chats)
    .where(and(eq(chats.accountId, accountId), eq(chats.chatJid, normalizedJid)))
    .limit(1);

  if (result[0]) return result[0];

  const socket = getSocket(accountId);
  if (!socket) return null;

  try {
    const chat = await socket.chats.get(normalizedJid);
    if (chat) {
      return {
        jid: chat.id,
        name: chat.name,
        isGroup: isGroupJid(chat.id),
        unreadCount: chat.unreadCount || 0,
        lastMessageTimestamp: chat.lastMessage?.messageTimestamp ? new Date(chat.lastMessage.messageTimestamp * 1000) : undefined,
      };
    }
  } catch (error) {
    logger.debug({ chatJid, error }, 'Failed to fetch chat from WhatsApp');
  }

  return null;
}

export async function getChatMessages(
  accountId: string,
  chatJid: string,
  limit: number = 50,
  before?: Date
): Promise<any[]> {
  const db = getDatabase();
  const normalizedJid = normalizeJid(chatJid);

  const conditions = [
    eq(messages.accountId, accountId),
    eq(messages.chatJid, normalizedJid),
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

export async function markChatAsRead(accountId: string, chatJid: string): Promise<void> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeJid(chatJid);

  const chat = await socket.chats.get(normalizedJid);
  if (chat?.messages) {
    const unreadMessages = chat.messages.filter((m: any) => !m.key.fromMe && m.status !== 'read');
    if (unreadMessages.length > 0) {
      await socket.readMessages(unreadMessages.map((m: any) => ({ id: m.key.id, remoteJid: normalizedJid })));
    }
  }

  const db = getDatabase();
  await db
    .update(chats)
    .set({ unreadCount: 0, updatedAt: new Date() })
    .where(and(eq(chats.accountId, accountId), eq(chats.chatJid, normalizedJid)));
}

export async function archiveChat(accountId: string, chatJid: string, archive: boolean = true): Promise<void> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeJid(chatJid);
  await socket.chatModify({ archive }, normalizedJid);
}

export async function getUnreadCount(accountId: string): Promise<number> {
  const db = getDatabase();
  const result = await db
    .select({ total: count() })
    .from(chats)
    .where(and(eq(chats.accountId, accountId), chats.unreadCount.gt(0)));

  const totalResult = await db
    .select({ total: count() })
    .from(chats)
    .where(eq(chats.accountId, accountId));

  return totalResult[0]?.total ?? 0;
}

export async function countChats(accountId: string): Promise<number> {
  const db = getDatabase();
  const result = await db.select({ count: count() }).from(chats).where(eq(chats.accountId, accountId));
  return result[0]?.count ?? 0;
}

export async function searchChats(accountId: string, query: string, limit: number = 50): Promise<any[]> {
  return getChats(accountId, limit, 0, { search: query });
}