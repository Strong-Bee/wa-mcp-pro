![WA-MCP Pro logo](./public/01-primary-logo.png)

# WA-MCP Pro

**Connect WhatsApp to Your AI Agents.**

WA-MCP Pro is a WhatsApp integration server built with [Baileys](https://github.com/WhiskeySockets/Baileys) and the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). It exposes WhatsApp account, messaging, contact, chat, group, and automation capabilities to compatible AI clients through MCP, with an accompanying REST API.

> **Project status:** This repository is under active development. Review the current implementation and test it in a non-critical environment before using it in production.

## Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Run modes](#run-modes)
- [Connect an MCP client](#connect-an-mcp-client)
- [REST API and OpenAPI](#rest-api-and-openapi)
- [Docker](#docker)
- [Development](#development)
- [Skills](#skills)
- [Security](#security)
- [WhatsApp disclaimer](#whatsapp-disclaimer)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Overview

WA-MCP Pro acts as a bridge between WhatsApp and AI applications. An MCP-compatible client can call the server's registered tools instead of implementing WhatsApp connectivity itself.

The project includes:

- MCP transports for local STDIO and remote Streamable HTTP.
- A Fastify-based REST API.
- WhatsApp connectivity and account/session management through Baileys.
- Local SQLite-compatible storage through `@libsql/client`.
- Messaging, media, contacts, chats, groups, and auto-reply functionality.
- Configuration validation, logging, rate limiting, and API authentication components.

## Features

### MCP and AI integration

- STDIO transport for local MCP clients.
- Streamable HTTP transport for remote MCP access.
- MCP tools organized by connection, messaging, contacts, groups, chats, media, automation, and system operations.

### WhatsApp connectivity

- QR-code and pairing-code connection flows.
- Multiple account records.
- Persistent session storage.
- Connection status and reconnection handling.

### Messaging and chat operations

- Send and manage supported message types.
- Work with contacts and chat history.
- Retrieve chat and account information.
- Manage WhatsApp groups and participants.

### Automation

- Keyword, exact-match, regex, command, and scheduled automation patterns are represented in the project database and automation components.
- Auto-reply rules can be managed through the available application interfaces.

### API and operations

- REST API powered by Fastify.
- Health and operational endpoints.
- Request validation and rate limiting.
- Structured application logging.
- Docker build and Compose configuration.

## Architecture

```text
MCP Clients / Applications
          |
          +---------------------+
          |                     |
      MCP STDIO          MCP Streamable HTTP
          |                     |
          +----------+----------+
                     |
                  MCP Core
                     |
             Application Services
        +------------+-------------+
        |            |             |
    WhatsApp       Automation    REST API
    Services        Engine       (Fastify)
        |
   Baileys Client
        |
     WhatsApp

       SQLite-compatible storage
       Session / Media / Log files
```

## Requirements

- Node.js 20 or newer.
- pnpm 9 or newer (the repository declares pnpm 9 as its package manager).
- A WhatsApp account for connecting and testing.
- Docker Engine and Docker Compose (optional, for container deployment).

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/Strong-Bee/wa-mcp-pro.git
cd wa-mcp-pro
```

### 2. Install dependencies

```bash
corepack enable
pnpm install
```

### 3. Create your environment file

On macOS/Linux:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 4. Configure security keys

Generate two independent 32-byte (64-character hexadecimal) secrets. For example, with OpenSSL:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Put the generated values in `.env`:

```dotenv
ENCRYPTION_KEY=your_64_character_hex_secret
API_KEY=your_64_character_hex_secret
```

Do not reuse the same value for both variables. Keep these values private and do not commit your `.env` file.

### 5. Build and initialize the database

```bash
pnpm build
pnpm db:migrate
pnpm db:seed
```

The application startup flow also runs migrations and database seeding. The explicit commands above are useful when preparing or inspecting the database separately.

### 6. Start the server

For local development:

```bash
pnpm dev
```

For a compiled build:

```bash
pnpm start
```

The default MCP transport is `stdio`. The REST API listens on `http://127.0.0.1:3000` by default.

## Configuration

All supported environment variables are defined and validated in `src/config/env.ts`. The complete template is available in [`.env.example`](.env.example).

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Runtime environment: development, production, or test | `development` |
| `APP_NAME` | Application name | `WA-MCP-Pro` |
| `APP_VERSION` | Application version | `1.0.0` |
| `HOST` | REST API bind address | `127.0.0.1` |
| `PORT` | REST API port | `3000` |
| `MCP_TRANSPORT` | MCP transport: `stdio`, `http`, or `hybrid` | `stdio` |
| `MCP_HTTP_ENABLED` | HTTP transport configuration flag | `false` |
| `MCP_HTTP_PORT` | MCP HTTP port setting | `3001` |
| `DATABASE_URL` | Database location | `./storage/wa-mcp.db` |
| `SESSION_DIRECTORY` | WhatsApp session directory | `./storage/sessions` |
| `MEDIA_DIRECTORY` | Media storage directory | `./storage/media` |
| `LOG_DIRECTORY` | Log directory | `./storage/logs` |
| `ENCRYPTION_KEY` | Secret used for session encryption; at least 64 characters | Not set |
| `API_KEY` | API authentication secret; at least 64 characters | Not set |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `RATE_LIMIT_MAX` | Maximum requests in a rate-limit window | `100` |
| `RATE_LIMIT_WINDOW` | Rate-limit window in milliseconds | `60000` |
| `MAX_MEDIA_SIZE_MB` | Maximum media size in MB | `50` |
| `WHATSAPP_AUTO_RECONNECT` | Enable automatic reconnection | `true` |
| `WHATSAPP_RECONNECT_MAX_ATTEMPTS` | Maximum reconnection attempts | `10` |
| `WHATSAPP_MESSAGE_HISTORY_LIMIT` | Message history limit | `10000` |

> The configuration schema treats `ENCRYPTION_KEY` and `API_KEY` as optional values, but features that depend on them may require valid secrets. Set both explicitly for a secured deployment.

## Run modes

Set `MCP_TRANSPORT` in `.env` to select the MCP mode:

| Value | Behavior |
|---|---|
| `stdio` | Starts the local STDIO MCP transport. |
| `http` | Starts the Streamable HTTP MCP transport. |
| `hybrid` | Starts both MCP transports. |

The REST API is started by the application as well. The HTTP MCP endpoint is mounted at:

```text
http://127.0.0.1:3000/mcp
```

Adjust `HOST`, `PORT`, and `MCP_HTTP_PORT` in `.env` for your deployment. Verify the effective port and authentication behavior against the current server configuration before exposing it outside your machine.

## Connect an MCP client

Build the project first so that `dist/index.js` exists:

```bash
pnpm build
```

### Claude Code or another STDIO-compatible client

Add a server entry to your MCP client configuration. Example:

```json
{
  "mcpServers": {
    "wa-mcp-pro": {
      "command": "node",
      "args": ["D:/mcp/wa-mcp-pro/dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "DATABASE_URL": "D:/mcp/wa-mcp-pro/storage/wa-mcp.db",
        "SESSION_DIRECTORY": "D:/mcp/wa-mcp-pro/storage/sessions",
        "ENCRYPTION_KEY": "YOUR_64_CHARACTER_HEX_SECRET"
      }
    }
  }
}
```

Replace the example paths with the actual absolute paths on your computer. Keep secrets out of shared configuration files and source control. If your MCP client supports environment-variable references, use those instead of hardcoding secrets.

### Remote Streamable HTTP client

Set `MCP_TRANSPORT=http` in the server environment and start WA-MCP Pro. Configure your MCP client to connect to:

```text
http://127.0.0.1:3000/mcp
```

Use the authentication mechanism configured by the server. For remote access, put the service behind HTTPS and a properly configured reverse proxy; do not expose an unauthenticated development instance to the public internet.

## REST API and OpenAPI

The REST API is implemented with Fastify. API routes are registered from `src/api/routes/`.

In non-production mode, the application also registers its OpenAPI documentation. Start the server in development mode and consult the API documentation route configured by the OpenAPI module.

The API includes route groups for the application's account, messaging, contact, chat, group, and automation capabilities. Refer to the implementation in `src/api/routes/` for the current endpoint list and request/response schemas.

## Docker

Build the image:

```bash
docker build -t wa-mcp-pro .
```

Start the Compose deployment:

```bash
docker compose up -d
```

View logs and stop the deployment:

```bash
docker compose logs -f
docker compose down
```

Review the Dockerfile and Compose configuration before deployment. Ensure that required environment variables and persistent storage volumes are configured for your environment.

## Development

Install dependencies:

```bash
pnpm install
```

Available project scripts:

| Command | Purpose |
|---|---|
| `pnpm dev` | Run the TypeScript application in watch mode. |
| `pnpm build` | Compile TypeScript into `dist/`. |
| `pnpm start` | Start the compiled application. |
| `pnpm start:stdio` | Start with the STDIO transport argument. |
| `pnpm start:http` | Start with the HTTP transport argument. |
| `pnpm start:hybrid` | Start with the hybrid transport argument. |
| `pnpm typecheck` | Run TypeScript type checking without emitting files. |
| `pnpm lint` | Run ESLint on TypeScript source files. |
| `pnpm lint:fix` | Apply ESLint fixes where possible. |
| `pnpm format` | Format TypeScript source files. |
| `pnpm format:check` | Check TypeScript formatting. |
| `pnpm test` | Run the Vitest test suite. |
| `pnpm test:watch` | Run Vitest in watch mode. |
| `pnpm test:coverage` | Run tests with coverage. |
| `pnpm db:migrate` | Run database migrations. |
| `pnpm db:seed` | Seed the database. |
| `pnpm db:studio` | Run the database studio script. |
| `pnpm doctor` | Run the project diagnostics script. |
| `pnpm generate:api-key` | Run the API key generation script. |
| `pnpm skills:validate` | Validate the Skills collection. |
| `pnpm skills:list` | List available Skills. |
| `pnpm skills:check` | Check the Skills collection. |

Before submitting changes, run the relevant checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Skills

The repository includes agent-oriented Skills for development and operations. The current collection covers areas such as:

- WA-MCP development workflows.
- Baileys integration and WhatsApp connection events.
- MCP server engineering.
- SQLite/Drizzle database engineering.
- Testing and security review.
- WhatsApp account operations, messaging, chat management, and automation.

Use the Skills scripts above to inspect and validate the files in the repository.

## Security

Treat this service as a system with access to private WhatsApp accounts and messages.

- Never commit `.env`, API keys, encryption keys, session files, or database files containing private data.
- Generate strong, unique secrets for `ENCRYPTION_KEY` and `API_KEY`.
- Restrict access to the host, API, database, session directory, and log files.
- Use HTTPS for remote deployments.
- Keep dependencies updated and review security advisories.
- Apply rate limits and least-privilege access where supported.
- Do not log message contents, credentials, QR codes, or other sensitive data unnecessarily.
- Back up persistent data securely and test restoration procedures.
- Obtain consent before sending automated messages; respect opt-outs and applicable laws and platform policies.

## WhatsApp disclaimer

WA-MCP Pro uses Baileys, an unofficial WhatsApp Web implementation. It is **not affiliated with, endorsed by, or an official product of WhatsApp or Meta**.

Use this project responsibly. Automated or excessive messaging may violate platform policies and can result in account restrictions. You are responsible for complying with WhatsApp's terms, applicable laws, privacy requirements, and the consent of message recipients.

## Documentation

Project documentation is maintained in the `docs/` directory:

- [Architecture](docs/ARCHITECTURE.md)
- [Installation](docs/INSTALLATION.md)
- [Configuration](docs/CONFIGURATION.md)
- [MCP Tools](docs/MCP-TOOLS.md)
- [REST API](docs/REST-API.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Development](docs/DEVELOPMENT.md)
- [Skills](docs/SKILLS.md)

## Contributing

Contributions, bug reports, and documentation improvements are welcome.

1. Fork the repository.
2. Create a focused feature branch.
3. Make your changes and add or update tests.
4. Run the relevant checks listed in [Development](#development).
5. Open a pull request with a clear description of the change.

For bugs and feature requests, use the repository's [GitHub Issues](https://github.com/Strong-Bee/wa-mcp-pro/issues).

## License

This project is licensed under the [MIT License](LICENSE).

---

**WA-MCP Pro** — Connect WhatsApp to your AI agents.
