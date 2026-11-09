import { FastifyInstance } from 'fastify';
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
import { requireMessagesRead, requireMessagesSend } from '../middleware/authorization.js';

const logger = getLogger().child({ component: 'MessagingRoutes' });

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

const deleteSchema = z.object({
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

export async function messagingRoutes(app: FastifyInstance): Promise<void> {
  app.post('/messages/send', {
    preHandler: requireMessagesSend,
    schema: {
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string', format: 'uuid' },
          to: { type: 'string' },
          message: { type: 'string' },
          reply_to: { type: 'string' },
        },
        required: ['account_id', 'to', 'message'],
      },
    },
  }, async (request, _reply) => {
    const { to, message, reply_to } = sendTextSchema.parse(request.body);
    const textOptions: { to: string; text: string; replyTo?: string } = { to, text: message };
    if (reply_to !== undefined) textOptions.replyTo = reply_to;
    const result = await sendTextMessage(textOptions);
    return result;
  });

  app.post('/messages/image', {
    preHandler: requireMessagesSend,
    schema: {
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string', format: 'uuid' },
          to: { type: 'string' },
          media_path: { type: 'string' },
          caption: { type: 'string' },
          reply_to: { type: 'string' },
        },
        required: ['account_id', 'to', 'media_path'],
      },
    },
  }, async (request, _reply) => {
    const { to, media_path, caption } = sendMediaSchema.parse(request.body);
    const result = await sendMediaMessage({
      to,
      media: { path: media_path, mimetype: 'image/jpeg', caption: caption ?? '' },
    });
    return result;
  });

  app.post('/messages/video', {
    preHandler: requireMessagesSend,
    schema: {
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string', format: 'uuid' },
          to: { type: 'string' },
          media_path: { type: 'string' },
          caption: { type: 'string' },
          reply_to: { type: 'string' },
        },
        required: ['account_id', 'to', 'media_path'],
      },
    },
  }, async (request, _reply) => {
    const { to, media_path, caption } = sendMediaSchema.parse(request.body);
    const result = await sendMediaMessage({
      to,
      media: { path: media_path, mimetype: 'video/mp4', caption: caption ?? '' },
    });
    return result;
  });

  app.post('/messages/document', {
    preHandler: requireMessagesSend,
    schema: {
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string', format: 'uuid' },
          to: { type: 'string' },
          media_path: { type: 'string' },
          filename: { type: 'string' },
          caption: { type: 'string' },
          reply_to: { type: 'string' },
        },
        required: ['account_id', 'to', 'media_path'],
      },
    },
  }, async (request, _reply) => {
    const { to, media_path, filename, caption } = sendMediaSchema.parse(request.body);
    const mediaOptions: { path: string; mimetype: string; filename?: string; caption?: string } = {
      path: media_path,
      mimetype: 'application/pdf',
      caption: caption ?? '',
    };
    if (filename !== undefined) mediaOptions.filename = filename;
    const result = await sendMediaMessage({ to, media: mediaOptions });
    return result;
  });

  app.post('/messages/audio', {
    preHandler: requireMessagesSend,
    schema: {
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string', format: 'uuid' },
          to: { type: 'string' },
          media_path: { type: 'string' },
          reply_to: { type: 'string' },
        },
        required: ['account_id', 'to', 'media_path'],
      },
    },
  }, async (request, _reply) => {
    const { to, media_path } = sendMediaSchema.parse(request.body);
    const result = await sendMediaMessage({
      to,
      media: { path: media_path, mimetype: 'audio/ogg' },
    });
    return result;
  });

  app.post('/messages/location', {
    preHandler: requireMessagesSend,
    schema: {
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string', format: 'uuid' },
          to: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          name: { type: 'string' },
          address: { type: 'string' },
        },
        required: ['account_id', 'to', 'latitude', 'longitude'],
      },
    },
  }, async (request, _reply) => {
    const { to, latitude, longitude, name, address } = sendLocationSchema.parse(request.body);
    const locationOptions: { degreesLatitude: number; degreesLongitude: number; name?: string; address?: string } = {
      degreesLatitude: latitude,
      degreesLongitude: longitude,
    };
    if (name !== undefined) locationOptions.name = name;
    if (address !== undefined) locationOptions.address = address;
    const result = await sendLocationMessage(to, locationOptions);
    return result;
  });

  app.post('/messages/contact', {
    preHandler: requireMessagesSend,
    schema: {
      body: {
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
  }, async (request, _reply) => {
    const { to, display_name, vcard } = sendContactSchema.parse(request.body);
    const result = await sendContactMessage(to, { displayName: display_name, vcard });
    return result;
  });

  app.post('/messages/react', {
    preHandler: requireMessagesSend,
    schema: {
      body: {
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
  }, async (request, _reply) => {
    const { to, message_id, reaction } = reactSchema.parse(request.body);
    await reactToMessage(to, message_id, reaction);
    return { success: true };
  });

  app.delete('/messages', {
    preHandler: requireMessagesSend,
    schema: {
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string', format: 'uuid' },
          message_id: { type: 'string' },
          remote_jid: { type: 'string' },
        },
        required: ['account_id', 'message_id', 'remote_jid'],
      },
    },
  }, async (request, _reply) => {
    const { account_id, message_id, remote_jid } = deleteSchema.parse(request.body);
    await deleteMessage(account_id, message_id, remote_jid);
    return { success: true };
  });

  app.post('/messages/read', {
    preHandler: requireMessagesSend,
    schema: {
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string', format: 'uuid' },
          chat_jid: { type: 'string' },
          message_ids: { type: 'array', items: { type: 'string' } },
        },
        required: ['account_id', 'chat_jid', 'message_ids'],
      },
    },
  }, async (request, _reply) => {
    const { account_id, chat_jid, message_ids } = markReadSchema.parse(request.body);
    await markAsRead(account_id, chat_jid, message_ids);
    return { success: true };
  });

  app.get('/messages/search', {
    preHandler: requireMessagesRead,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          account_id: { type: 'string', format: 'uuid' },
          query: { type: 'string' },
          limit: { type: 'number', default: 50 },
        },
        required: ['account_id', 'query'],
      },
    },
  }, async (request, _reply) => {
    const { account_id, query, limit } = searchSchema.parse(request.query);
    const results = await searchMessages(account_id, query, limit);
    return { messages: results };
  });

  app.get('/messages/:id', {
    preHandler: requireMessagesRead,
  }, async (request, _reply) => {
    const { id } = request.params as { id: string };
    const { getMessageById } = await import('../../whatsapp/history-service.js');
    const message = await getMessageById('', id);
    if (!message) {
      throw new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Message not found', 404);
    }
    return message;
  });

  logger.info('Messaging routes registered');
}