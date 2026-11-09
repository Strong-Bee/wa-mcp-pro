import { randomUUID } from 'crypto';
import { getDatabase } from '../database/client.js';
import { apiKeys } from '../database/schema/api_keys.js';
import { hashApiKey, generateApiKey as generateKey, PERMISSIONS } from '../security/api-key.js';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'GenerateApiKeyScript' });

export async function generateApiKey(
  name: string,
  permissions: string[] = [],
  expiresAt?: Date
): Promise<{ apiKey: any; plainKey: string }> {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date();

  const plainKey = generateKey();
  const keyHash = await hashApiKey(plainKey);

  const validatedPermissions = permissions.filter(p => PERMISSIONS.includes(p as any));

  const apiKey = {
    id,
    name,
    keyHash,
    permissions: JSON.stringify(validatedPermissions),
    expiresAt: expiresAt ?? null,
    createdAt: now,
  };

  await db.insert(apiKeys).values(apiKey);

  logger.info({ name, permissions: validatedPermissions }, 'API key generated');
  return { apiKey, plainKey };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const name = args[0];
  const permissions = args[1]?.split(',') || [];
  const expiresDays = args[2] ? parseInt(args[2]) : undefined;

  if (!name) {
    console.error('Usage: generate-api-key <name> [permissions] [expiresDays]');
    process.exit(1);
  }

  const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 86400000) : undefined;
  const { plainKey } = await generateApiKey(name, permissions, expiresAt);

  console.log(`API Key: ${plainKey}`);
  console.log('Save this key - it will not be shown again!');
}

main().catch((error) => {
  logger.error({ error }, 'Generate API key failed');
  process.exit(1);
});