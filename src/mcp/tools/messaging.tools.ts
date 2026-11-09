import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getLogger } from '../../core/logger.js';
import {
  sendTextMessage,
  sendMediaMessage,
  sendLocationMessage,
  sendContactMessage,
  reactToMessage,
  deleteMessage,
  markAsRead,
  searchMessages,
} from '../../whatsapp/message-service.js';
import { AppError, ERROR_CODES } from '../../core/errors.js';

const logger = getLogger().child({ component: 'MessagingTools' });

const sendTextSchema = z.object({
  account_id: z.string().uuid(),
  to: z.string().min(1),
  message: z.string().min(1).max(4096),
  reply_to: z.string().optional(),
});

const sendMediaSchema = z.object({
  account_id: z.string().uuid(),
  to: z.string().min(1),
  media_path: z.string().min(1),
  mimetype: z.string().min(1),
  filename: z.string().optional(),
  caption: z.string().optional(),
  reply_to: z.string().optional(),
});

const sendLocationSchema = z.object({
  account_id: z.string().uuid(),
  to: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  name: z.string().optional(),
  address: z.string().optional(),
});

const sendContactSchema = z.object({
  account_id: z.string().uuid(),
  to: z.string().min(1),
  display_name: z.string().min(1),
  vcard: z.string().min(1),
});

const reactSchema = z.object({
  account_id: z.string().uuid(),
  to: z.string().min(1),
  message_id: z.string().min(1),
  reaction: z.string().min(1),
});

const deleteMsgSchema = z.object({
  account_id: z.string().uuid(),
  message_id: z.string().min(1),
  remote_jid: z.string().min(1),
});

const markReadSchema = z.object({
  account_id: z.string().uuid(),
  chat_jid: z.string().min(1),
  message_ids: z.array(z.string()).min(1),
});

const searchSchema = z.object({
  account_id: z.string().uuid(),
  query: z.string().min(1),
  limit: z.number().int().positive().max(100).default(50),
});

export function registerMessagingTools(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'whatsapp_send_message',
        description: 'Send a text message',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            to: { type: 'string', description: 'Recipient phone number or JID' },
            message: { type: 'string', description: 'Message text' },
            reply_to: { type: 'string', description: 'Message ID to reply to (optional)' },
          },
          required: ['account_id', 'to', 'message'],
        },
      },
      {
        name: 'whatsapp_send_image',
        description: 'Send an image',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            to: { type: 'string' },
            media_path: { type: 'string', description: 'Path to image file' },
            caption: { type: 'string', description: 'Image caption (optional)' },
            reply_to: { type: 'string', description: 'Message ID to reply to (optional)' },
          },
          required: ['account_id', 'to', 'media_path'],
        },
      },
      {
        name: 'whatsapp_send_video',
        description: 'Send a video',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            to: { type: 'string' },
            media_path: { type: 'string', description: 'Path to video file' },
            caption: { type: 'string', description: 'Video caption (optional)' },
            reply_to: { type: 'string', description: 'Message ID to reply to (optional)' },
          },
          required: ['account_id', 'to', 'media_path'],
        },
      },
      {
        name: 'whatsapp_send_document',
        description: 'Send a document',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            to: { type: 'string' },
            media_path: { type: 'string', description: 'Path to document file' },
            filename: { type: 'string', description: 'Document filename (optional)' },
            caption: { type: 'string', description: 'Document caption (optional)' },
            reply_to: { type: 'string', description: 'Message ID to reply to (optional)' },
          },
          required: ['account_id', 'to', 'media_path'],
        },
      },
      {
        name: 'whatsapp_send_audio',
        description: 'Send an audio file',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            to: { type: 'string' },
            media_path: { type: 'string', description: 'Path to audio file' },
            reply_to: { type: 'string', description: 'Message ID to reply to (optional)' },
          },
          required: ['account_id', 'to', 'media_path'],
        },
      },
      {
        name: 'whatsapp_send_location',
        description: 'Send a location',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            to: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            name: { type: 'string', description: 'Location name (optional)' },
            address: { type: 'string', description: 'Location address (optional)' },
          },
          required: ['account_id', 'to', 'latitude', 'longitude'],
        },
      },
      {
        name: 'whatsapp_send_contact',
        description: 'Send a contact',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            to: { type: 'string' },
            display_name: { type: 'string' },
            vcard: { type: 'string' },
          },
          required: ['account_id', 'to', 'display_name', 'vcard'],
        },
      },
      {
        name: 'whatsapp_react_message',
        description: 'React to a message',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            to: { type: 'string' },
            message_id: { type: 'string' },
            reaction: { type: 'string' },
          },
          required: ['account_id', 'to', 'message_id', 'reaction'],
        },
      },
      {
        name: 'whatsapp_delete_message',
        description: 'Delete a message',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            message_id: { type: 'string' },
            remote_jid: { type: 'string' },
          },
          required: ['account_id', 'message_id', 'remote_jid'],
        },
      },
      {
        name: 'whatsapp_mark_read',
        description: 'Mark messages as read',
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
        name: 'whatsapp_search_messages',
        description: 'Search messages',
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

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'whatsapp_send_message': {
          const { account_id, to, message, reply_to } = sendTextSchema.parse(args);
          const result = await sendTextMessage({ to, text: message, replyTo: reply_to });
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'whatsapp_send_image': {
          const { account_id, to, media_path, caption, reply_to } = sendMediaSchema.parse(args);
          const result = await sendMediaMessage({
            to,
            media: { path: media_path, mimetype: 'image/jpeg', caption },
          });
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'whatsapp_send_video': {
          const { account_id, to, media_path, caption, reply_to } = sendMediaSchema.parse(args);
          const result = await sendMediaMessage({
            to,
            media: { path: media_path, mimetype: 'video/mp4', caption },
          });
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'whatsapp_send_document': {
          const { account_id, to, media_path, filename, caption, reply_to } = sendMediaSchema.parse(args);
          const result = await sendMediaMessage({
            to,
            media: { path: media_path, mimetype: 'application/pdf', filename, caption },
          });
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'whatsapp_send_audio': {
          const { account_id, to, media_path, reply_to } = sendMediaSchema.parse(args);
          const result = await sendMediaMessage({
            to,
            media: { path: media_path, mimetype: 'audio/ogg' },
          });
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'whatsapp_send_location': {
          const { account_id, to, latitude, longitude, name, address } = sendLocationSchema.parse(args);
          const result = await sendLocationMessage(to, { degreesLatitude: latitude, degreesLongitude: longitude, name, address });
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'whatsapp_send_contact': {
          const { account_id, to, display_name, vcard } = sendContactSchema.parse(args);
          const result = await sendContactMessage(to, { displayName: display_name, vcard });
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'whatsapp_react_message': {
          const { account_id, to, message_id, reaction } = reactSchema.parse(args);
          await reactToMessage(to, message_id, reaction);
          return { content: [{ type: 'text', text: 'Reaction sent' }] };
        }

        case 'whatsapp_delete_message': {
          const { account_id, message_id, remote_jid } = deleteMsgSchema.parse(args);
          await deleteMessage(account_id, message_id, remote_jid);
          return { content: [{ type: 'text', text: 'Message deleted' }] };
        }

        case 'whatsapp_mark_read': {
          const { account_id, chat_jid, message_ids } = markReadSchema.parse(args);
          await markAsRead(account_id, chat_jid, message_ids);
          return { content: [{ type: 'text', text: 'Messages marked as read' }] };
        }

        case 'whatsapp_search_messages': {
          const { account_id, query, limit } = searchSchema.parse(args);
          const results = await searchMessages(account_id, query, limit);
          return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
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