import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getLogger } from '../../core/logger.js';
import {
  getGroups,
  getGroup,
  getGroupParticipants,
  createGroup,
  addGroupParticipants,
  removeGroupParticipants,
  promoteGroupParticipants,
  demoteGroupParticipants,
  updateGroupSubject,
  updateGroupDescription,
  getGroupInviteCode,
  revokeGroupInviteCode,
  leaveGroup,
  countGroups,
} from '../../whatsapp/group-service.js';
import { AppError, ERROR_CODES } from '../../core/errors.js';
import { requireGroupsRead } from '../middleware/authorization.js';

const logger = getLogger().child({ component: 'GroupRoutes' });

const groupParamsSchema = z.object({
  group_jid: z.string().min(1),
});

const participantsSchema = z.object({
  participants: z.array(z.string()).min(1),
});

const createGroupSchema = z.object({
  subject: z.string().min(1).max(255),
  participants: z.array(z.string()).min(1),
});

const updateSubjectSchema = z.object({
  subject: z.string().min(1).max(255),
});

const updateDescriptionSchema = z.object({
  description: z.string(),
});

export async function groupRoutes(app: FastifyInstance): Promise<void> {
  app.get('/groups', {
    preHandler: requireGroupsRead,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
        },
      },
    },
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { limit, offset } = z.object({ limit: z.number().default(50), offset: z.number().default(0) }).parse(request.query);
    const groups = await getGroups(account_id, limit, offset);
    return { groups };
  });

  app.get('/groups/:group_jid', {
    preHandler: requireGroupsRead,
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { group_jid } = groupParamsSchema.parse(request.params);
    const group = await getGroup(account_id, group_jid);
    if (!group) {
      throw new AppError(ERROR_CODES.WA_INVALID_JID, 'Group not found', 404);
    }
    return group;
  });

  app.get('/groups/:group_jid/members', {
    preHandler: requireGroupsRead,
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { group_jid } = groupParamsSchema.parse(request.params);
    const participants = await getGroupParticipants(account_id, group_jid);
    return { participants };
  });

  app.post('/groups', {
    preHandler: requireGroupsRead,
    schema: {
      body: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          participants: { type: 'array', items: { type: 'string' } },
        },
        required: ['subject', 'participants'],
      },
    },
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { subject, participants } = createGroupSchema.parse(request.body);
    const groupId = await createGroup(account_id, subject, participants);
    return { group_id: groupId };
  });

  app.post('/groups/:group_jid/participants/add', {
    preHandler: requireGroupsRead,
    schema: {
      body: {
        type: 'object',
        properties: {
          participants: { type: 'array', items: { type: 'string' } },
        },
        required: ['participants'],
      },
    },
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { group_jid } = groupParamsSchema.parse(request.params);
    const { participants } = participantsSchema.parse(request.body);
    await addGroupParticipants(account_id, group_jid, participants);
    return { success: true };
  });

  app.post('/groups/:group_jid/participants/remove', {
    preHandler: requireGroupsRead,
    schema: {
      body: {
        type: 'object',
        properties: {
          participants: { type: 'array', items: { type: 'string' } },
        },
        required: ['participants'],
      },
    },
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { group_jid } = groupParamsSchema.parse(request.params);
    const { participants } = participantsSchema.parse(request.body);
    await removeGroupParticipants(account_id, group_jid, participants);
    return { success: true };
  });

  app.post('/groups/:group_jid/participants/promote', {
    preHandler: requireGroupsRead,
    schema: {
      body: {
        type: 'object',
        properties: {
          participants: { type: 'array', items: { type: 'string' } },
        },
        required: ['participants'],
      },
    },
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { group_jid } = groupParamsSchema.parse(request.params);
    const { participants } = participantsSchema.parse(request.body);
    await promoteGroupParticipants(account_id, group_jid, participants);
    return { success: true };
  });

  app.post('/groups/:group_jid/participants/demote', {
    preHandler: requireGroupsRead,
    schema: {
      body: {
        type: 'object',
        properties: {
          participants: { type: 'array', items: { type: 'string' } },
        },
        required: ['participants'],
      },
    },
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { group_jid } = groupParamsSchema.parse(request.params);
    const { participants } = participantsSchema.parse(request.body);
    await demoteGroupParticipants(account_id, group_jid, participants);
    return { success: true };
  });

  app.patch('/groups/:group_jid/subject', {
    preHandler: requireGroupsRead,
    schema: {
      body: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
        },
        required: ['subject'],
      },
    },
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { group_jid } = groupParamsSchema.parse(request.params);
    const { subject } = updateSubjectSchema.parse(request.body);
    await updateGroupSubject(account_id, group_jid, subject);
    return { success: true };
  });

  app.patch('/groups/:group_jid/description', {
    preHandler: requireGroupsRead,
    schema: {
      body: {
        type: 'object',
        properties: {
          description: { type: 'string' },
        },
        required: ['description'],
      },
    },
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { group_jid } = groupParamsSchema.parse(request.params);
    const { description } = updateDescriptionSchema.parse(request.body);
    await updateGroupDescription(account_id, group_jid, description);
    return { success: true };
  });

  app.get('/groups/:group_jid/invite', {
    preHandler: requireGroupsRead,
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { group_jid } = groupParamsSchema.parse(request.params);
    const code = await getGroupInviteCode(account_id, group_jid);
    return { invite_code: code };
  });

  app.post('/groups/:group_jid/invite/revoke', {
    preHandler: requireGroupsRead,
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { group_jid } = groupParamsSchema.parse(request.params);
    const code = await revokeGroupInviteCode(account_id, group_jid);
    return { invite_code: code };
  });

  app.post('/groups/:group_jid/leave', {
    preHandler: requireGroupsRead,
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const { group_jid } = groupParamsSchema.parse(request.params);
    await leaveGroup(account_id, group_jid);
    return { success: true };
  });

  app.get('/groups/count', {
    preHandler: requireGroupsRead,
  }, async (request, reply) => {
    const account_id = (request as any).apiKey?.accountId || 'default';
    const count = await countGroups(account_id);
    return { account_id, count };
  });

  logger.info('Group routes registered');
}