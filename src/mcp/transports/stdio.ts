import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../server.js';
import { getLogger } from '../../core/logger.js';

const logger = getLogger().child({ component: 'STDITransport' });

export async function startSTDIOTransport(): Promise<void> {
  logger.info('Starting MCP STDIO transport');

  const server = await createMCPServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  logger.info('MCP STDIO transport started');
}

export { StdioServerTransport };