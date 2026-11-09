import { getDatabase } from '../client.js';
import { messages, Message, NewMessage } from '../schema/messages.js';
import { eq, desc, and, gte, lte, count } from 'drizzle-orm';

export async function createMessage(data: Omit<NewMessage, 'id' | 'createdAt'>): Promise<Message> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date();

  const message: NewMessage = {
    id,
    ...data,
    status: data.status ?? 'pending',
    createdAt: now,
  };

  await db.insert(messages).values(message);
  return message as Message;
}

export async function getMessageById(id: string): Promise<Message | null> {
  const db = getDatabase();
  const result = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getMessageByMessageId(accountId: string, messageId: string): Promise<Message | null> {
  const db = getDatabase();
  const result = await db
    .select()
    .from(messages)
    .where(and(eq(messages.accountId, accountId), eq(messages.messageId, messageId)))
    .limit(1);
  return result[0] ?? null;
}

export async function listMessages(
  accountId: string,
  chatJid?: string,
  limit: number = 50,
  offset: number = 0,
  before?: Date,
  after?: Date
): Promise<Message[]> {
  const db = getDatabase();

  const conditions = [eq(messages.accountId, accountId)];

  if (chatJid) {
    conditions.push(eq(messages.chatJid, chatJid));
  }

  if (before) {
    conditions.push(lte(messages.timestamp, before));
  }

  if (after) {
    conditions.push(gte(messages.timestamp, after));
  }

  return db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.timestamp))
    .limit(limit)
    .offset(offset);
}

export async function countMessages(accountId: string, chatJid?: string): Promise<number> {
  const db = getDatabase();

  const conditions = [eq(messages.accountId, accountId)];

  if (chatJid) {
    conditions.push(eq(messages.chatJid, chatJid));
  }

  const result = await db.select({ count: count() }).from(messages).where(and(...conditions));
  return result[0]?.count ?? 0;
}

export async function updateMessageStatus(id: string, status: Message['status']): Promise<Message | null> {
  const db = getDatabase();
  const result = await db
    .update(messages)
    .set({ status })
    .where(eq(messages.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteMessage(id: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.delete(messages).where(eq(messages.id, id));
  // libsql ResultSet uses rowsAffected
  const changes = (result as { rowsAffected?: number }).rowsAffected ?? 0;
  return changes > 0;
}

export async function deleteOldMessages(accountId: string, olderThan: Date): Promise<number> {
  const db = getDatabase();
  const result = await db
    .delete(messages)
    .where(and(eq(messages.accountId, accountId), lte(messages.timestamp, olderThan)));
  // libsql ResultSet uses rowsAffected
  const changes = (result as { rowsAffected?: number }).rowsAffected ?? 0;
  return changes;
}