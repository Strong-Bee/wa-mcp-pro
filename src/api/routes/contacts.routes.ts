import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getLogger } from '../../core/logger.js';
import {
  getContacts,
  getContact,
  checkNumber,
  getProfilePicture,
  searchContacts,
  countContacts,
} from '../../whatsapp/contact-service.js';
import { AppError, ERROR_CODES } from '../../core/errors.js';
import { requireContactsRead } from '../middleware/authorization.js';

const logger = getLogger().child({ component: 'ContactRoutes' });

const getContactsSchema = z.object({
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  search: z.string().optional(),
});

const getContactSchema = z.object({
  jid: z.string().min(1),
});

const checkNumberSchema = z.object({
  phone_number: z.string().min(10),
});

export async function contactRoutes(app: FastifyInstance): Promise<void> {
  app.get('/contacts', {
    preHandler: requireContactsRead,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
          search: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { limit, offset, search } = getContactsSchema.parse(request.query);
    const contacts = await getContacts(account_id, limit, offset, search);
    return { contacts };
  });

  app.get('/contacts/:jid', {
    preHandler: requireContactsRead,
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { jid } = getContactSchema.parse(request.params);
    const contact = await getContact(account_id, jid);
    if (!contact) {
      throw new AppError(ERROR_CODES.WA_INVALID_JID, 'Contact not found', 404);
    }
    return contact;
  });

  app.post('/contacts/check', {
    preHandler: requireContactsRead,
    schema: {
      body: {
        type: 'object',
        properties: {
          phone_number: { type: 'string' },
        },
        required: ['phone_number'],
      },
    },
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { phone_number } = checkNumberSchema.parse(request.body);
    const result = await checkNumber(account_id, phone_number);
    return result;
  });

  app.get('/contacts/:jid/profile-picture', {
    preHandler: requireContactsRead,
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { jid } = getContactSchema.parse(request.params);
    const url = await getProfilePicture(account_id, jid);
    return { jid, profile_picture_url: url };
  });

  app.get('/contacts/search', {
    preHandler: requireContactsRead,
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
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { query, limit } = z.object({ query: z.string(), limit: z.number().default(50) }).parse(request.query);
    const contacts = await searchContacts(account_id, query, limit);
    return { contacts };
  });

  app.get('/contacts/count', {
    preHandler: requireContactsRead,
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const count = await countContacts(account_id);
    return { account_id, count };
  });

  logger.info('Contact routes registered');
}