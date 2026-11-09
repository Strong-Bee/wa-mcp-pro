import { getDatabase } from '../database/client.js';
import { apiKeys } from '../database/schema/api_keys.js';
import { hashApiKey, generateApiKey as createApiKey, PERMISSIONS } from '../security/api-key.js';

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

