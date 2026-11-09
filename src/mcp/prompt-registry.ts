import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { GetPromptRequestSchema, ListPromptsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'PromptRegistry' });

export function registerPrompts(server: Server): void {
  logger.info('Registering MCP prompts');

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'whatsapp_assistant',
          description: 'General WhatsApp assistant for managing conversations',
          arguments: [
            {
              name: 'account_id',
              description: 'WhatsApp account ID to use',
              required: true,
            },
            {
              name: 'task',
              description: 'Task to perform (send_message, read_chats, search_contacts, etc.)',
              required: true,
            },
          ],
        },
        {
          name: 'whatsapp_message_composer',
          description: 'Compose WhatsApp messages with proper formatting',
          arguments: [
            {
              name: 'recipient',
              description: 'Recipient phone number or JID',
              required: true,
            },
            {
              name: 'message_type',
              description: 'Type of message (text, image, document, etc.)',
              required: true,
            },
            {
              name: 'content',
              description: 'Message content or media path',
              required: true,
            },
          ],
        },
        {
          name: 'whatsapp_chat_summarizer',
          description: 'Summarize WhatsApp chat history',
          arguments: [
            {
              name: 'account_id',
              description: 'WhatsApp account ID',
              required: true,
            },
            {
              name: 'chat_jid',
              description: 'Chat JID to summarize',
              required: true,
            },
            {
              name: 'message_limit',
              description: 'Number of messages to include in summary',
              required: false,
            },
          ],
        },
        {
          name: 'whatsapp_customer_support',
          description: 'Customer support workflow for WhatsApp',
          arguments: [
            {
              name: 'account_id',
              description: 'WhatsApp account ID',
              required: true,
            },
            {
              name: 'incoming_message',
              description: 'Incoming customer message',
              required: true,
            },
          ],
        },
        {
          name: 'whatsapp_group_assistant',
          description: 'Manage WhatsApp groups',
          arguments: [
            {
              name: 'account_id',
              description: 'WhatsApp account ID',
              required: true,
            },
            {
              name: 'group_jid',
              description: 'Group JID',
              required: true,
            },
            {
              name: 'action',
              description: 'Action to perform (info, add_member, remove_member, promote, demote, update_subject)',
              required: true,
            },
          ],
        },
      ],
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'whatsapp_assistant':
        return {
          description: 'WhatsApp Assistant',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are a WhatsApp assistant for account ${args?.account_id}. Help the user with task: ${args?.task}. Use the available MCP tools to perform WhatsApp operations.`,
              },
            },
          ],
        };

      case 'whatsapp_message_composer':
        return {
          description: 'Compose WhatsApp Message',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Compose a ${args?.message_type} message for ${args?.recipient} with content: ${args?.content}. Use the appropriate MCP tool to send it.`,
              },
            },
          ],
        };

      case 'whatsapp_chat_summarizer':
        return {
          description: 'Summarize WhatsApp Chat',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Summarize the chat ${args?.chat_jid} for account ${args?.account_id}. Fetch the last ${args?.message_limit || 50} messages and provide a concise summary of the conversation.`,
              },
            },
          ],
        };

      case 'whatsapp_customer_support':
        return {
          description: 'Customer Support Assistant',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are a customer support agent for WhatsApp account ${args?.account_id}. An incoming message: "${args?.incoming_message}". Analyze the message, check if there are any automation rules that match, and suggest an appropriate response. If no automation matches, draft a professional response.`,
              },
            },
          ],
        };

      case 'whatsapp_group_assistant':
        return {
          description: 'Group Management Assistant',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Manage group ${args?.group_jid} for account ${args?.account_id}. Action: ${args?.action}. Use the appropriate MCP tools to perform this group management task.`,
              },
            },
          ],
        };

      default:
        throw new Error(`Prompt not found: ${name}`);
    }
  });

  logger.info('MCP prompts registered');
}