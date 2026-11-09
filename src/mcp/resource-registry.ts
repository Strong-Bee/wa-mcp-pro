import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getLogger } from '../core/logger.js';
import { listAccounts } from '../whatsapp/connection-manager.js';
import { getDatabase } from '../database/client.js';
import { contacts, chats, groups, messages, automations } from '../database/schema/index.js';
import { eq, and, desc, count } from 'drizzle-orm';
import { getConnectionStatus } from '../whatsapp/baileys-adapter.js';

const logger = getLogger().child({ component: 'ResourceRegistry' });

export function registerResources(server: Server): void {
  logger.info('Registering MCP resources');

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const accounts = await listAccounts();

    const resources = [
      {
        uri: 'whatsapp://system/status',
        name: 'System Status',
        description: 'Current system status and health',
        mimeType: 'application/json',
      },
      {
        uri: 'whatsapp://accounts',
        name: 'All Accounts',
        description: 'List of all WhatsApp accounts',
        mimeType: 'application/json',
      },
    ];

    for (const account of accounts) {
      resources.push(
        {
          uri: `whatsapp://accounts/${account.id}/status`,
          name: `Account Status: ${account.name}`,
          description: `Connection status for account ${account.name}`,
          mimeType: 'application/json',
        },
        {
          uri: `whatsapp://accounts/${account.id}/contacts`,
          name: `Contacts: ${account.name}`,
          description: `Contact list for account ${account.name}`,
          mimeType: 'application/json',
        },
        {
          uri: `whatsapp://accounts/${account.id}/chats`,
          name: `Chats: ${account.name}`,
          description: `Chat list for account ${account.name}`,
          mimeType: 'application/json',
        },
        {
          uri: `whatsapp://accounts/${account.id}/groups`,
          name: `Groups: ${account.name}`,
          description: `Group list for account ${account.name}`,
          mimeType: 'application/json',
        },
        {
          uri: `whatsapp://accounts/${account.id}/automations`,
          name: `Automations: ${account.name}`,
          description: `Automation rules for account ${account.name}`,
          mimeType: 'application/json',
        },
        {
          uri: `whatsapp://accounts/${account.id}/metrics`,
          name: `Metrics: ${account.name}`,
          description: `Message metrics for account ${account.name}`,
          mimeType: 'application/json',
        }
      );
    }

    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (uri === 'whatsapp://system/status') {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }, null, 2),
        }],
      };
    }

    if (uri === 'whatsapp://accounts') {
      const accounts = await listAccounts();
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(accounts, null, 2),
        }],
      };
    }

    const accountMatch = uri.match(/^whatsapp:\/\/accounts\/([^\/]+)\/(.+)$/);
    if (accountMatch) {
      const [, accountId, resource] = accountMatch;
      const db = getDatabase();

      switch (resource) {
        case 'status': {
          const status = getConnectionStatus(accountId);
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ accountId, status }, null, 2),
            }],
          };
        }
        case 'contacts': {
          const contactsList = await db
            .select()
            .from(contacts)
            .where(eq(contacts.accountId, accountId))
            .orderBy(desc(contacts.updatedAt))
            .limit(100);
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(contactsList, null, 2),
            }],
          };
        }
        case 'chats': {
          const chatsList = await db
            .select()
            .from(chats)
            .where(eq(chats.accountId, accountId))
            .orderBy(desc(chats.lastMessageAt))
            .limit(50);
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(chatsList, null, 2),
            }],
          };
        }
        case 'groups': {
          const groupsList = await db
            .select()
            .from(groups)
            .where(eq(groups.accountId, accountId))
            .orderBy(desc(groups.updatedAt))
            .limit(50);
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(groupsList, null, 2),
            }],
          };
        }
        case 'automations': {
          const automationsList = await db
            .select()
            .from(automations)
            .where(eq(automations.accountId, accountId))
            .orderBy(desc(automations.createdAt));
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(automationsList, null, 2),
            }],
          };
        }
        case 'metrics': {
          const messagesCount = await db
            .select({ count: count() })
            .from(messages)
            .where(eq(messages.accountId, accountId));

          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ accountId, totalMessages: messagesCount[0]?.count ?? 0 }, null, 2),
            }],
          };
        }
      }
    }

    throw new Error(`Resource not found: ${uri}`);
  });

  logger.info('MCP resources registered');
}