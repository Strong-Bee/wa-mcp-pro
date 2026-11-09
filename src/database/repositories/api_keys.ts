import { getDatabase } from '../client.js';
import { apiKeys, ApiKey, NewApiKey } from '../schema/api_keys.js';
import { eq, desc, and, count } from 'drizzle-orm';
import { hashApiKey, verifyApiKey } from '../../security/api-key.js';
import { randomBytes } from 'crypto';

export async function createApiKey(name: string, permissions: string[], expiresAt?: Date): Promise<{ apiKey: ApiKey; plainKey: string }> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date();

  const plainKey = `wamp_${randomBytes(32).toString('hex')}`;
  const keyHash = await hashApiKey(plainKey);

  const apiKey: NewApiKey = {
    id,
    name,
    keyHash,
    permissions: JSON.stringify(permissions),
    expiresAt: expiresAt ?? null,
    createdAt: now,
  };

  await db.insert(apiKeys).values(apiKey);
  return { apiKey: apiKey as ApiKey, plainKey };
}

export async function getApiKeyById(id: string): Promise<ApiKey | null> {
  const db = getDatabase();
  const result = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
  const db = getDatabase();
  const result = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);
  return result[0] ?? null;
}

export async function validateApiKey(plainKey: string): Promise<ApiKey | null> {
  const db = getDatabase();
  const allKeys = await db.select().from(apiKeys);

  for (const key of allKeys) {
    if (await verifyApiKey(plainKey, key.keyHash)) {
      if (key.expiresAt && key.expiresAt < new Date()) {
        return null;
      }
      return key;
    }
  }

  return null;
}

export async function listApiKeys(limit: number = 50, offset: number = 0): Promise<ApiKey[]> {
  const db = getDatabase();
  return db
    .select()
    .from(apiKeys)
    .orderBy(desc(apiKeys.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countApiKeys(): Promise<number> {
  const db = getDatabase();
  const result = await db.select({ count: count() }).from(apiKeys);
  return result[0]?.count ?? 0;
}

export async function updateApiKeyLastUsed(id: string): Promise<void> {
  const db = getDatabase();
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, id));
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
  // libsql ResultSet uses rowsAffected
  const changes = (result as { rowsAffected?: number }).rowsAffected ?? 0;
  return changes > 0;
}

export async function hasPermission(apiKey: ApiKey, permission: string): Promise<boolean> {
  const permissions = JSON.parse(apiKey.permissions) as string[];
  return permissions.includes(permission) || permissions.includes('*');
}