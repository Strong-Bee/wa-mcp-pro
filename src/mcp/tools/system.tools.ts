import type { ToolModuleServer } from '../tool-module.js';
import { z } from 'zod';
import { getLogger } from '../../core/logger.js';
import { getConfig } from '../../config/env.js';
import { getDatabase } from '../../database/client.js';
import { messages } from '../../database/schema/messages.js';
import { count, eq } from 'drizzle-orm';
import { AppError, ERROR_CODES } from '../../core/errors.js';

const logger = getLogger().child({ component: 'SystemTools' });

const healthSchema = z.object({
  account_id: z.string().uuid().optional(),
});

const metricsSchema = z.object({
  account_id: z.string().uuid().optional(),
});

export function registerSystemTools(server: ToolModuleServer): void {
  server.setRequestHandler('tools/list', async () => ({
    tools: [
      {
        name: 'whatsapp_health_check',
        description: 'Check system health',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid', description: 'Optional account ID to check' },
          },
        },
      },
      {
        name: 'whatsapp_get_metrics',
        description: 'Get system metrics',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid', description: 'Optional account ID for account-specific metrics' },
          },
        },
      },
      {
        name: 'whatsapp_get_version',
        description: 'Get application version',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'whatsapp_get_capabilities',
        description: 'Get available capabilities',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  }));

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'whatsapp_health_check': {
          const { account_id } = healthSchema.parse(args);
          const config = getConfig();

          const health: any = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: config.APP_VERSION,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            database: 'connected',
          };

          if (account_id) {
            const { getConnectionStatus } = await import('../../whatsapp/baileys-adapter.js');
            health.whatsapp = {
              account_id,
              status: getConnectionStatus(account_id),
            };
          }

          return { content: [{ type: 'text', text: JSON.stringify(health, null, 2) }] };
        }

        case 'whatsapp_get_metrics': {
          const { account_id } = metricsSchema.parse(args);
          const db = getDatabase();

          let messageCount = 0;
          if (account_id) {
            const result = await db.select({ count: count() }).from(messages).where(eq(messages.accountId, account_id));
            messageCount = result[0]?.count ?? 0;
          } else {
            const result = await db.select({ count: count() }).from(messages);
            messageCount = result[0]?.count ?? 0;
          }

          const metrics = {
            total_messages: messageCount,
            uptime: process.uptime(),
            memory_usage: process.memoryUsage(),
            cpu_usage: process.cpuUsage(),
          };

          return { content: [{ type: 'text', text: JSON.stringify(metrics, null, 2) }] };
        }

        case 'whatsapp_get_version': {
          const config = getConfig();
          return { content: [{ type: 'text', text: JSON.stringify({
            name: config.APP_NAME,
            version: config.APP_VERSION,
            node_version: process.version,
          }, null, 2) }] };
        }

        case 'whatsapp_get_capabilities': {
          const capabilities = {
            transports: ['stdio', 'http'],
            authentication: ['qr', 'pairing_code'],
            messaging: ['text', 'image', 'video', 'document', 'audio', 'location', 'contact'],
            groups: ['create', 'manage_participants', 'update_info', 'invite'],
            automation: ['keyword', 'exact_match', 'regex', 'command'],
            media: ['download', 'validate', 'cleanup'],
            database: 'sqlite',
            multi_account: true,
          };

          return { content: [{ type: 'text', text: JSON.stringify(capabilities, null, 2) }] };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      logger.error({ tool: name, error }, 'Tool execution failed');
      throw error;
    }
  });
}