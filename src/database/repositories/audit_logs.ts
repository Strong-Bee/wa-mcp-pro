import { getDatabase } from '../client.js';
import { auditLogs, AuditLog, NewAuditLog } from '../schema/audit_logs.js';
import { eq, desc, and, gte, lte, count } from 'drizzle-orm';

export async function createAuditLog(data: Omit<NewAuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date();

  const auditLog: NewAuditLog = {
    id,
    ...data,
    createdAt: now.getTime(), // Use timestamp number for drizzle with mode: 'timestamp'
  };

  await db.insert(auditLogs).values(auditLog);
  return { ...auditLog, createdAt: now } as AuditLog;
}

export async function listAuditLogs(
  limit: number = 50,
  offset: number = 0,
  accountId?: string,
  actor?: string,
  action?: string,
  result?: 'success' | 'failure',
  from?: Date,
  to?: Date
): Promise<AuditLog[]> {
  const db = getDatabase();

  const conditions = [];

  if (accountId) {
    conditions.push(eq(auditLogs.accountId, accountId));
  }

  if (actor) {
    conditions.push(eq(auditLogs.actor, actor));
  }

  if (action) {
    conditions.push(eq(auditLogs.action, action));
  }

  if (result) {
    conditions.push(eq(auditLogs.result, result));
  }

  if (from) {
    conditions.push(gte(auditLogs.createdAt, from.getTime()));
  }

  if (to) {
    conditions.push(lte(auditLogs.createdAt, to.getTime()));
  }

  return db
    .select()
    .from(auditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countAuditLogs(accountId?: string): Promise<number> {
  const db = getDatabase();

  if (accountId) {
    const result = await db.select({ count: count() }).from(auditLogs).where(eq(auditLogs.accountId, accountId));
    return result[0]?.count ?? 0;
  }

  const result = await db.select({ count: count() }).from(auditLogs);
  return result[0]?.count ?? 0;
}

export async function deleteOldAuditLogs(olderThan: Date): Promise<number> {
  const db = getDatabase();
  const result = await db.delete(auditLogs).where(lte(auditLogs.createdAt, olderThan.getTime()));
  // libsql ResultSet uses rowsAffected
  const changes = (result as { rowsAffected?: number }).rowsAffected ?? 0;
  return changes;
}