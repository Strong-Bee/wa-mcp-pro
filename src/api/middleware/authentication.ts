import { FastifyInstance, FastifyRequest } from 'fastify';
import { getConfig } from '../../config/env.js';
import { validateApiKey } from '../../security/index.js';
import { AppError, ERROR_CODES } from '../../core/errors.js';

export async function authMiddleware(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request: FastifyRequest) => {
    const config = getConfig();

    if (!config.API_KEY && config.NODE_ENV === 'development') {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(ERROR_CODES.MCP_AUTH_FAILED, 'Missing or invalid Authorization header', 401);
    }

    const apiKey = authHeader.substring(7);
    const validatedKey = await validateApiKey(apiKey);

    if (!validatedKey) {
      throw new AppError(ERROR_CODES.MCP_AUTH_FAILED, 'Invalid API key', 401);
    }

    request.apiKey = validatedKey;
  });
}