import { sqliteTable, text, integer, index, foreignKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { accounts } from './accounts.js';

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  result: text('result', { enum: ['success', 'failure'] }).notNull(),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  accountIdx: index('audit_logs_account_id_idx').on(table.accountId),
  actorIdx: index('audit_logs_actor_idx').on(table.actor),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;