import { Server } from '@modelcontextprotocol/sdk/server/index.js';
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

const logger = getLogger().child({ component: 'ContactTools' });

const getContactsSchema = z.object({
  account_id: z.string().uuid(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  search: z.string().optional(),
});

const getContactSchema = z.object({
  account_id: z.string().uuid(),
  jid: z.string().min(1),
});

const checkNumberSchema = z.object({
  account_id: z.string().uuid(),
  phone_number: z.string().min(10),
});

const getProfileSchema = z.object({
  account_id: z.string().uuid(),
  jid: z.string().min(1),
});

export function registerContactTools(server: Server): void {
  server.setRequestHandler('tools/list', async () => ({
    tools: [
      {
        name: 'whatsapp_get_contacts',
        description: 'Get list of contacts',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 },
            search: { type: 'string', description: 'Search query (optional)' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'whatsapp_get_contact',
        description: 'Get contact details',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            jid: { type: 'string', description: 'Contact JID' },
          },
          required: ['account_id', 'jid'],
        },
      },
      {
        name: 'whatsapp_check_number',
        description: 'Check if a phone number exists on WhatsApp',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            phone_number: { type: 'string', description: 'Phone number in international format' },
          },
          required: ['account_id', 'phone_number'],
        },
      },
      {
        name: 'whatsapp_get_profile_picture',
        description: 'Get contact profile picture',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            jid: { type: 'string', description: 'Contact JID' },
          },
          required: ['account_id', 'jid'],
        },
      },
      {
        name: 'whatsapp_search_contacts',
        description: 'Search contacts',
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
      {
        name: 'whatsapp_count_contacts',
        description: 'Count total contacts',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
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
        case 'whatsapp_get_contacts': {
          const { account_id, limit, offset, search } = getContactsSchema.parse(args);
          const contacts = await getContacts(account_id, limit, offset, search);
          return { content: [{ type: 'text', text: JSON.stringify(contacts, null, 2) }] };
        }

        case 'whatsapp_get_contact': {
          const { account_id, jid } = getContactSchema.parse(args);
          const contact = await getContact(account_id, jid);
          if (!contact) {
            throw new AppError(ERROR_CODES.WA_INVALID_JID, 'Contact not found');
          }
          return { content: [{ type: 'text', text: JSON.stringify(contact, null, 2) }] };
        }

        case 'whatsapp_check_number': {
          const { account_id, phone_number } = checkNumberSchema.parse(args);
          const result = await checkNumber(account_id, phone_number);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'whatsapp_get_profile_picture': {
          const { account_id, jid } = getProfileSchema.parse(args);
          const url = await getProfilePicture(account_id, jid);
          return { content: [{ type: 'text', text: JSON.stringify({ jid, profile_picture_url: url }, null, 2) }] };
        }

        case 'whatsapp_search_contacts': {
          const { account_id, query, limit } = getContactSchema.extend({ query: z.string(), limit: z.number().default(50) }).parse(args);
          const contacts = await searchContacts(account_id, query, limit);
          return { content: [{ type: 'text', text: JSON.stringify(contacts, null, 2) }] };
        }

        case 'whatsapp_count_contacts': {
          const { account_id } = getContactSchema.omit({ jid: true }).parse(args);
          const count = await countContacts(account_id);
          return { content: [{ type: 'text', text: JSON.stringify({ account_id, count }, null, 2) }] };
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