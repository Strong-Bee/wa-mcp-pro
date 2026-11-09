import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getLogger } from '../core/logger.js';
import type { ToolModuleHandler, ToolModuleServer } from './tool-module.js';
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

export async function registerTools(server: Server): Promise<void> {
  const listHandlers: ToolModuleHandler[] = [];
  const callHandlers: ToolModuleHandler[] = [];

  const moduleServer: ToolModuleServer = {
    setRequestHandler(method, handler) {
      if (method === 'tools/list') {
        listHandlers.push(handler);
        return;
      }
      callHandlers.push(handler);
    },
  };

  registerConnectionTools(moduleServer);
  registerMessagingTools(moduleServer);
  registerContactTools(moduleServer);
  registerGroupTools(moduleServer);
  registerChatTools(moduleServer);
  registerMediaTools(moduleServer);
  registerAutomationTools(moduleServer);
  registerSystemTools(moduleServer);

  if (listHandlers.length !== callHandlers.length) {
    throw new Error('MCP tool modules must register one tools/list and one tools/call handler each');
  }

  const moduleDefinitions = await Promise.all(listHandlers.map((handler) => handler({})));
  const tools = moduleDefinitions.flatMap((result) => result.tools ?? []);
  const handlersByName = new Map<string, ToolModuleHandler>();

  for (let index = 0; index < moduleDefinitions.length; index += 1) {
    for (const tool of moduleDefinitions[index]?.tools ?? []) {
      if (handlersByName.has(tool.name)) {
        throw new Error(`Duplicate MCP tool name registered: ${tool.name}`);
      }
      const handler = callHandlers[index];
      if (!handler) {
        throw new Error(`Missing MCP call handler for tool: ${tool.name}`);
      }
      handlersByName.set(tool.name, handler);
    }
  }

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const handler = handlersByName.get(request.params.name);
    if (!handler) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }
    return handler(request);
  });

  logger.info({ toolCount: tools.length, moduleCount: listHandlers.length }, 'MCP tools registered');
}