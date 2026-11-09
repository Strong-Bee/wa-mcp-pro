import { getDatabase } from '../client.js';
import { chats, Chat, NewChat } from '../schema/chats.js';
import { eq, desc, and, like, count } from 'drizzle-orm';

export async function createChat(data: Omit<NewChat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chat> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date();

  const chat: NewChat = {
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(chats).values(chat);
  return chat;
}

export async function upsertChat(data: Omit<NewChat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chat> {
  const db = getDatabase();

  const existing = await db
    .select()
    .from(chats)
    .where(and(eq(chats.accountId, data.accountId), eq(chats.chatJid, data.chatJid)))
    .limit(1);

  const now = new Date();

  if (existing[0]) {
    const result = await db
      .update(chats)
      .set({ ...data, updatedAt: now })
      .where(eq(chats.id, existing[0].id))
      .returning();
    return result[0];
  }

  return createChat(data);
}

export async function getChatById(id: string): Promise<Chat | null> {
  const db = getDatabase();
  const result = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getChatByJid(accountId: string, chatJid: string): Promise<Chat | null> {
  const db = getDatabase();
  const result = await db
    .select()
    .from(chats)
    .where(and(eq(chats.accountId, accountId), eq(chats.chatJid, chatJid)))
    .limit(1);
  return result[0] ?? null;
}

export async function listChats(
  accountId: string,
  limit: number = 50,
  offset: number = 0,
  isGroup?: boolean,
  search?: string
): Promise<Chat[]> {
  const db = getDatabase();

  const conditions = [eq(chats.accountId, accountId)];

  if (isGroup !== undefined) {
    conditions.push(eq(chats.isGroup, isGroup));
  }

  if (search) {
    conditions.push(like(chats.name, `%${search}%`));
  }

  return db
    .select()
    .from(chats)
    .where(and(...conditions))
    .orderBy(desc(chats.lastMessageAt))
    .limit(limit)
    .offset(offset);
}

export async function countChats(accountId: string): Promise<number> {
  const db = getDatabase();
  const result = await db.select({ count: count() }).from(chats).where(eq(chats.accountId, accountId));
  return result[0]?.count ?? 0;
}

export async function updateChat(id: string, data: Partial<Omit<Chat, 'id' | 'createdAt'>>): Promise<Chat | null> {
  const db = getDatabase();
  const now = new Date();
  const result = await db
    .update(chats)
    .set({ ...data, updatedAt: now })
    .where(eq(chats.id, id))
    .returning();
  return result[0] ?? null;
}

export async function incrementUnreadCount(accountId: string, chatJid: string): Promise<void> {
  const db = getDatabase();
  await db
    .update(chats)
    .set({ unreadCount: chats.unreadCount + 1, updatedAt: new Date() })
    .where(and(eq(chats.accountId, accountId), eq(chats.chatJid, chatJid)));
}

export async function resetUnreadCount(accountId: string, chatJid: string): Promise<void> {
  const db = getDatabase();
  await db
    .update(chats)
    .set({ unreadCount: 0, updatedAt: new Date() })
    .where(and(eq(chats.accountId, accountId), eq(chats.chatJid, chatJid)));
}

export async function deleteChat(id: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.delete(chats).where(eq(chats.id, id));
  return (result.changes ?? 0) > 0;
}