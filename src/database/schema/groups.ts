import { sqliteTable, text, integer, index, uniqueIndex, foreignKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { accounts } from './accounts.js';

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  groupJid: text('group_jid').notNull(),
  subject: text('subject').notNull(),
  description: text('description'),
  ownerJid: text('owner_jid').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  accountIdx: index('groups_account_id_idx').on(table.accountId),
  groupJidIdx: uniqueIndex('groups_account_group_jid_unique').on(table.accountId, table.groupJid),
}));

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;