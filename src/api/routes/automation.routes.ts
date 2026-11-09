import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getLogger } from '../../core/logger.js';
import { getDatabase } from '../../database/client.js';
import { automations } from '../../database/schema/automations.js';
import { eq, and, desc } from 'drizzle-orm';
import { AppError, ERROR_CODES } from '../../core/errors.js';
import { requireAutomationRead, requireAutomationManage } from '../middleware/authorization.js';

const logger = getLogger().child({ component: 'AutomationRoutes' });

const createSchema = z.object({
  name: z.string().min(1).max(100),
  trigger_type: z.enum(['keyword', 'exact_match', 'regex', 'command']),
  trigger_value: z.string().min(1),
  response: z.string().min(1),
  enabled: z.boolean().default(true),
  cooldown: z.number().int().nonnegative().default(0),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  trigger_type: z.enum(['keyword', 'exact_match', 'regex', 'command']).optional(),
  trigger_value: z.string().min(1).optional(),
  response: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  cooldown: z.number().int().nonnegative().optional(),
});

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

const listSchema = z.object({
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  enabled: z.boolean().optional(),
});

export async function automationRoutes(app: FastifyInstance): Promise<void> {
  app.post('/automations', {
    preHandler: requireAutomationManage,
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          trigger_type: { type: 'string', enum: ['keyword', 'exact_match', 'regex', 'command'] },
          trigger_value: { type: 'string' },
          response: { type: 'string' },
          enabled: { type: 'boolean', default: true },
          cooldown: { type: 'number', default: 0 },
        },
        required: ['name', 'trigger_type', 'trigger_value', 'response'],
      },
    },
  }, async (request, _reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const data = createSchema.parse(request.body);
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(automations).values({
      id,
      accountId: account_id,
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    return { id, ...data };
  });

  app.get('/automations', {
    preHandler: requireAutomationRead,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
          enabled: { type: 'boolean' },
        },
      },
    },
  }, async (request, _reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { limit, offset, enabled } = listSchema.parse(request.query);
    const db = getDatabase();

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

    return { automations: results };
  });

  app.get('/automations/:id', {
    preHandler: requireAutomationRead,
  }, async (request, _reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { id } = idParamsSchema.parse(request.params);
    const db = getDatabase();

    const result = await db
      .select()
      .from(automations)
      .where(and(eq(automations.id, id), eq(automations.accountId, account_id)))
      .limit(1);

    if (!result[0]) {
      throw new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Automation not found', 404);
    }

    return result[0];
  });

  app.patch('/automations/:id', {
    preHandler: requireAutomationManage,
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          trigger_type: { type: 'string', enum: ['keyword', 'exact_match', 'regex', 'command'] },
          trigger_value: { type: 'string' },
          response: { type: 'string' },
          enabled: { type: 'boolean' },
          cooldown: { type: 'number' },
        },
      },
    },
  }, async (request, _reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { id } = idParamsSchema.parse(request.params);
    const data = updateSchema.parse(request.body);
    const db = getDatabase();
    const now = new Date();

    const result = await db
      .update(automations)
      .set({ ...data, updatedAt: now })
      .where(and(eq(automations.id, id), eq(automations.accountId, account_id)))
      .returning();

    if (!result[0]) {
      throw new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Automation not found', 404);
    }

    return result[0];
  });

  app.delete('/automations/:id', {
    preHandler: requireAutomationManage,
  }, async (request, _reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { id } = idParamsSchema.parse(request.params);
    const db = getDatabase();

    const result = await db
      .delete(automations)
      .where(and(eq(automations.id, id), eq(automations.accountId, account_id)));

    if ((result.changes ?? 0) === 0) {
      throw new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Automation not found', 404);
    }

    return { success: true };
  });

  app.post('/automations/:id/toggle', {
    preHandler: requireAutomationManage,
  }, async (request, _reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { id } = idParamsSchema.parse(request.params);
    const db = getDatabase();

    const existing = await db
      .select()
      .from(automations)
      .where(and(eq(automations.id, id), eq(automations.accountId, account_id)))
      .limit(1);

    if (!existing[0]) {
      throw new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Automation not found', 404);
    }

    const result = await db
      .update(automations)
      .set({ enabled: !existing[0].enabled, updatedAt: new Date() })
      .where(eq(automations.id, id))
      .returning();

    return result[0];
  });

  logger.info('Automation routes registered');
}