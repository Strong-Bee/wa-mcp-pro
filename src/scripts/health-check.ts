import { checkHealth } from '../monitoring/health.js';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'HealthCheckScript' });

async function main(): Promise<void> {
  const result = await checkHealth();

  console.log(JSON.stringify(result, null, 2));

  if (result.status === 'unhealthy') {
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error({ error }, 'Health check failed');
  process.exit(1);
});