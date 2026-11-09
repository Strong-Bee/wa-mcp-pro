---
name: mcp-server-engineering
description: MCP Server development - tools, resources, prompts, STDIO and Streamable HTTP transports
category: development
version: 1.0.0
author: WA-MCP Pro Team
tags: [mcp, model-context-protocol, tools, resources, prompts, transports]
---

# MCP Server Engineering Skill

## Purpose
Guide for developing and maintaining the MCP (Model Context Protocol) server in WA-MCP Pro.

## When to Use
- Adding new MCP tools
- Creating MCP resources
- Defining MCP prompts
- Working with STDIO transport
- Working with Streamable HTTP transport
- Debugging MCP protocol issues

## Architecture

### Server Core (`src/mcp/server.ts`)
- Creates MCP Server with capabilities: tools, resources, prompts
- Registers all tools, resources, prompts
- Handles errors and shutdown

### Tool Registry (`src/mcp/tool-registry.ts`)
- Central registration point for all tools
- Imports and registers tool modules

### Tools (`src/mcp/tools/`)
Each tool file exports a `registerXxxTools(server)` function:
- `connection.tools.ts` - Account management
- `messaging.tools.ts` - Message sending
- `contacts.tools.ts` - Contact operations
- `groups.tools.ts` - Group management
- `chats.tools.ts` - Chat operations
- `media.tools.ts` - Media handling
- `automation.tools.ts` - Automation rules
- `system.tools.ts` - Health, metrics, version

### Resources (`src/mcp/resource-registry.ts`)
- `whatsapp://system/status` - System health
- `whatsapp://accounts` - All accounts
- `whatsapp://accounts/{id}/status` - Account status
- `whatsapp://accounts/{id}/contacts` - Contacts
- `whatsapp://accounts/{id}/chats` - Chats
- `whatsapp://accounts/{id}/groups` - Groups
- `whatsapp://accounts/{id}/automations` - Automations
- `whatsapp://accounts/{id}/metrics` - Metrics

### Prompts (`src/mcp/prompt-registry.ts`)
- `whatsapp_assistant` - General assistant
- `whatsapp_message_composer` - Message composition
- `whatsapp_chat_summarizer` - Chat summarization
- `whatsapp_customer_support` - Support workflow
- `whatsapp_group_assistant` - Group management

### Transports
- `src/mcp/transports/stdio.ts` - STDIO for local clients
- `src/mcp/transports/streamable-http.ts` - HTTP for remote clients

## Creating a New Tool

```typescript
// src/mcp/tools/my.tools.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { getLogger } from '../../core/logger.js';
import { myService } from '../../services/my.service.js';

const mySchema = z.object({
  param1: z.string(),
  param2: z.number().optional(),
});

export function registerMyTools(server: Server): void {
  server.setRequestHandler('tools/list', async () => ({
    tools: [{
      name: 'my_tool',
      description: 'Description of what this tool does',
      inputSchema: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'Parameter 1' },
          param2: { type: 'number', description: 'Optional parameter 2' },
        },
        required: ['param1'],
      },
    }],
  }));

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'my_tool') {
      const { param1, param2 } = mySchema.parse(args);
      const result = await myService.doSomething(param1, param2);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  });
}
```

## Important Notes

### STDIO Transport
- **Never log to stdout** - It breaks the MCP protocol
- Use stderr or structured logger for diagnostics
- `console.log()` will corrupt the communication channel

### Input Validation
- Always use Zod schemas for tool inputs
- Validate at the tool handler level
- Return structured error responses

### Error Handling
- Use AppError classes from `src/core/errors.ts`
- Include correlation IDs for tracing
- Sanitize error responses (no stack traces to clients)

### Async Operations
- All tool handlers are async
- Use proper await for service calls
- Handle timeouts appropriately

## Testing Tools

```typescript
import { createMCPServer } from '../../src/mcp/server.js';

describe('MCP Tools', () => {
  it('should register my_tool', async () => {
    const server = createMCPServer();
    // Verify tool registration
  });

  it('should execute my_tool', async () => {
    // Test tool execution via server
  });
});
```

## Client Configuration Examples

### Claude Code (STDIO)
```json
{
  "mcpServers": {
    "wa-mcp-pro": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "DATABASE_URL": "./storage/wa-mcp.db"
      }
    }
  }
}
```

### Remote HTTP
```json
{
  "mcpServers": {
    "wa-mcp-pro": {
      "url": "http://localhost:3001/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

## References

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [WA-MCP Architecture](../docs/ARCHITECTURE.md)