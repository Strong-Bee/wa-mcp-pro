import { FastifyInstance } from 'fastify';
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
  deleteAccount,
} from '../../whatsapp/connection-manager.js';
import { AppError, ERROR_CODES } from '../../core/errors.js';
import {
  requireAccountsRead,
  requireAccountsManage,
} from '../middleware/authorization.js';

const logger = getLogger().child({ component: 'ConnectionRoutes' });

const createAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  phone_number: z.string().optional(),
});

const accountIdSchema = z.object({
  id: z.string().uuid(),
});

const pairingCodeSchema = z.object({
  phone_number: z.string().min(10),
});

export async function connectionRoutes(app: FastifyInstance): Promise<void> {
  app.post('/accounts', {
    preHandler: requireAccountsManage,
    schema: {
      body: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          phone_number: { type: 'string' },
        },
        required: ['id', 'name'],
      },
    },
  }, async (request, reply) => {
    const { id, name, phone_number } = createAccountSchema.parse(request.body);
    await createAccount({ id, name, phoneNumber: phone_number });
    return reply.status(201).send({ id, name, phone_number, status: 'disconnected' });
  });

  app.get('/accounts', {
    preHandler: requireAccountsRead,
  }, async (request, reply) => {
    const accounts = await listAccounts();
    return accounts;
  });

  app.get('/accounts/:id', {
    preHandler: requireAccountsRead,
  }, async (request, reply) => {
    const { id } = accountIdSchema.parse(request.params);
    const account = await getAccount(id);
    if (!account) {
      throw new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Account not found', 404);
    }
    return account;
  });

  app.post('/accounts/:id/connect', {
    preHandler: requireAccountsManage,
  }, async (request, reply) => {
    const { id } = accountIdSchema.parse(request.params);
    await connectAccount(id);
    return { message: `Account ${id} connection initiated` };
  });

  app.get('/accounts/:id/status', {
    preHandler: requireAccountsRead,
  }, async (request, reply) => {
    const { id } = accountIdSchema.parse(request.params);
    const status = getAccountStatus(id);
    return { account_id: id, status };
  });

  app.get('/accounts/:id/qr', {
    preHandler: requireAccountsRead,
  }, async (request, reply) => {
    const { id } = accountIdSchema.parse(request.params);
    const qr = getAccountQR(id);
    if (!qr) {
      throw new AppError(ERROR_CODES.WA_AUTH_REQUIRED, 'No QR code available');
    }
    return { qr };
  });

  app.post('/accounts/:id/pairing-code', {
    preHandler: requireAccountsManage,
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
    const { id } = accountIdSchema.parse(request.params);
    const { phone_number } = pairingCodeSchema.parse(request.body);
    const code = await getAccountPairingCode(id, phone_number);
    return { code };
  });

  app.post('/accounts/:id/disconnect', {
    preHandler: requireAccountsManage,
  }, async (request, reply) => {
    const { id } = accountIdSchema.parse(request.params);
    await disconnectAccountSafe(id);
    return { message: `Account ${id} disconnected` };
  });

  app.post('/accounts/:id/logout', {
    preHandler: requireAccountsManage,
  }, async (request, reply) => {
    const { id } = accountIdSchema.parse(request.params);
    await logoutAccountSafe(id);
    return { message: `Account ${id} logged out` };
  });

  app.post('/accounts/:id/reconnect', {
    preHandler: requireAccountsManage,
  }, async (request, reply) => {
    const { id } = accountIdSchema.parse(request.params);
    await disconnectAccountSafe(id);
    await connectAccount(id);
    return { message: `Account ${id} reconnect initiated` };
  });

  app.delete('/accounts/:id', {
    preHandler: requireAccountsManage,
  }, async (request, reply) => {
    const { id } = accountIdSchema.parse(request.params);
    await deleteAccount(id);
    return { message: `Account ${id} deleted` };
  });

  logger.info('Connection routes registered');
}