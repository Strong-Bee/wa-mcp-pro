import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMCPServer } from '../server.js';
import { getLogger } from '../../core/logger.js';
import { getConfig } from '../../config/env.js';

const logger = getLogger().child({ component: 'StreamableHTTPTransport' });

export async function createStreamableHTTPTransport(): Promise<StreamableHTTPServerTransport> {
  const config = getConfig();

  const server = createMCPServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    enableJsonResponse: true,
  });

  await server.connect(transport);

  logger.info({ port: config.MCP_HTTP_PORT }, 'MCP Streamable HTTP transport created');

  return transport;
}

export { StreamableHTTPServerTransport };