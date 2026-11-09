import type { ToolModuleServer } from '../tool-module.js';
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

const logger = getLogger().child({ component: 'GroupTools' });

const baseAccountSchema = z.object({
  account_id: z.string().uuid(),
});

const groupJidSchema = baseAccountSchema.extend({
  group_jid: z.string().min(1),
});

const participantsSchema = groupJidSchema.extend({
  participants: z.array(z.string()).min(1),
});

const createGroupSchema = baseAccountSchema.extend({
  subject: z.string().min(1).max(255),
  participants: z.array(z.string()).min(1),
});

const updateSubjectSchema = groupJidSchema.extend({
  subject: z.string().min(1).max(255),
});

const updateDescriptionSchema = groupJidSchema.extend({
  description: z.string(),
});

export function registerGroupTools(server: ToolModuleServer): void {
  server.setRequestHandler('tools/list', async () => ({
    tools: [
      {
        name: 'whatsapp_get_groups',
        description: 'Get list of groups',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'whatsapp_get_group_info',
        description: 'Get group information',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            group_jid: { type: 'string' },
          },
          required: ['account_id', 'group_jid'],
        },
      },
      {
        name: 'whatsapp_get_group_members',
        description: 'Get group participants',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            group_jid: { type: 'string' },
          },
          required: ['account_id', 'group_jid'],
        },
      },
      {
        name: 'whatsapp_create_group',
        description: 'Create a new group',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            subject: { type: 'string' },
            participants: { type: 'array', items: { type: 'string' } },
          },
          required: ['account_id', 'subject', 'participants'],
        },
      },
      {
        name: 'whatsapp_add_group_participant',
        description: 'Add participants to group',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            group_jid: { type: 'string' },
            participants: { type: 'array', items: { type: 'string' } },
          },
          required: ['account_id', 'group_jid', 'participants'],
        },
      },
      {
        name: 'whatsapp_remove_group_participant',
        description: 'Remove participants from group',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            group_jid: { type: 'string' },
            participants: { type: 'array', items: { type: 'string' } },
          },
          required: ['account_id', 'group_jid', 'participants'],
        },
      },
      {
        name: 'whatsapp_promote_group_participant',
        description: 'Promote participants to admin',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            group_jid: { type: 'string' },
            participants: { type: 'array', items: { type: 'string' } },
          },
          required: ['account_id', 'group_jid', 'participants'],
        },
      },
      {
        name: 'whatsapp_demote_group_participant',
        description: 'Demote participants from admin',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            group_jid: { type: 'string' },
            participants: { type: 'array', items: { type: 'string' } },
          },
          required: ['account_id', 'group_jid', 'participants'],
        },
      },
      {
        name: 'whatsapp_update_group_subject',
        description: 'Update group subject',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            group_jid: { type: 'string' },
            subject: { type: 'string' },
          },
          required: ['account_id', 'group_jid', 'subject'],
        },
      },
      {
        name: 'whatsapp_update_group_description',
        description: 'Update group description',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            group_jid: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['account_id', 'group_jid', 'description'],
        },
      },
      {
        name: 'whatsapp_get_group_invite',
        description: 'Get group invite code',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            group_jid: { type: 'string' },
          },
          required: ['account_id', 'group_jid'],
        },
      },
      {
        name: 'whatsapp_revoke_group_invite',
        description: 'Revoke group invite code',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            group_jid: { type: 'string' },
          },
          required: ['account_id', 'group_jid'],
        },
      },
      {
        name: 'whatsapp_leave_group',
        description: 'Leave a group',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', format: 'uuid' },
            group_jid: { type: 'string' },
          },
          required: ['account_id', 'group_jid'],
        },
      },
      {
        name: 'whatsapp_count_groups',
        description: 'Count total groups',
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
        case 'whatsapp_get_groups': {
          const { account_id, limit, offset } = baseAccountSchema.extend({ limit: z.number().default(50), offset: z.number().default(0) }).parse(args);
          const groups = await getGroups(account_id, limit, offset);
          return { content: [{ type: 'text', text: JSON.stringify(groups, null, 2) }] };
        }

        case 'whatsapp_get_group_info': {
          const { account_id, group_jid } = groupJidSchema.parse(args);
          const group = await getGroup(account_id, group_jid);
          if (!group) {
            throw new AppError(ERROR_CODES.WA_INVALID_JID, 'Group not found');
          }
          return { content: [{ type: 'text', text: JSON.stringify(group, null, 2) }] };
        }

        case 'whatsapp_get_group_members': {
          const { account_id, group_jid } = groupJidSchema.parse(args);
          const participants = await getGroupParticipants(account_id, group_jid);
          return { content: [{ type: 'text', text: JSON.stringify(participants, null, 2) }] };
        }

        case 'whatsapp_create_group': {
          const { account_id, subject, participants } = createGroupSchema.parse(args);
          const groupId = await createGroup(account_id, subject, participants);
          return { content: [{ type: 'text', text: JSON.stringify({ group_id: groupId }, null, 2) }] };
        }

        case 'whatsapp_add_group_participant': {
          const { account_id, group_jid, participants } = participantsSchema.parse(args);
          await addGroupParticipants(account_id, group_jid, participants);
          return { content: [{ type: 'text', text: 'Participants added' }] };
        }

        case 'whatsapp_remove_group_participant': {
          const { account_id, group_jid, participants } = participantsSchema.parse(args);
          await removeGroupParticipants(account_id, group_jid, participants);
          return { content: [{ type: 'text', text: 'Participants removed' }] };
        }

        case 'whatsapp_promote_group_participant': {
          const { account_id, group_jid, participants } = participantsSchema.parse(args);
          await promoteGroupParticipants(account_id, group_jid, participants);
          return { content: [{ type: 'text', text: 'Participants promoted' }] };
        }

        case 'whatsapp_demote_group_participant': {
          const { account_id, group_jid, participants } = participantsSchema.parse(args);
          await demoteGroupParticipants(account_id, group_jid, participants);
          return { content: [{ type: 'text', text: 'Participants demoted' }] };
        }

        case 'whatsapp_update_group_subject': {
          const { account_id, group_jid, subject } = updateSubjectSchema.parse(args);
          await updateGroupSubject(account_id, group_jid, subject);
          return { content: [{ type: 'text', text: 'Group subject updated' }] };
        }

        case 'whatsapp_update_group_description': {
          const { account_id, group_jid, description } = updateDescriptionSchema.parse(args);
          await updateGroupDescription(account_id, group_jid, description);
          return { content: [{ type: 'text', text: 'Group description updated' }] };
        }

        case 'whatsapp_get_group_invite': {
          const { account_id, group_jid } = groupJidSchema.parse(args);
          const code = await getGroupInviteCode(account_id, group_jid);
          return { content: [{ type: 'text', text: code }] };
        }

        case 'whatsapp_revoke_group_invite': {
          const { account_id, group_jid } = groupJidSchema.parse(args);
          const code = await revokeGroupInviteCode(account_id, group_jid);
          return { content: [{ type: 'text', text: code }] };
        }

        case 'whatsapp_leave_group': {
          const { account_id, group_jid } = groupJidSchema.parse(args);
          await leaveGroup(account_id, group_jid);
          return { content: [{ type: 'text', text: 'Left group' }] };
        }

        case 'whatsapp_count_groups': {
          const { account_id } = baseAccountSchema.parse(args);
          const count = await countGroups(account_id);
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