import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { getLogger } from '../../core/logger.js';
import { getDatabase } from '../../database/client.js';
import { automations } from '../../database/schema/automations.js';
import { eq, and, desc } from 'drizzle-orm';
import { AppError, ERROR_CODES } from '../../core/errors.js';

const logger = getLogger().child({ component: 'AutomationTools' });

const baseAccountSchema = z.object({
  account_id: z.string().uuid(),
});

const createAutomationSchema = baseAccountSchema.extend({
  name: z.string().min(1).max(100),
  trigger_type: z.enum(['keyword', 'exact_match', 'regex', 'command']),
  trigger_value: z.string().min(1),
  response: z.string().min(1),
  enabled: z.boolean().default(true),
  cooldown: z.number().int().nonnegative().default(0),
});

const updateAutomationSchema = baseAccountSchema.extend({
  automation_id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  trigger_type: z.enum(['keyword', 'exact_match', 'regex', 'command']).optional(),
  trigger_value: z.string().min(1).optional(),
  response: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  cooldown: z.number().int().nonnegative().optional(),
});

const toggleSchema = baseAccountSchema.extend({
  automation_id: z.string().uuid(),
});

const getAutomationSchema = baseAccountSchema.extend({
  automation_id: z.string().uuid(),
});

const listSchema = baseAccountSchema.extend({
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  enabled: z.boolean().optional(),
});

export function registerAutomationTools(server: Server): void {
  server.setRequestHandler('tools/list', async () => ({
    tools: [
      {
        name: 'whatsapp_create_auto_reply',
        description: 'Create an auto-reply rule',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            trigger_type: { type: 'string', enum: ['keyword', 'exact_match', 'regex', 'command'] },
            trigger_value: { type: 'string' },
            response: { type: 'string' },
            enabled: { type: 'boolean', default: true },
            cooldown: { type: 'number', default: 0 },
          },
          required: ['account_id', 'name', 'trigger_type', 'trigger_value', 'response'],
        },
      },
      {
        name: 'whatsapp_update_auto_reply',
        description: 'Update an auto-reply rule',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            automation_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            trigger_type: { type: 'string', enum: ['keyword', 'exact_match', 'regex', 'command'] },
            trigger_value: { type: 'string' },
            response: { type: 'string' },
            enabled: { type: 'boolean' },
            cooldown: { type: 'number' },
          },
          required: ['account_id', 'automation_id'],
        },
      },
      {
        name: 'whatsapp_delete_auto_reply',
        description: 'Delete an auto-reply rule',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            automation_id: { type: 'string', format: 'uuid' },
          },
          required: ['account_id', 'automation_id'],
        },
      },
      {
        name: 'whatsapp_list_auto_reply',
        description: 'List auto-reply rules',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 },
            enabled: { type: 'boolean' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'whatsapp_toggle_auto_reply',
        description: 'Enable or disable an auto-reply rule',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            automation_id: { type: 'string', format: 'uuid' },
          },
          required: ['account_id', 'automation_id'],
        },
      },
      {
        name: 'whatsapp_get_auto_reply',
        description: 'Get auto-reply rule details',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            automation_id: { type: 'string', format: 'uuid' },
          },
          required: ['account_id', 'automation_id'],
        },
      },
    ],
  }));

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const db = getDatabase();

      switch (name) {
        case 'whatsapp_create_auto_reply': {
          const { account_id, ...data } = createAutomationSchema.parse(args);
          const id = crypto.randomUUID();
          const now = new Date();

          await db.insert(automations).values({
            id,
            accountId: account_id,
            ...data,
            createdAt: now,
            updatedAt: now,
          });

          return { content: [{ type: 'text', text: JSON.stringify({ id, ...data }, null, 2) }] };
        }

        case 'whatsapp_update_auto_reply': {
          const { account_id, automation_id, ...data } = updateAutomationSchema.parse(args);
          const now = new Date();

          const result = await db
            .update(automations)
            .set({ ...data, updatedAt: now })
            .where(and(eq(automations.id, automation_id), eq(automations.accountId, account_id)))
            .returning();

          if (!result[0]) {
            throw new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Automation not found');
          }

          return { content: [{ type: 'text', text: JSON.stringify(result[0], null, 2) }] };
        }

        case 'whatsapp_delete_auto_reply': {
          const { account_id, automation_id } = getAutomationSchema.parse(args);
          const result = await db
            .delete(automations)
            .where(and(eq(automations.id, automation_id), eq(automations.accountId, account_id)));

          if ((result.changes ?? 0) === 0) {
            throw new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Automation not found');
          }

          return { content: [{ type: 'text', text: 'Automation deleted' }] };
        }

        case 'whatsapp_list_auto_reply': {
          const { account_id, limit, offset, enabled } = listSchema.parse(args);

          const conditions = [eq(automations.accountId, account_id)];
          if (enabled !== undefined) {
            conditions.push(eq(automations.enabled, enabled));
          }

          const results = await db
            .select()
            .from(automations)
            .where(and(...conditions))
            .orderBy(desc(automations.createdAt))
            .limit(limit)
            .offset(offset);

          return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
        }

        case 'whatsapp_toggle_auto_reply': {
          const { account_id, automation_id } = toggleSchema.parse(args);

          const existing = await db
            .select()
            .from(automations)
            .where(and(eq(automations.id, automation_id), eq(automations.accountId, account_id)))
            .limit(1);

          if (!existing[0]) {
            throw new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Automation not found');
          }

          const result = await db
            .update(automations)
            .set({ enabled: !existing[0].enabled, updatedAt: new Date() })
            .where(eq(automations.id, automation_id))
            .returning();

          return { content: [{ type: 'text', text: JSON.stringify(result[0], null, 2) }] };
        }

        case 'whatsapp_get_auto_reply': {
          const { account_id, automation_id } = getAutomationSchema.parse(args);

          const result = await db
            .select()
            .from(automations)
            .where(and(eq(automations.id, automation_id), eq(automations.accountId, account_id)))
            .limit(1);

          if (!result[0]) {
            throw new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Automation not found');
          }

          return { content: [{ type: 'text', text: JSON.stringify(result[0], null, 2) }] };
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