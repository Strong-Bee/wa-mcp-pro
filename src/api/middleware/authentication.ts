import type { FastifyInstance, FastifyRequest } from 'fastify';
import { validateApiKey } from '../../security/index.js';
import { AppError, ERROR_CODES } from '../../core/errors.js';

export async function authMiddleware(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request: FastifyRequest) => {
    const authHeader = request.headers.authorization;
    const match = typeof authHeader === 'string'
      ? /^Bearer\s+(.+)$/i.exec(authHeader.trim())
      : null;

    if (!match?.[1]) {
      throw new AppError(ERROR_CODES.MCP_AUTH_FAILED, 'Missing or invalid Authorization header', 401);
    }

    const validatedKey = await validateApiKey(match[1].trim());

    if (!validatedKey) {
      throw new AppError(ERROR_CODES.MCP_AUTH_FAILED, 'Invalid or expired API key', 401);
    }

    request.apiKey = validatedKey;
  });
}