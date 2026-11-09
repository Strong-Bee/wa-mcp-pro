import { getDatabase } from './client.js';
import { accounts, sessions, apiKeys } from './schema/index.js';
import { hashApiKey } from '../security/api-key.js';
import { getLogger } from '../core/logger.js';

export async function seedDatabase(): Promise<void> {
  const db = getDatabase();
  const logger = getLogger().child({ component: 'Seed' });

  logger.info('Seeding database');

  const existingAccounts = await db.select().from(accounts).limit(1);
  if (existingAccounts.length > 0) {
    logger.info('Database already seeded, skipping');
    return;
  }

  const masterKey = process.env.ENCRYPTION_KEY || 'development-master-key-change-in-production';
  if (masterKey.length < 32) {
    logger.warn('ENCRYPTION_KEY is too short, using default for development');
  }

  const apiKeyName = 'Default API Key';
  const plainApiKey = `wamp_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = await hashApiKey(plainApiKey);

  await db.insert(apiKeys).values({
    id: crypto.randomUUID(),
    name: apiKeyName,
    keyHash,
    permissions: JSON.stringify(['*']),
    createdAt: new Date(),
  });

  logger.info({ apiKey: plainApiKey }, 'Database seeded with default API key');
  logger.warn('Save this API key - it will not be shown again!');
}