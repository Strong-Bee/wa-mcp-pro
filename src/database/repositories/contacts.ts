import { getDatabase } from '../client.js';
import { contacts, Contact, NewContact } from '../schema/contacts.js';
import { eq, desc, and, like, count } from 'drizzle-orm';

export async function createContact(data: Omit<NewContact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date();

  const contact: NewContact = {
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(contacts).values(contact);
  return contact;
}

export async function upsertContact(data: Omit<NewContact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
  const db = getDatabase();

  const existing = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.accountId, data.accountId), eq(contacts.jid, data.jid)))
    .limit(1);

  const now = new Date();

  if (existing[0]) {
    const result = await db
      .update(contacts)
      .set({ ...data, updatedAt: now })
      .where(eq(contacts.id, existing[0].id))
      .returning();
    return result[0];
  }

  return createContact(data);
}

export async function getContactById(id: string): Promise<Contact | null> {
  const db = getDatabase();
  const result = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getContactByJid(accountId: string, jid: string): Promise<Contact | null> {
  const db = getDatabase();
  const result = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.accountId, accountId), eq(contacts.jid, jid)))
    .limit(1);
  return result[0] ?? null;
}

export async function listContacts(
  accountId: string,
  limit: number = 50,
  offset: number = 0,
  search?: string
): Promise<Contact[]> {
  const db = getDatabase();

  const conditions = [eq(contacts.accountId, accountId)];

  if (search) {
    conditions.push(like(contacts.name, `%${search}%`));
  }

  return db
    .select()
    .from(contacts)
    .where(and(...conditions))
    .orderBy(desc(contacts.updatedAt))
    .limit(limit)
    .offset(offset);
}

export async function countContacts(accountId: string): Promise<number> {
  const db = getDatabase();
  const result = await db.select({ count: count() }).from(contacts).where(eq(contacts.accountId, accountId));
  return result[0]?.count ?? 0;
}

export async function updateContact(id: string, data: Partial<Omit<Contact, 'id' | 'createdAt'>>): Promise<Contact | null> {
  const db = getDatabase();
  const now = new Date();
  const result = await db
    .update(contacts)
    .set({ ...data, updatedAt: now })
    .where(eq(contacts.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteContact(id: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.delete(contacts).where(eq(contacts.id, id));
  return (result.changes ?? 0) > 0;
}