import { FastifyInstance } from 'fastify';
import { getLogger } from '../../core/logger.js';

const logger = getLogger().child({ component: 'HealthRoutes' });

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, _reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env['APP_VERSION'] || '1.0.0',
    };
  });

  app.get('/health/ready', async (_request, _reply) => {
    const { isDatabaseConnected } = await import('../../database/client.js');

    const dbConnected = isDatabaseConnected();

    return {
      status: dbConnected ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbConnected ? 'ok' : 'failed',
      },
    };
  });

  app.get('/health/live', async (_request, _reply) => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  });

  logger.info('Health routes registered');
}