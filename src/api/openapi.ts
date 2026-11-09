import { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import { getConfig } from '../config/env.js';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'OpenAPI' });

export async function setupOpenAPI(app: FastifyInstance): Promise<void> {
  const config = getConfig();

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'WA-MCP Pro API',
        description: 'WhatsApp MCP Server REST API',
        version: config.APP_VERSION,
      },
      servers: [
        {
          url: `http://${config.HOST}:${config.PORT}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'API Key',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
  });

  await app.register(fastifySwaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  logger.info('OpenAPI documentation available at /docs');
}