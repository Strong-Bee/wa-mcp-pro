import { sqliteTable, text, integer, index, uniqueIndex, foreignKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { accounts } from './accounts.js';

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  chatJid: text('chat_jid').notNull(),
  name: text('name'),
  isGroup: integer('is_group', { mode: 'boolean' }).notNull().default(false),
  unreadCount: integer('unread_count').notNull().default(0),
  lastMessageAt: integer('last_message_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  accountIdx: index('chats_account_id_idx').on(table.accountId),
  chatJidIdx: uniqueIndex('chats_account_chat_jid_unique').on(table.accountId, table.chatJid),
  lastMessageIdx: index('chats_last_message_at_idx').on(table.lastMessageAt),
}));

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;