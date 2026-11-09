import { sqliteTable, text, integer, index, foreignKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { accounts } from './accounts.js';

export const automations = sqliteTable('automations', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  triggerType: text('trigger_type', { enum: ['keyword', 'exact_match', 'regex', 'command'] }).notNull(),
  triggerValue: text('trigger_value').notNull(),
  response: text('response').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  cooldown: integer('cooldown').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  accountIdx: index('automations_account_id_idx').on(table.accountId),
  enabledIdx: index('automations_enabled_idx').on(table.enabled),
}));

export type Automation = typeof automations.$inferSelect;
export type NewAutomation = typeof automations.$inferInsert;