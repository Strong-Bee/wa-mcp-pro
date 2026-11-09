import { sqliteTable, text, integer, index, foreignKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { accounts } from './accounts.js';

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  chatJid: text('chat_jid').notNull(),
  messageId: text('message_id').notNull(),
  senderJid: text('sender_jid').notNull(),
  messageType: text('message_type', { enum: ['text', 'image', 'video', 'document', 'audio', 'location', 'contact', 'reaction', 'sticker', 'poll'] }).notNull(),
  messageContent: text('message_content').notNull(),
  direction: text('direction', { enum: ['inbound', 'outbound'] }).notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  status: text('status', { enum: ['pending', 'sent', 'delivered', 'read', 'failed'] }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  accountIdx: index('messages_account_id_idx').on(table.accountId),
  chatIdx: index('messages_chat_jid_idx').on(table.chatJid),
  messageIdIdx: index('messages_message_id_idx').on(table.messageId),
  timestampIdx: index('messages_timestamp_idx').on(table.timestamp),
  accountChatIdx: index('messages_account_chat_idx').on(table.accountId, table.chatJid),
}));

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;