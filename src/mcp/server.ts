import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerTools } from './tool-registry.js';
import { registerResources } from './resource-registry.js';
import { registerPrompts } from './prompt-registry.js';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'MCPServer' });

export async function createMCPServer(): Promise<Server> {
  const server = new Server(
    {
      name: 'wa-mcp-pro',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  await registerTools(server);
  registerResources(server);
  registerPrompts(server);

  server.onerror = (error) => {
    logger.error({ error }, 'MCP Server error');
  };

  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  return server;
}