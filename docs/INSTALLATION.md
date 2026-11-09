# Installation Guide

## Prerequisites

- **Node.js** 20.0.0 or higher (LTS recommended)
- **pnpm** 9.0.0 or higher
- **Git** 2.30+
- **WhatsApp Account** for testing

### System Requirements
- **RAM**: Minimum 512MB, Recommended 1GB+
- **Storage**: 500MB for app + media storage
- **Network**: Internet access for WhatsApp Web

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/wa-mcp-pro/wa-mcp-pro.git
cd wa-mcp-pro
```

### 2. Enable Corepack (for pnpm)
```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
```

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
# Required for production
ENCRYPTION_KEY=your-32-byte-hex-key-here
API_KEY=your-32-byte-hex-key-here

# Optional overrides
NODE_ENV=development
PORT=3000
MCP_TRANSPORT=stdio
```

### 5. Generate Secure Keys
```bash
# Generate encryption key (64 hex chars = 32 bytes)
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6. Initialize Database
```bash
pnpm db:migrate
pnpm db:seed
```

### 7. Start Server
```bash
# Development with hot reload
pnpm dev

# Production
pnpm build
pnpm start
```

## Windows Installation

### PowerShell Script
```powershell
# Run as Administrator for best results
# 1. Install prerequisites
winget install OpenJS.NodeJS Git

# 2. Enable corepack
corepack enable

# 3. Clone and setup
git clone https://github.com/wa-mcp-pro/wa-mcp-pro.git
cd wa-mcp-pro

# 4. Install dependencies
pnpm install

# 5. Configure
Copy-Item .env.example .env
notepad .env  # Edit with your keys

# 6. Database
pnpm db:migrate
pnpm db:seed

# 7. Test
pnpm dev
```

### Windows-Specific Notes
- Use `pnpm` instead of `npm` for better performance
- Paths in `.env` should use forward slashes or escaped backslashes
- SQLite native modules may need Visual Studio Build Tools
- Run PowerShell as Administrator for symlink permissions

## Docker Installation

### Quick Start
```bash
# Build image
docker build -t wa-mcp-pro .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Production with Environment File
```bash
# Create production env
cp .env.example .env.production
# Edit .env.production

# Run with custom env
docker-compose --env-file .env.production up -d
```

## Configuration

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `ENCRYPTION_KEY` | 32-byte hex for AES-256 | `a1b2c3...` (64 chars) |
| `API_KEY` | 32-byte hex for API auth | `d4e5f6...` (64 chars) |

### Optional Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `HOST` | `127.0.0.1` | Server bind address |
| `PORT` | `3000` | HTTP server port |
| `MCP_TRANSPORT` | `stdio` | `stdio`, `http`, or `hybrid` |
| `MCP_HTTP_ENABLED` | `false` | Enable MCP HTTP transport |
| `MCP_HTTP_PORT` | `3001` | MCP HTTP port |
| `DATABASE_URL` | `./storage/wa-mcp.db` | SQLite path |
| `SESSION_DIRECTORY` | `./storage/sessions` | Session storage |
| `MEDIA_DIRECTORY` | `./storage/media` | Media storage |
| `LOG_DIRECTORY` | `./storage/logs` | Log storage |
| `LOG_LEVEL` | `info` | Log level |
| `MAX_MEDIA_SIZE_MB` | `50` | Max media size |
| `WHATSAPP_AUTO_RECONNECT` | `true` | Auto-reconnect enabled |
| `WHATSAPP_RECONNECT_MAX_ATTEMPTS` | `10` | Max reconnect tries |

## First WhatsApp Connection

### Using CLI
```bash
# 1. Create account
pnpm wa-mcp account:add --id "your-uuid" --name "My WhatsApp" --phone "+1234567890"

# 2. Connect (generates QR)
pnpm wa-mcp account:connect --id "your-uuid"

# 3. Get QR code
pnpm wa-mcp account:qr --id "your-uuid"
# Scan with WhatsApp mobile app

# 4. Verify connection
pnpm wa-mcp account:status --id "your-uuid"
```

### Using REST API
```bash
# 1. Create account
curl -X POST http://localhost:3001/api/v1/accounts \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": "uuid", "name": "My WhatsApp", "phone_number": "+1234567890"}'

# 2. Connect
curl -X POST http://localhost:3001/api/v1/accounts/uuid/connect \
  -H "Authorization: Bearer YOUR_API_KEY"

# 3. Get QR
curl http://localhost:3001/api/v1/accounts/uuid/qr \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Using MCP Tools (Claude Code)
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
Then use tools:
- `whatsapp_create_account`
- `whatsapp_connect`
- `whatsapp_get_qr`

## Verification

### Health Check
```bash
# CLI
pnpm wa-mcp doctor

# REST
curl http://localhost:3001/health

# MCP
whatsapp_health_check
```

### Expected Output
```json
{
  "status": "ok",
  "timestamp": "2026-11-09T00:00:00.000Z",
  "uptime": 123.45,
  "version": "1.0.0"
}
```

### Database Check
```bash
pnpm wa-mcp db:migrate status
# Applied: 9, Pending: 0
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `ENCRYPTION_KEY` error | Generate 64-char hex key |
| `API_KEY` error | Generate 64-char hex key |
| Database locked | Ensure single process, check WAL mode |
| QR not generating | Check connection status, try disconnect/connect |
| Baileys connection fails | Check network, WhatsApp Web status |
| Permission denied | Check file permissions on storage/ |

### Logs
```bash
# View logs
tail -f storage/logs/app.log

# Filter errors
grep ERROR storage/logs/app.log
```

## Next Steps

1. **Test with real WhatsApp account**
2. **Configure MCP client** (Claude Code, OpenCode, Cursor)
3. **Set up automation rules** if needed
4. **Configure monitoring** (health checks, logs)
5. **Set up backup** for database and sessions
6. **Review security** settings for production

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/wa-mcp-pro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/wa-mcp-pro/discussions)