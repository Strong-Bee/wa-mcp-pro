import { getDatabase } from '../client.js';
import { accounts, Account, NewAccount } from '../schema/accounts.js';
import { eq, desc, and } from 'drizzle-orm';

function generateId(): string {
  return crypto.randomUUID();
}

export async function createAccount(data: Omit<NewAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
  const db = getDatabase();
  const id = generateId();
  const now = new Date();

  const account: NewAccount = {
    id,
    name: data.name,
    phoneNumber: data.phoneNumber,
    status: data.status ?? 'disconnected',
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(accounts).values(account);
  return account as Account;
}

export async function getAccountById(id: string): Promise<Account | null> {
  const db = getDatabase();
  const result = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getAccountByPhoneNumber(phoneNumber: string): Promise<Account | null> {
  const db = getDatabase();
  const result = await db.select().from(accounts).where(eq(accounts.phoneNumber, phoneNumber)).limit(1);
  return result[0] ?? null;
}

export async function listAccounts(): Promise<Account[]> {
  const db = getDatabase();
  return db.select().from(accounts).orderBy(desc(accounts.createdAt));
}

export async function updateAccountStatus(id: string, status: Account['status']): Promise<Account | null> {
  const db = getDatabase();
  const now = new Date();
  const result = await db
    .update(accounts)
    .set({ status, updatedAt: now })
    .where(eq(accounts.id, id))
    .returning();
  return result[0] ?? null;
}

export async function updateAccount(id: string, data: Partial<Omit<Account, 'id' | 'createdAt'>>): Promise<Account | null> {
  const db = getDatabase();
  const now = new Date();
  const result = await db
    .update(accounts)
    .set({ ...data, updatedAt: now })
    .where(eq(accounts.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteAccount(id: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.delete(accounts).where(eq(accounts.id, id));
  // libsql ResultSet uses rowsAffected
  const changes = (result as { rowsAffected?: number }).rowsAffected ?? 0;
  return changes > 0;
}