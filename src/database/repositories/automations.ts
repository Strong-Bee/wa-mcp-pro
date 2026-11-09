import { getDatabase } from '../client.js';
import { automations, Automation, NewAutomation } from '../schema/automations.js';
import { eq, desc, and, count } from 'drizzle-orm';

export async function createAutomation(data: Omit<NewAutomation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Automation> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date();

  const automation: NewAutomation = {
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(automations).values(automation);
  return automation;
}

export async function getAutomationById(id: string): Promise<Automation | null> {
  const db = getDatabase();
  const result = await db.select().from(automations).where(eq(automations.id, id)).limit(1);
  return result[0] ?? null;
}

export async function listAutomations(
  accountId: string,
  limit: number = 50,
  offset: number = 0,
  enabled?: boolean
): Promise<Automation[]> {
  const db = getDatabase();

  const conditions = [eq(automations.accountId, accountId)];

  if (enabled !== undefined) {
    conditions.push(eq(automations.enabled, enabled));
  }

  return db
    .select()
    .from(automations)
    .where(and(...conditions))
    .orderBy(desc(automations.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countAutomations(accountId: string): Promise<number> {
  const db = getDatabase();
  const result = await db.select({ count: count() }).from(automations).where(eq(automations.accountId, accountId));
  return result[0]?.count ?? 0;
}

export async function updateAutomation(id: string, data: Partial<Omit<Automation, 'id' | 'createdAt'>>): Promise<Automation | null> {
  const db = getDatabase();
  const now = new Date();
  const result = await db
    .update(automations)
    .set({ ...data, updatedAt: now })
    .where(eq(automations.id, id))
    .returning();
  return result[0] ?? null;
}

export async function toggleAutomation(id: string): Promise<Automation | null> {
  const db = getDatabase();
  const automation = await getAutomationById(id);
  if (!automation) return null;

  return updateAutomation(id, { enabled: !automation.enabled });
}

export async function deleteAutomation(id: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.delete(automations).where(eq(automations.id, id));
  return (result.changes ?? 0) > 0;
}

export async function getEnabledAutomations(accountId: string): Promise<Automation[]> {
  const db = getDatabase();
  return db
    .select()
    .from(automations)
    .where(and(eq(automations.accountId, accountId), eq(automations.enabled, true)));
}