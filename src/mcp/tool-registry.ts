import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getLogger } from '../core/logger.js';
import {
  registerConnectionTools,
  registerMessagingTools,
  registerContactTools,
  registerGroupTools,
  registerChatTools,
  registerMediaTools,
  registerAutomationTools,
  registerSystemTools,
} from './tools/index.js';

const logger = getLogger().child({ component: 'ToolRegistry' });

export function registerTools(server: Server): void {
  logger.info('Registering MCP tools');

  registerConnectionTools(server);
  registerMessagingTools(server);
  registerContactTools(server);
  registerGroupTools(server);
  registerChatTools(server);
  registerMediaTools(server);
  registerAutomationTools(server);
  registerSystemTools(server);

  logger.info('All MCP tools registered');
}