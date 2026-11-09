import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.routes.js';
import { connectionRoutes } from './connection.routes.js';
import { messagingRoutes } from './messaging.routes.js';
import { contactRoutes } from './contacts.routes.js';
import { groupRoutes } from './groups.routes.js';
import { chatRoutes } from './chats.routes.js';
import { automationRoutes } from './automation.routes.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes, { prefix: '/' });
  await app.register(connectionRoutes, { prefix: '/api/v1' });
  await app.register(messagingRoutes, { prefix: '/api/v1' });
  await app.register(contactRoutes, { prefix: '/api/v1' });
  await app.register(groupRoutes, { prefix: '/api/v1' });
  await app.register(chatRoutes, { prefix: '/api/v1' });
  await app.register(automationRoutes, { prefix: '/api/v1' });
}