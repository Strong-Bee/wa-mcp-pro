import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { getLogger } from '../../core/logger.js';
import { AppError, ERROR_CODES, isAppError, toAppError } from '../../core/errors.js';

const logger = getLogger().child({ component: 'ErrorHandler' });

export async function errorHandler(app: FastifyInstance): Promise<void> {
  app.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (request.headers['x-request-id'] as string) || crypto.randomUUID();

    let appError = isAppError(error) ? error : toAppError(error);
    // Create new AppError with the correct correlationId since it's readonly
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
    const response = {
      error: {
        code: appError.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: statusCode >= 500 ? 'Internal server error' : appError.message,
        correlationId,
      },
    };

    reply.status(statusCode).send(response);
  });

  app.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
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
}