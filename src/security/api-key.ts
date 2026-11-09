import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../database/client.js';
import { apiKeys, type ApiKey } from '../database/schema/api_keys.js';

const scryptAsync = promisify(scrypt);

export async function hashApiKey(key: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(key, salt, 32)) as Buffer;
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function verifyApiKey(key: string, storedHash: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = storedHash.split(':');
    if (!saltHex || !hashHex || !/^[a-f0-9]{32}$/i.test(saltHex) || !/^[a-f0-9]{64}$/i.test(hashHex)) {
      return false;
    }

    const salt = Buffer.from(saltHex, 'hex');
    const hash = (await scryptAsync(key, salt, 32)) as Buffer;
    const stored = Buffer.from(hashHex, 'hex');

    if (hash.length !== stored.length) return false;
    return timingSafeEqual(hash, stored);
  } catch {
    return false;
  }
}

export async function validateApiKey(key: string): Promise<ApiKey | null> {
  if (!/^wamp_[a-f0-9]{64}$/i.test(key)) return null;

  const db = getDatabase();
  const records = await db.select().from(apiKeys);

  for (const record of records) {
    if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) continue;

    if (await verifyApiKey(key, record.keyHash)) {
      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, record.id));

      return record;
    }
  }

  return null;
}

export function generateApiKey(): string {
  return `wamp_${randomBytes(32).toString('hex')}`;
}

export function hashKeyForLookup(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export const PERMISSIONS = [
  'accounts:read',
  'accounts:manage',
  'messages:read',
  'messages:send',
  'contacts:read',
  'groups:read',
  'automation:read',
  'automation:manage',
  'system:read',
] as const;

export type Permission = typeof PERMISSIONS[number];
export type RolePermission = Permission | '*';

export const ROLE_PERMISSIONS: Record<string, RolePermission[]> = {
  owner: ['*'],
  admin: ['accounts:read', 'accounts:manage', 'messages:read', 'messages:send', 'contacts:read', 'groups:read', 'automation:read', 'automation:manage', 'system:read'],
  operator: ['accounts:read', 'messages:read', 'messages:send', 'contacts:read', 'groups:read', 'automation:read'],
  readonly: ['accounts:read', 'messages:read', 'contacts:read', 'groups:read'],
};

export function getPermissionsForRole(role: string): RolePermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(permissions: RolePermission[], required: Permission): boolean {
  return permissions.includes('*') || permissions.includes(required);
}