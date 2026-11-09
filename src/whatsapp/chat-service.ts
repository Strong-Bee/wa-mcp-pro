import { getSocket } from './baileys-adapter.js';
import { getLogger } from '../core/logger.js';
import { normalizeJid, isGroupJid } from './jid-utils.js';
import { getDatabase } from '../database/client.js';
import { chats, messages } from '../database/schema/index.js';
import { eq, and, desc, count, like, lt, gt } from 'drizzle-orm';
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

  // Chat not in database - we can't fetch from WhatsApp directly in Baileys 6.17.16
  // The chats are populated via events (chats.update)
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
    conditions.push(lt(messages.timestamp, before));
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

  // Get unread message IDs from database
  const db = getDatabase();
  const unreadMessages = await db
    .select({ messageId: messages.messageId })
    .from(messages)
    .where(and(
      eq(messages.accountId, accountId),
      eq(messages.chatJid, normalizedJid),
      eq(messages.direction, 'inbound'),
      eq(messages.status, 'delivered')
    ))
    .limit(100);

  if (unreadMessages.length > 0) {
    await socket.readMessages(unreadMessages.map(m => ({ id: m.messageId, remoteJid: normalizedJid })));
  }

  await db
    .update(chats)
    .set({ unreadCount: 0, updatedAt: new Date() })
    .where(and(eq(chats.accountId, accountId), eq(chats.chatJid, normalizedJid)));
}

export async function archiveChat(accountId: string, chatJid: string, archive: boolean = true): Promise<void> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeJid(chatJid);
  // chatModify expects a different structure in Baileys 6.17.16
  await socket.chatModify({ archive, lastMessages: [] }, normalizedJid);
}

export async function getUnreadCount(accountId: string): Promise<number> {
  const db = getDatabase();
  const result = await db
    .select({ total: count() })
    .from(chats)
    .where(and(eq(chats.accountId, accountId), gt(chats.unreadCount, 0)));

  return result[0]?.total ?? 0;
}

export async function countChats(accountId: string): Promise<number> {
  const db = getDatabase();
  const result = await db.select({ count: count() }).from(chats).where(eq(chats.accountId, accountId));
  return result[0]?.count ?? 0;
}

export async function searchChats(accountId: string, query: string, limit: number = 50): Promise<any[]> {
  return getChats(accountId, limit, 0, { search: query });
}