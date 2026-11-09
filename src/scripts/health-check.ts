import { checkHealth } from '../monitoring/health.js';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'HealthCheckScript' });

async function main(): Promise<void> {
  const result = await checkHealth();
  console.log(JSON.stringify(result, null, 2));

  // A WhatsApp account may be temporarily disconnected without the process
  // itself being unhealthy. Database failure, however, must fail container health.
  if (result.checks['database']?.status === 'failed' || result.status === 'unhealthy') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  logger.error({ error }, 'Health check failed');
  process.exitCode = 1;
});