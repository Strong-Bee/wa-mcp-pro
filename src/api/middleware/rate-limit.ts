import { FastifyInstance } from 'fastify';
import { getConfig } from '../../config/env.js';
import { getLogger } from '../../core/logger.js';
import fastifyRateLimit from '@fastify/rate-limit';

const logger = getLogger().child({ component: 'RateLimitMiddleware' });

export async function rateLimitMiddleware(app: FastifyInstance): Promise<void> {
  const config = getConfig();

  await app.register(fastifyRateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
    keyGenerator: (request) => request.ip,
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    allowList: config.NODE_ENV === 'development' ? ['127.0.0.1', '::1'] : [],
  });

  logger.info({ max: config.RATE_LIMIT_MAX, window: config.RATE_LIMIT_WINDOW }, 'Rate limiting configured');
}