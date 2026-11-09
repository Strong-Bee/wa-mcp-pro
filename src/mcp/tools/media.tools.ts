import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { getLogger } from '../../core/logger.js';
import { downloadMedia, validateMedia, getMediaInfo, cleanupOldMedia } from '../../whatsapp/media-service.js';
import { AppError, ERROR_CODES } from '../../core/errors.js';

const logger = getLogger().child({ component: 'MediaTools' });

const downloadSchema = z.object({
  account_id: z.string().uuid(),
  message_id: z.string().min(1),
  chat_jid: z.string().min(1),
  message_type: z.string().min(1),
});

const validateSchema = z.object({
  mimetype: z.string().min(1),
  size: z.number().int().positive(),
});

const infoSchema = z.object({
  account_id: z.string().uuid(),
  file_path: z.string().min(1),
});

const cleanupSchema = z.object({
  account_id: z.string().uuid(),
  older_than_days: z.number().int().positive().default(30),
});

export function registerMediaTools(server: Server): void {
  server.setRequestHandler('tools/list', async () => ({
    tools: [
      {
        name: 'whatsapp_download_media',
        description: 'Download media from a message',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            message_id: { type: 'string' },
            chat_jid: { type: 'string' },
            message_type: { type: 'string' },
          },
          required: ['account_id', 'message_id', 'chat_jid', 'message_type'],
        },
      },
      {
        name: 'whatsapp_validate_media',
        description: 'Validate media file before sending',
        inputSchema: {
          type: 'object',
          properties: {
            mimetype: { type: 'string' },
            size: { type: 'number' },
          },
          required: ['mimetype', 'size'],
        },
      },
      {
        name: 'whatsapp_get_media_info',
        description: 'Get media file information',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            file_path: { type: 'string' },
          },
          required: ['account_id', 'file_path'],
        },
      },
      {
        name: 'whatsapp_cleanup_media',
        description: 'Clean up old media files',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            older_than_days: { type: 'number', default: 30 },
          },
          required: ['account_id'],
        },
      },
    ],
  }));

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'whatsapp_download_media': {
          const { account_id, message_id, chat_jid, message_type } = downloadSchema.parse(args);
          const result = await downloadMedia(account_id, message_id, chat_jid, message_type);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'whatsapp_validate_media': {
          const { mimetype, size } = validateSchema.parse(args);
          const result = validateMedia(mimetype, size);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'whatsapp_get_media_info': {
          const { account_id, file_path } = infoSchema.parse(args);
          const info = await getMediaInfo(account_id, file_path);
          if (!info) {
            throw new AppError(ERROR_CODES.WA_MEDIA_INVALID, 'Media file not found');
          }
          return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
        }

        case 'whatsapp_cleanup_media': {
          const { account_id, older_than_days } = cleanupSchema.parse(args);
          const deleted = await cleanupOldMedia(account_id, older_than_days);
          return { content: [{ type: 'text', text: JSON.stringify({ deleted }, null, 2) }] };
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