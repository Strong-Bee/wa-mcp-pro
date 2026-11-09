import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/env.js';
import { getLogger } from '../core/logger.js';
import { runMigrations } from '../database/migrations.js';
import { seedDatabase } from '../database/seed.js';

const logger = getLogger().child({ component: 'SetupScript' });

async function main(): Promise<void> {
  const config = getConfig();

  logger.info('Setting up WA-MCP Pro');

  const dirs = [
    config.SESSION_DIRECTORY,
    config.MEDIA_DIRECTORY,
    config.LOG_DIRECTORY,
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info({ dir }, 'Created directory');
    }
  }

  await runMigrations();
  await seedDatabase();

  logger.info('Setup completed successfully');
  logger.info('Next steps:');
  logger.info('  1. Configure your .env file with ENCRYPTION_KEY and API_KEY');
  logger.info('  2. Run "wa-mcp account:add --id <uuid> --name <name>" to add an account');
  logger.info('  3. Run "wa-mcp account:connect --id <uuid>" to connect');
  logger.info('  4. Run "wa-mcp account:qr --id <uuid>" to get QR code');
}

main().catch((error) => {
  logger.error({ error }, 'Setup failed');
  process.exit(1);
});