import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phoneNumber: text('phone_number').notNull(),
  status: text('status', { enum: ['disconnected', 'connecting', 'qr_pending', 'authenticated', 'connected', 'reconnecting', 'logged_out', 'error'] }).notNull().default('disconnected'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  phoneNumberIdx: uniqueIndex('accounts_phone_number_unique').on(table.phoneNumber),
  statusIdx: index('accounts_status_idx').on(table.status),
}));

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;