import { getConfig } from './config/env.js';
import { getLogger } from './core/logger.js';
import { start } from './core/lifecycle.js';
import { runMigrations } from './database/migrations.js';
import { seedDatabase } from './database/seed.js';
import { loadAutomations } from './automation/engine.js';
import { loadScheduledAutomations } from './automation/scheduler.js';
import { createStreamableHTTPTransport } from './mcp/transports/streamable-http.js';
import { createAPIServer, startAPIServer } from './api/app.js';

const logger = getLogger().child({ component: 'App' });

export async function createApp(): Promise<{ app: Awaited<ReturnType<typeof createAPIServer>>; transport: Awaited<ReturnType<typeof createStreamableHTTPTransport>> }> {
  const config = getConfig();

  await runMigrations();
  await seedDatabase();

  await start();

  const accounts = await import('./whatsapp/connection-manager.js').then(m => m.listAccounts());
  for (const account of accounts) {
    await loadAutomations(account.id);
  }
  await loadScheduledAutomations();

  const transport = await createStreamableHTTPTransport();
  const app = await createAPIServer();

  app.route({
    method: 'ALL',
    url: '/mcp/*',
    handler: async (request, reply) => {
      await transport.handleRequest(request.raw, reply.raw);
    },
  });

  logger.info('App created successfully');
  return { app, transport };
}

export async function startApp(): Promise<void> {
  const config = getConfig();
  const { app } = await createApp();
  await startAPIServer(app);
}