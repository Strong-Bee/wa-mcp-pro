import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { scrypt, promisify } from 'crypto';

const scryptAsync = promisify(scrypt);

export async function hashApiKey(key: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(key, salt, 32)) as Buffer;
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function verifyApiKey(key: string, storedHash: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = storedHash.split(':');
    if (!saltHex || !hashHex) return false;

    const salt = Buffer.from(saltHex, 'hex');
    const hash = (await scryptAsync(key, salt, 32)) as Buffer;
    const stored = Buffer.from(hashHex, 'hex');

    if (hash.length !== stored.length) return false;
    return timingSafeEqual(hash, stored);
  } catch {
    return false;
  }
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

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  owner: ['*'],
  admin: ['accounts:read', 'accounts:manage', 'messages:read', 'messages:send', 'contacts:read', 'groups:read', 'automation:read', 'automation:manage', 'system:read'],
  operator: ['accounts:read', 'messages:read', 'messages:send', 'contacts:read', 'groups:read', 'automation:read'],
  readonly: ['accounts:read', 'messages:read', 'contacts:read', 'groups:read'],
};

export function getPermissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(permissions: Permission[], required: Permission): boolean {
  return permissions.includes('*') || permissions.includes(required);
}