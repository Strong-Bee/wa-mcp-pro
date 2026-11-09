import { getLogger } from '../core/logger.js';

/**
 * Intentionally does not create a default API key.
 * API credentials must be generated explicitly with the CLI so secrets are
 * shown only to the operator and are never written to application logs.
 */
export async function seedDatabase(): Promise<void> {
  getLogger().info(
    'No default credentials are seeded. Generate an API key explicitly with the wa-mcp CLI.'
  );
}