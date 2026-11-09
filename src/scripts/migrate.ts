import { runMigrations, checkMigrations } from '../database/migrations.js';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'MigrateScript' });

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';

  switch (command) {
    case 'run':
      await runMigrations();
      logger.info('Migrations completed');
      break;
    case 'status':
      const status = await checkMigrations();
      console.log(`Applied: ${status.applied}, Pending: ${status.pending}`);
      break;
    default:
      logger.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((error) => {
  logger.error({ error }, 'Migration script failed');
  process.exit(1);
});