import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getLogger } from '../../core/logger.js';
import {
  createAccount,
  connectAccount,
  disconnectAccountSafe,
  logoutAccountSafe,
  getAccountStatus,
  getAccountQR,
  getAccountPairingCode,
  listAccounts,
  getAccount,
} from '../../whatsapp/connection-manager.js';
import { AppError, ERROR_CODES } from '../../core/errors.js';

const logger = getLogger().child({ component: 'ConnectionTools' });

const connectSchema = z.object({
  account_id: z.string().uuid(),
});

const disconnectSchema = z.object({
  account_id: z.string().uuid(),
});

const logoutSchema = z.object({
  account_id: z.string().uuid(),
});

const getQRSchema = z.object({
  account_id: z.string().uuid(),
});

const getPairingCodeSchema = z.object({
  account_id: z.string().uuid(),
  phone_number: z.string().min(10),
});

const createAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  phone_number: z.string().optional(),
});

export function registerConnectionTools(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'whatsapp_connect',
        description: 'Connect a WhatsApp account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid', description: 'Account ID to connect' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'whatsapp_disconnect',
        description: 'Disconnect a WhatsApp account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid', description: 'Account ID to disconnect' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'whatsapp_logout',
        description: 'Logout a WhatsApp account (removes session)',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid', description: 'Account ID to logout' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'whatsapp_get_status',
        description: 'Get connection status of an account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid', description: 'Account ID' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'whatsapp_get_qr',
        description: 'Get QR code for authentication',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid', description: 'Account ID' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'whatsapp_get_pairing_code',
        description: 'Get pairing code for authentication',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid', description: 'Account ID' },
            phone_number: { type: 'string', description: 'Phone number in international format' },
          },
          required: ['account_id', 'phone_number'],
        },
      },
      {
        name: 'whatsapp_list_accounts',
        description: 'List all WhatsApp accounts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'whatsapp_create_account',
        description: 'Create a new WhatsApp account',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Account ID' },
            name: { type: 'string', description: 'Account name' },
            phone_number: { type: 'string', description: 'Phone number (optional)' },
          },
          required: ['id', 'name'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'whatsapp_connect': {
          const { account_id } = connectSchema.parse(args);
          await connectAccount(account_id);
          return { content: [{ type: 'text', text: `Account ${account_id} connection initiated` }] };
        }

        case 'whatsapp_disconnect': {
          const { account_id } = disconnectSchema.parse(args);
          await disconnectAccountSafe(account_id);
          return { content: [{ type: 'text', text: `Account ${account_id} disconnected` }] };
        }

        case 'whatsapp_logout': {
          const { account_id } = logoutSchema.parse(args);
          await logoutAccountSafe(account_id);
          return { content: [{ type: 'text', text: `Account ${account_id} logged out` }] };
        }

        case 'whatsapp_get_status': {
          const { account_id } = connectSchema.parse(args);
          const status = getAccountStatus(account_id);
          return { content: [{ type: 'text', text: JSON.stringify({ account_id, status }, null, 2) }] };
        }

        case 'whatsapp_get_qr': {
          const { account_id } = getQRSchema.parse(args);
          const qr = getAccountQR(account_id);
          if (!qr) {
            throw new AppError(ERROR_CODES.WA_AUTH_REQUIRED, 'No QR code available. Account may already be connected or connecting.');
          }
          return { content: [{ type: 'text', text: qr }] };
        }

        case 'whatsapp_get_pairing_code': {
          const { account_id, phone_number } = getPairingCodeSchema.parse(args);
          const code = await getAccountPairingCode(account_id, phone_number);
          return { content: [{ type: 'text', text: code }] };
        }

        case 'whatsapp_list_accounts': {
          const accounts = await listAccounts();
          return { content: [{ type: 'text', text: JSON.stringify(accounts, null, 2) }] };
        }

        case 'whatsapp_create_account': {
          const { id, name, phone_number } = createAccountSchema.parse(args);
          await createAccount({ id, name, phoneNumber: phone_number });
          return { content: [{ type: 'text', text: `Account ${name} (${id}) created` }] };
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