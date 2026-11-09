import type { ToolModuleServer } from '../tool-module.js';
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

const logger = getLogger().child({ component: 'ChatTools' });

const baseAccountSchema = z.object({
  account_id: z.string().uuid(),
});

const chatJidSchema = baseAccountSchema.extend({
  chat_jid: z.string().min(1),
});

const getChatsSchema = baseAccountSchema.extend({
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  is_group: z.boolean().optional(),
  search: z.string().optional(),
});

const getMessagesSchema = chatJidSchema.extend({
  limit: z.number().int().positive().max(500).default(50),
  before: z.string().datetime().optional(),
});

const markReadSchema = chatJidSchema.extend({
  message_ids: z.array(z.string()).min(1),
});

const archiveSchema = chatJidSchema.extend({
  archive: z.boolean().default(true),
});

export function registerChatTools(server: ToolModuleServer): void {
  server.setRequestHandler('tools/list', async () => ({
    tools: [
      {
        name: 'whatsapp_get_chats',
        description: 'Get list of chats',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 },
            is_group: { type: 'boolean', description: 'Filter by group chats' },
            search: { type: 'string', description: 'Search query' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'whatsapp_get_chat',
        description: 'Get chat information',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            chat_jid: { type: 'string' },
          },
          required: ['account_id', 'chat_jid'],
        },
      },
      {
        name: 'whatsapp_get_messages',
        description: 'Get chat message history',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            chat_jid: { type: 'string' },
            limit: { type: 'number', default: 50 },
            before: { type: 'string', format: 'date-time', description: 'Get messages before this date' },
          },
          required: ['account_id', 'chat_jid'],
        },
      },
      {
        name: 'whatsapp_mark_as_read',
        description: 'Mark chat as read',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            chat_jid: { type: 'string' },
            message_ids: { type: 'array', items: { type: 'string' } },
          },
          required: ['account_id', 'chat_jid', 'message_ids'],
        },
      },
      {
        name: 'whatsapp_archive_chat',
        description: 'Archive or unarchive chat',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            chat_jid: { type: 'string' },
            archive: { type: 'boolean', default: true },
          },
          required: ['account_id', 'chat_jid'],
        },
      },
      {
        name: 'whatsapp_get_unread_count',
        description: 'Get unread message count',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'whatsapp_count_chats',
        description: 'Count total chats',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'whatsapp_search_chats',
        description: 'Search chats',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            query: { type: 'string' },
            limit: { type: 'number', default: 50 },
          },
          required: ['account_id', 'query'],
        },
      },
    ],
  }));

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'whatsapp_get_chats': {
          const { account_id, limit, offset, is_group, search } = getChatsSchema.parse(args);
          const chats = await getChats(account_id, limit, offset, { isGroup: is_group, search });
          return { content: [{ type: 'text', text: JSON.stringify(chats, null, 2) }] };
        }

        case 'whatsapp_get_chat': {
          const { account_id, chat_jid } = chatJidSchema.parse(args);
          const chat = await getChat(account_id, chat_jid);
          if (!chat) {
            throw new AppError(ERROR_CODES.WA_INVALID_JID, 'Chat not found');
          }
          return { content: [{ type: 'text', text: JSON.stringify(chat, null, 2) }] };
        }

        case 'whatsapp_get_messages': {
          const { account_id, chat_jid, limit, before } = getMessagesSchema.parse(args);
          const messages = await getChatMessages(account_id, chat_jid, limit, before ? new Date(before) : undefined);
          return { content: [{ type: 'text', text: JSON.stringify(messages, null, 2) }] };
        }

        case 'whatsapp_mark_as_read': {
          const { account_id, chat_jid, message_ids } = markReadSchema.parse(args);
          await markChatAsRead(account_id, chat_jid);
          return { content: [{ type: 'text', text: 'Chat marked as read' }] };
        }

        case 'whatsapp_archive_chat': {
          const { account_id, chat_jid, archive } = archiveSchema.parse(args);
          await archiveChat(account_id, chat_jid, archive);
          return { content: [{ type: 'text', text: `Chat ${archive ? 'archived' : 'unarchived'}` }] };
        }

        case 'whatsapp_get_unread_count': {
          const { account_id } = baseAccountSchema.parse(args);
          const count = await getUnreadCount(account_id);
          return { content: [{ type: 'text', text: JSON.stringify({ account_id, unread_count: count }, null, 2) }] };
        }

        case 'whatsapp_count_chats': {
          const { account_id } = baseAccountSchema.parse(args);
          const count = await countChats(account_id);
          return { content: [{ type: 'text', text: JSON.stringify({ account_id, count }, null, 2) }] };
        }

        case 'whatsapp_search_chats': {
          const { account_id, query, limit } = baseAccountSchema.extend({ query: z.string(), limit: z.number().default(50) }).parse(args);
          const chats = await searchChats(account_id, query, limit);
          return { content: [{ type: 'text', text: JSON.stringify(chats, null, 2) }] };
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