import { getDatabase } from '../database/client.js';
import { messages, chats, contacts } from '../database/schema/index.js';
import { eq, and, desc, like, count, gte, lte } from 'drizzle-orm';
import { normalizeJid, isGroupJid } from './jid-utils.js';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'HistoryService' });

export interface MessageHistoryOptions {
  accountId: string;
  chatJid?: string;
  limit?: number;
  offset?: number;
  before?: Date;
  after?: Date;
  type?: string;
  search?: string;
}

export async function getMessageHistory(options: MessageHistoryOptions): Promise<{ messages: any[]; total: number }> {
  const db = getDatabase();
  const { accountId, chatJid, limit = 50, offset = 0, before, after, type, search } = options;

  const conditions = [eq(messages.accountId, accountId)];

  if (chatJid) {
    conditions.push(eq(messages.chatJid, normalizeJid(chatJid)));
  }

  if (before) {
    conditions.push(lte(messages.timestamp, before.getTime()));
  }

  if (after) {
    conditions.push(gte(messages.timestamp, after.getTime()));
  }

  if (type) {
    conditions.push(eq(messages.messageType, type));
  }

  if (search) {
    conditions.push(like(messages.messageContent, `%${search}%`));
  }

  const [messageResults, totalResult] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.timestamp))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(messages).where(and(...conditions)),
  ]);

  return {
    messages: messageResults,
    total: totalResult[0]?.count ?? 0,
  };
}

export async function getChatHistory(
  accountId: string,
  chatJid: string,
  limit: number = 100
): Promise<any[]> {
  const result = await getMessageHistory({ accountId, chatJid, limit });
  return result.messages;
}

export async function searchMessages(
  accountId: string,
  query: string,
  options?: { limit?: number; chatJid?: string; before?: Date; after?: Date }
): Promise<any[]> {
  const result = await getMessageHistory({
    accountId,
    chatJid: options?.chatJid,
    limit: options?.limit ?? 50,
    before: options?.before,
    after: options?.after,
    search: query,
  });
  return result.messages;
}

export async function getConversationHistory(
  accountId: string,
  contactJid: string,
  limit: number = 100
): Promise<any[]> {
  return getChatHistory(accountId, normalizeJid(contactJid), limit);
}

export async function getGroupHistory(
  accountId: string,
  groupJid: string,
  limit: number = 100
): Promise<any[]> {
  return getChatHistory(accountId, normalizeJid(groupJid), limit);
}

export async function getMessageCount(
  accountId: string,
  chatJid?: string
): Promise<number> {
  const db = getDatabase();
  const conditions = [eq(messages.accountId, accountId)];

  if (chatJid) {
    conditions.push(eq(messages.chatJid, normalizeJid(chatJid)));
  }

  const result = await db.select({ count: count() }).from(messages).where(and(...conditions));
  return result[0]?.count ?? 0;
}

export async function getMessageById(accountId: string, messageId: string): Promise<any | null> {
  const db = getDatabase();
  const result = await db
    .select()
    .from(messages)
    .where(and(eq(messages.accountId, accountId), eq(messages.messageId, messageId)))
    .limit(1);

  return result[0] ?? null;
}

export async function getMessageStats(accountId: string): Promise<{
  total: number;
  inbound: number;
  outbound: number;
  byType: Record<string, number>;
}> {
  const db = getDatabase();

  const [totalResult, inboundResult, outboundResult, typeResults] = await Promise.all([
    db.select({ count: count() }).from(messages).where(eq(messages.accountId, accountId)),
    db.select({ count: count() }).from(messages).where(and(eq(messages.accountId, accountId), eq(messages.direction, 'inbound'))),
    db.select({ count: count() }).from(messages).where(and(eq(messages.accountId, accountId), eq(messages.direction, 'outbound'))),
    db.select({ messageType: messages.messageType, count: count() })
      .from(messages)
      .where(eq(messages.accountId, accountId))
      .groupBy(messages.messageType),
  ]);

  const byType: Record<string, number> = {};
  for (const row of typeResults) {
    byType[row.messageType] = row.count;
  }

  return {
    total: totalResult[0]?.count ?? 0,
    inbound: inboundResult[0]?.count ?? 0,
    outbound: outboundResult[0]?.count ?? 0,
    byType,
  };
}