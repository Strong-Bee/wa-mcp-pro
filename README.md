![logo](./public/01-primary-logo.png)

# WA-MCP Pro

**Connect WhatsApp to Your AI Agents.**

WA-MCP Pro is a production-ready WhatsApp MCP (Model Context Protocol) server that enables AI agents to interact with WhatsApp through standardized tools, resources, and prompts.

## Features

### 🤖 AI Agent Integration
- **MCP STDIO Transport** - Works with Claude Code, OpenCode, Cursor, and other MCP clients
- **MCP Streamable HTTP** - Remote access via HTTP with authentication
- **17 MCP Tools** - Complete WhatsApp operations (messaging, contacts, groups, automation)
- **8 MCP Resources** - Real-time data access (status, chats, contacts, groups, metrics)
- **5 MCP Prompts** - Pre-built workflows (assistant, composer, summarizer, support, group management)

### 📱 WhatsApp Features
- **Multi-Account** - Manage multiple WhatsApp accounts simultaneously
- **QR Code Authentication** - Standard WhatsApp Web login
- **Pairing Code** - Mobile-friendly authentication
- **Persistent Sessions** - Encrypted session storage with AES-256-GCM
- **Auto-Reconnect** - Exponential backoff with jitter
- **Full Messaging** - Text, images, videos, documents, audio, locations, contacts
- **Group Management** - Create, manage participants, settings, invites
- **Contact Management** - Search, verify, profile pictures
- **Chat History** - Local message storage with search

### ⚙️ Automation
- **Keyword Triggers** - Respond to specific words
- **Exact Match** - Precise message matching
- **Regex Patterns** - Complex pattern matching
- **Commands** - Slash command handling
- **Cooldowns** - Rate limiting per user
- **Safety Guards** - Opt-out detection, loop prevention, rate limiting

### 🔒 Security
- **AES-256-GCM Encryption** - Session credentials encrypted at rest
- **API Key Authentication** - Scrypt-hashed keys with scopes
- **Role-Based Access** - Owner, Admin, Operator, Readonly roles
- **Audit Logging** - Complete operation trail
- **Input Validation** - Zod schemas for all inputs
- **Secret Redaction** - Automatic log sanitization

### 🐳 Deployment
- **Docker Support** - Multi-stage build, non-root user
- **Docker Compose** - Production-ready with volumes
- **Health Checks** - Kubernetes-ready endpoints
- **Windows & Linux** - Cross-platform support

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- WhatsApp account

### Installation

```bash
# Clone repository
git clone <repository-url>
cd wa-mcp-pro

# Install dependencies
corepack enable
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Setup database
pnpm db:migrate
pnpm db:seed

# Generate API key
pnpm generate:api-key -- --name "My App" --permissions "accounts:read,messages:send"

# Start server
pnpm start
```

### MCP Client Configuration

#### Claude Code (STDIO)
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

#### Remote HTTP
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

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Agents / Clients                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   STDIO     │  │    HTTP     │  │      REST API       │  │
│  │   Transport │  │  Transport  │  │    (Fastify)        │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼─────────────────────┼─────────────┘
          │                │                     │
          └────────────────┼─────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  MCP Core   │
                    │  (Tools,    │
                    │  Resources, │
                    │  Prompts)   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Services   │
                    │  (Message,  │
                    │  Contact,   │
                    │  Chat,      │
                    │  Group,     │
                    │  Automation)│
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Connection  │
                    │  Manager    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Baileys   │
                    │  (WhatsApp  │
                    │   Web)      │
                    └─────────────┘
```

## Available MCP Tools

### Connection
| Tool | Description |
|------|-------------|
| `whatsapp_connect` | Connect an account |
| `whatsapp_disconnect` | Disconnect account |
| `whatsapp_logout` | Logout and remove session |
| `whatsapp_get_status` | Get connection status |
| `whatsapp_get_qr` | Get QR code |
| `whatsapp_get_pairing_code` | Get pairing code |
| `whatsapp_list_accounts` | List all accounts |
| `whatsapp_create_account` | Create new account |

### Messaging
| Tool | Description |
|------|-------------|
| `whatsapp_send_message` | Send text message |
| `whatsapp_send_image` | Send image |
| `whatsapp_send_video` | Send video |
| `whatsapp_send_document` | Send document |
| `whatsapp_send_audio` | Send audio |
| `whatsapp_send_location` | Send location |
| `whatsapp_send_contact` | Send contact |
| `whatsapp_reply_message` | Reply to message |
| `whatsapp_react_message` | React to message |
| `whatsapp_delete_message` | Delete message |
| `whatsapp_mark_read` | Mark as read |
| `whatsapp_search_messages` | Search messages |

### Contacts
| Tool | Description |
|------|-------------|
| `whatsapp_get_contacts` | List contacts |
| `whatsapp_get_contact` | Get contact details |
| `whatsapp_check_number` | Verify WhatsApp number |
| `whatsapp_get_profile_picture` | Get profile photo |
| `whatsapp_search_contacts` | Search contacts |

### Chats
| Tool | Description |
|------|-------------|
| `whatsapp_get_chats` | List chats |
| `whatsapp_get_chat` | Get chat details |
| `whatsapp_get_messages` | Get message history |
| `whatsapp_mark_as_read` | Mark as read |
| `whatsapp_archive_chat` | Archive chat |
| `whatsapp_get_unread_count` | Get unread count |

### Groups
| Tool | Description |
|------|-------------|
| `whatsapp_get_groups` | List groups |
| `whatsapp_get_group_info` | Get group details |
| `whatsapp_get_group_members` | List participants |
| `whatsapp_create_group` | Create group |
| `whatsapp_add_group_participant` | Add members |
| `whatsapp_remove_group_participant` | Remove members |
| `whatsapp_promote_group_participant` | Promote to admin |
| `whatsapp_demote_group_participant` | Demote from admin |
| `whatsapp_update_group_subject` | Change name |
| `whatsapp_update_group_description` | Change description |
| `whatsapp_get_group_invite` | Get invite link |
| `whatsapp_revoke_group_invite` | Revoke invite |
| `whatsapp_leave_group` | Leave group |

### Automation
| Tool | Description |
|------|-------------|
| `whatsapp_create_auto_reply` | Create auto-reply rule |
| `whatsapp_list_auto_reply` | List rules |
| `whatsapp_get_auto_reply` | Get rule details |
| `whatsapp_update_auto_reply` | Update rule |
| `whatsapp_delete_auto_reply` | Delete rule |
| `whatsapp_toggle_auto_reply` | Enable/disable rule |

### System
| Tool | Description |
|------|-------------|
| `whatsapp_health_check` | System health |
| `whatsapp_get_metrics` | Metrics |
| `whatsapp_get_version` | Version info |
| `whatsapp_get_capabilities` | Capabilities |

## REST API Endpoints

### Health
- `GET /health` - Basic health
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check

### Accounts
- `POST /api/v1/accounts` - Create account
- `GET /api/v1/accounts` - List accounts
- `GET /api/v1/accounts/:id` - Get account
- `POST /api/v1/accounts/:id/connect` - Connect
- `POST /api/v1/accounts/:id/disconnect` - Disconnect
- `POST /api/v1/accounts/:id/logout` - Logout
- `GET /api/v1/accounts/:id/status` - Get status
- `GET /api/v1/accounts/:id/qr` - Get QR code
- `POST /api/v1/accounts/:id/pairing-code` - Get pairing code
- `DELETE /api/v1/accounts/:id` - Delete account

### Messages
- `POST /api/v1/messages/send` - Send text
- `POST /api/v1/messages/image` - Send image
- `POST /api/v1/messages/video` - Send video
- `POST /api/v1/messages/document` - Send document
- `POST /api/v1/messages/audio` - Send audio
- `POST /api/v1/messages/location` - Send location
- `POST /api/v1/messages/contact` - Send contact
- `GET /api/v1/messages/search` - Search messages
- `GET /api/v1/messages/:id` - Get message

### Other Endpoints
- Contacts: `GET /api/v1/contacts`, `GET /api/v1/contacts/:jid`, `POST /api/v1/contacts/check`
- Chats: `GET /api/v1/chats`, `GET /api/v1/chats/:chat_jid`, `GET /api/v1/chats/:chat_jid/messages`
- Groups: `GET /api/v1/groups`, `GET /api/v1/groups/:group_jid`, `GET /api/v1/groups/:group_jid/members`
- Automations: `GET/POST /api/v1/automations`, `PATCH/DELETE /api/v1/automations/:id`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `HOST` | Server host | `127.0.0.1` |
| `PORT` | Server port | `3000` |
| `MCP_TRANSPORT` | Transport type | `stdio` |
| `MCP_HTTP_ENABLED` | Enable HTTP transport | `false` |
| `MCP_HTTP_PORT` | HTTP port | `3001` |
| `DATABASE_URL` | SQLite path | `./storage/wa-mcp.db` |
| `SESSION_DIRECTORY` | Session storage | `./storage/sessions` |
| `MEDIA_DIRECTORY` | Media storage | `./storage/media` |
| `LOG_DIRECTORY` | Log storage | `./storage/logs` |
| `ENCRYPTION_KEY` | 32-byte hex key | *required* |
| API credentials | Generate and store an API key using the CLI; plaintext keys are shown once |
| `LOG_LEVEL` | Log level | `info` |
| `MAX_MEDIA_SIZE_MB` | Max media size | `50` |

## Docker Deployment

```bash
# Build
docker build -t wa-mcp-pro .

# Run with compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Development

```bash
# Install dependencies
pnpm install

# Run in development
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Formatting
pnpm format

# Tests
pnpm test
pnpm test:coverage

# Build
pnpm build

# Database
pnpm db:migrate
pnpm db:seed

# Skills
pnpm skills:validate
pnpm skills:list
```

## Skills System

WA-MCP Pro includes a comprehensive Skills system for AI Agents:

### Development Skills
- `wa-mcp-development` - Architecture and development workflows
- `baileys-integration` - Baileys connection and events
- `mcp-server-engineering` - MCP tools, resources, prompts
- `sqlite-drizzle-engineering` - Database schema and queries
- `wa-mcp-testing` - Testing strategies
- `wa-mcp-security-audit` - Security auditing

### Operations Skills
- `whatsapp-operator` - Connection management
- `whatsapp-messaging` - Sending messages
- `whatsapp-chat-management` - Chats, contacts, groups
- `whatsapp-automation` - Auto-reply rules

## Documentation

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

## Security Considerations

- Never commit `.env` files
- Use strong `ENCRYPTION_KEY` (32 random bytes)
- Rotate API keys periodically
- Enable HTTPS in production (reverse proxy)
- Monitor audit logs
- Keep dependencies updated

## WhatsApp Disclaimer

This software uses Baileys, an unofficial WhatsApp Web API implementation. Use responsibly:

- Respect WhatsApp Terms of Service
- Don't spam or send unsolicited messages
- Respect user privacy and opt-out requests
- Be aware of potential account restrictions
- This is not an official WhatsApp product

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Support

- [Issues](https://github.com/wa-mcp-pro/issues)
- [Discussions](https://github.com/wa-mcp-pro/discussions)
- [Documentation](https://wa-mcp-pro.dev)

---

**WA-MCP Pro** - Connecting WhatsApp to the AI ecosystem.
