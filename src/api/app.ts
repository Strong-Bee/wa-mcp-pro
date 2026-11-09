import Fastify, { type FastifyInstance } from 'fastify';
import { getConfig } from '../config/env.js';
import { getLogger } from '../core/logger.js';
import { registerRoutes } from './routes/index.js';
import { authMiddleware } from './middleware/authentication.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { setupOpenAPI } from './openapi.js';
import { AppError, isAppError, toAppError, ERROR_CODES } from '../core/errors.js';

const logger = getLogger().child({ component: 'APIServer' });

export async function createAPIServer(): Promise<FastifyInstance> {
  const config = getConfig();

  const app = Fastify({
    logger: false,
    // Do not trust arbitrary forwarded headers; configure a trusted proxy explicitly
    // at the deployment boundary if proxy-aware client IP handling is required.
    trustProxy: false,
  });

  app.setErrorHandler(async (error, request, reply) => {
    const correlationId = (request.headers['x-request-id'] as string) || crypto.randomUUID();

    let appError = isAppError(error) ? error : toAppError(error);
    if (appError.correlationId !== correlationId) {
      appError = new AppError(
        appError.code,
        appError.message,
        appError.statusCode,
        appError.metadata,
        correlationId
      );
    }

    logger.error(
      {
        correlationId,
        code: appError.code,
        message: appError.message,
        statusCode: appError.statusCode,
        path: request.url,
        method: request.method,
      },
      'Request error'
    );

    const statusCode = appError.statusCode || 500;
    reply.status(statusCode).send({
      error: {
        code: appError.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: statusCode >= 500 ? 'Internal server error' : appError.message,
        correlationId,
      },
    });
  });

  app.setNotFoundHandler(async (request, reply) => {
    const correlationId = (request.headers['x-request-id'] as string) || crypto.randomUUID();

    logger.warn({ correlationId, path: request.url, method: request.method }, 'Route not found');

    reply.status(404).send({
      error: {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Route not found',
        correlationId,
      },
    });
  });

  await app.register(rateLimitMiddleware);
  await app.register(authMiddleware);
  await registerRoutes(app);

  if (config.NODE_ENV !== 'production') {
    await setupOpenAPI(app);
  }

  logger.info('REST API server created');
  return app;
}

export async function startAPIServer(app: FastifyInstance): Promise<void> {
  const config = getConfig();

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    logger.info({ host: config.HOST, port: config.PORT }, 'REST API server started');
  } catch (error) {
    logger.error({ error }, 'Failed to start REST API server');
    throw error;
  }
}