import { getDatabase } from '../client.js';
import { sessions, Session, NewSession } from '../schema/sessions.js';
import { eq, desc } from 'drizzle-orm';

export async function createSession(data: Omit<NewSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date();

  const session: NewSession = {
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(sessions).values(session);
  return session;
}

export async function getSessionById(id: string): Promise<Session | null> {
  const db = getDatabase();
  const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getSessionByAccountId(accountId: string): Promise<Session | null> {
  const db = getDatabase();
  const result = await db.select().from(sessions).where(eq(sessions.accountId, accountId)).limit(1);
  return result[0] ?? null;
}

export async function updateSessionCredentials(id: string, encryptedCredentials: string): Promise<Session | null> {
  const db = getDatabase();
  const now = new Date();
  const result = await db
    .update(sessions)
    .set({ encryptedCredentials, updatedAt: now })
    .where(eq(sessions.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteSession(id: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.delete(sessions).where(eq(sessions.id, id));
  return (result.changes ?? 0) > 0;
}

export async function deleteSessionByAccountId(accountId: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.delete(sessions).where(eq(sessions.accountId, accountId));
  return (result.changes ?? 0) > 0;
}