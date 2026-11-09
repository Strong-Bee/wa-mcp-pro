import { getConfig } from './config/env.js';
import { getLogger } from './core/logger.js';
import { start } from './core/lifecycle.js';
import { runMigrations } from './database/migrations.js';
import { seedDatabase } from './database/seed.js';
import { loadAutomations } from './automation/engine.js';
import { loadScheduledAutomations } from './automation/scheduler.js';
import { startSTDIOTransport } from './mcp/transports/stdio.js';
import { createStreamableHTTPTransport } from './mcp/transports/streamable-http.js';
import { createAPIServer, startAPIServer } from './api/app.js';

const logger = getLogger().child({ component: 'Main' });

async function main(): Promise<void> {
  try {
    const config = getConfig();
    logger.info({ version: config.APP_VERSION, transport: config.MCP_TRANSPORT }, 'Starting WA-MCP Pro');

    await runMigrations();
    await seedDatabase();

    await start();

    const accounts = await import('./whatsapp/connection-manager.js').then(m => m.listAccounts());
    for (const account of accounts) {
      await loadAutomations(account.id);
    }
    await loadScheduledAutomations();

    if (config.MCP_TRANSPORT === 'stdio' || config.MCP_TRANSPORT === 'hybrid') {
      await startSTDIOTransport();
    }

    if (config.MCP_TRANSPORT === 'http' || config.MCP_TRANSPORT === 'hybrid') {
      const transport = await createStreamableHTTPTransport();
      const app = await createAPIServer();
      app.route({
        method: 'ALL',
        url: '/mcp/*',
        handler: async (request, reply) => {
          await transport.handleRequest(request.raw, reply.raw);
        },
      });
      await startAPIServer(app);
    } else {
      const app = await createAPIServer();
      await startAPIServer(app);
    }

    logger.info('WA-MCP Pro started successfully');
  } catch (error) {
    logger.fatal({ error }, 'Failed to start WA-MCP Pro');
    process.exit(1);
  }
}

main();