import { sqliteTable, text, integer, index, uniqueIndex, foreignKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { accounts } from './accounts.js';

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  jid: text('jid').notNull(),
  name: text('name'),
  phoneNumber: text('phone_number'),
  profilePictureUrl: text('profile_picture_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  accountIdx: index('contacts_account_id_idx').on(table.accountId),
  jidIdx: uniqueIndex('contacts_account_jid_unique').on(table.accountId, table.jid),
  phoneIdx: index('contacts_phone_number_idx').on(table.phoneNumber),
}));

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;