import { getConfig } from '../config/env.js';
import { getLogger } from '../core/logger.js';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

let masterKey: Buffer | null = null;

function getMasterKey(): Buffer {
  if (masterKey) return masterKey;

  const config = getConfig();
  const key = config.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  masterKey = Buffer.from(key, 'hex');
  return masterKey;
}

export async function deriveKey(salt: Buffer): Promise<Buffer> {
  const master = getMasterKey();
  return scryptAsync(master, salt, 32) as Promise<Buffer>;
}

export async function encrypt(data: string): Promise<string> {
  try {
    const salt = randomBytes(16);
    const key = await deriveKey(salt);
    const iv = randomBytes(12);

    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    const result = Buffer.concat([salt, iv, authTag, encrypted]);
    return result.toString('base64');
  } catch (error) {
    getLogger().error({ error }, 'Encryption failed');
    throw new Error('Encryption failed');
  }
}

export async function decrypt(encryptedData: string): Promise<string> {
  try {
    const buffer = Buffer.from(encryptedData, 'base64');

    const salt = buffer.subarray(0, 16);
    const iv = buffer.subarray(16, 28);
    const authTag = buffer.subarray(28, 44);
    const encrypted = buffer.subarray(44);

    const key = await deriveKey(salt);

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    getLogger().error({ error }, 'Decryption failed');
    throw new Error('Decryption failed');
  }
}

export function rotateKey(newKey: string): void {
  if (newKey.length !== 64) {
    throw new Error('New key must be 64 hex characters');
  }
  masterKey = Buffer.from(newKey, 'hex');
}