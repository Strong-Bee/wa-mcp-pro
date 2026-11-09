import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getLogger } from '../../core/logger.js';
import {
  getChats,
  getChat,
  getChatMessages,
  markChatAsRead,
  archiveChat,
  getUnreadCount,
  countChats,
  searchChats,
} from '../../whatsapp/chat-service.js';
import { AppError, ERROR_CODES } from '../../core/errors.js';
import { requireMessagesRead } from '../middleware/authorization.js';

const logger = getLogger().child({ component: 'ChatRoutes' });

const getChatsSchema = z.object({
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  is_group: z.boolean().optional(),
  search: z.string().optional(),
});

const chatParamsSchema = z.object({
  chat_jid: z.string().min(1),
});

const getMessagesSchema = z.object({
  limit: z.number().int().positive().max(500).default(50),
  before: z.string().datetime().optional(),
});

const markReadSchema = z.object({
  message_ids: z.array(z.string()).min(1),
});

const archiveSchema = z.object({
  archive: z.boolean().default(true),
});

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.get('/chats', {
    preHandler: requireMessagesRead,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
          is_group: { type: 'boolean' },
          search: { type: 'string' },
        },
      },
    },
  }, async (request, _reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { limit, offset, is_group, search } = getChatsSchema.parse(request.query);
    const options: { isGroup?: boolean; search?: string } = {};
    if (is_group !== undefined) options.isGroup = is_group;
    if (search !== undefined) options.search = search;
    const chats = await getChats(account_id, limit, offset, options);
    return { chats };
  });

  app.get('/chats/:chat_jid', {
    preHandler: requireMessagesRead,
  }, async (request, _reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { chat_jid } = chatParamsSchema.parse(request.params);
    const chat = await getChat(account_id, chat_jid);
    if (!chat) {
      throw new AppError(ERROR_CODES.WA_INVALID_JID, 'Chat not found', 404);
    }
    return chat;
  });

  app.get('/chats/:chat_jid/messages', {
    preHandler: requireMessagesRead,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          before: { type: 'string', format: 'date-time' },
        },
      },
    },
  }, async (request, _reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { chat_jid } = chatParamsSchema.parse(request.params);
    const { limit, before } = getMessagesSchema.parse(request.query);
    const messages = await getChatMessages(account_id, chat_jid, limit, before ? new Date(before) : undefined);
    return { messages };
  });

  app.post('/chats/:chat_jid/read', {
    preHandler: requireMessagesRead,
    schema: {
      body: {
        type: 'object',
        properties: {
          message_ids: { type: 'array', items: { type: 'string' } },
        },
        required: ['message_ids'],
      },
    },
  }, async (request, _reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { chat_jid } = chatParamsSchema.parse(request.params);
    markReadSchema.parse(request.body);
    await markChatAsRead(account_id, chat_jid);
    return { success: true };
  });

  app.patch('/chats/:chat_jid/archive', {
    preHandler: requireMessagesRead,
    schema: {
      body: {
        type: 'object',
        properties: {
          archive: { type: 'boolean', default: true },
        },
      },
    },
  }, async (request, _reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { chat_jid } = chatParamsSchema.parse(request.params);
    const { archive } = archiveSchema.parse(request.body);
    await archiveChat(account_id, chat_jid, archive);
    return { success: true };
  });

  app.get('/chats/unread-count', {
    preHandler: requireMessagesRead,
  }, async (request, _reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const count = await getUnreadCount(account_id);
    return { account_id, unread_count: count };
  });

  app.get('/chats/count', {
    preHandler: requireMessagesRead,
  }, async (request, _reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const count = await countChats(account_id);
    return { account_id, count };
  });

  app.get('/chats/search', {
    preHandler: requireMessagesRead,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number', default: 50 },
        },
        required: ['query'],
      },
    },
  }, async (request, _reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { query, limit } = z.object({ query: z.string(), limit: z.number().default(50) }).parse(request.query);
    const chats = await searchChats(account_id, query, limit);
    return { chats };
  });

  logger.info('Chat routes registered');
}