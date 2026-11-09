import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { getDatabase } from '../database/client.js';
import { apiKeys } from '../database/schema/api_keys.js';
import { hashApiKey, generateApiKey as createApiKey, PERMISSIONS } from '../security/api-key.js';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'GenerateApiKeyScript' });

export async function generateApiKey(
  name: string,
  permissions: string[] = [],
  expiresAt?: Date
): Promise<{ apiKey: any; plainKey: string }> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date();

  const plainKey = createApiKey();
  const keyHash = await hashApiKey(plainKey);
  const validatedPermissions = permissions.filter((permission) =>
    PERMISSIONS.includes(permission as (typeof PERMISSIONS)[number])
  );

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
  const expiresDays = args[2] ? Number.parseInt(args[2], 10) : undefined;

  if (!name) {
    console.error('Usage: generate-api-key <name> [permissions] [expiresDays]');
    process.exitCode = 1;
    return;
  }

  if (expiresDays !== undefined && (!Number.isInteger(expiresDays) || expiresDays <= 0)) {
    console.error('Expiration must be a positive number of days.');
    process.exitCode = 1;
    return;
  }

  const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 86400000) : undefined;
  const { plainKey } = await generateApiKey(name, permissions, expiresAt);

  // The plaintext key is returned to the operator once and is never logged.
  console.log(`API Key: ${plainKey}`);
  console.log('Save this key securely; it cannot be retrieved again.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    logger.error({ error }, 'Generate API key failed');
    process.exitCode = 1;
  });
}