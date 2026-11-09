import { seedDatabase } from '../database/seed.js';
import { runMigrations } from '../database/migrations.js';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'SeedScript' });

async function main(): Promise<void> {
  await runMigrations();
  await seedDatabase();
  logger.info('Database seeded successfully');
}

main().catch((error) => {
  logger.error({ error }, 'Seed script failed');
  process.exit(1);
});