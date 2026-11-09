import { getDatabase } from '../client.js';
import { groups, Group, NewGroup } from '../schema/groups.js';
import { eq, desc, and, count } from 'drizzle-orm';

export async function createGroup(data: Omit<NewGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<Group> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date();

  const group: NewGroup = {
    id,
    accountId: data.accountId,
    groupJid: data.groupJid,
    subject: data.subject,
    description: data.description ?? null,
    ownerJid: data.ownerJid,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(groups).values(group);
  return group as Group;
}

export async function upsertGroup(data: Omit<NewGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<Group> {
  const db = getDatabase();

  const existing = await db
    .select()
    .from(groups)
    .where(and(eq(groups.accountId, data.accountId), eq(groups.groupJid, data.groupJid)))
    .limit(1);

  const now = new Date();

  if (existing[0]) {
    const result = await db
      .update(groups)
      .set({ ...data, updatedAt: now })
      .where(eq(groups.id, existing[0].id))
      .returning();
    return result[0] as Group;
  }

  return createGroup(data);
}

export async function getGroupById(id: string): Promise<Group | null> {
  const db = getDatabase();
  const result = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getGroupByJid(accountId: string, groupJid: string): Promise<Group | null> {
  const db = getDatabase();
  const result = await db
    .select()
    .from(groups)
    .where(and(eq(groups.accountId, accountId), eq(groups.groupJid, groupJid)))
    .limit(1);
  return result[0] ?? null;
}

export async function listGroups(
  accountId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Group[]> {
  const db = getDatabase();

  return db
    .select()
    .from(groups)
    .where(eq(groups.accountId, accountId))
    .orderBy(desc(groups.updatedAt))
    .limit(limit)
    .offset(offset);
}

export async function countGroups(accountId: string): Promise<number> {
  const db = getDatabase();
  const result = await db.select({ count: count() }).from(groups).where(eq(groups.accountId, accountId));
  return result[0]?.count ?? 0;
}

export async function updateGroup(id: string, data: Partial<Omit<Group, 'id' | 'createdAt'>>): Promise<Group | null> {
  const db = getDatabase();
  const now = new Date();
  const result = await db
    .update(groups)
    .set({ ...data, updatedAt: now })
    .where(eq(groups.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteGroup(id: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.delete(groups).where(eq(groups.id, id));
  // libsql ResultSet uses rowsAffected
  const changes = (result as { rowsAffected?: number }).rowsAffected ?? 0;
  return changes > 0;
}