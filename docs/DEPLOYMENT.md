# Deployment Guide

## Overview

WA-MCP Pro supports multiple deployment scenarios:
- **Local Development** - Direct Node.js execution
- **Docker** - Containerized deployment
- **Systemd** - Linux service management
- **Windows Service** - Windows service management

## Docker Deployment (Recommended)

### Quick Start
```bash
# Build image
docker build -t wa-mcp-pro .

# Run with compose
docker-compose up -d
```

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  wa-mcp-pro:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: wa-mcp-pro
    restart: unless-stopped
    environment:
      NODE_ENV: production
      MCP_TRANSPORT: http
      MCP_HTTP_ENABLED: "true"
      MCP_HTTP_PORT: 3001
      DATABASE_URL: /app/storage/wa-mcp.db
      SESSION_DIRECTORY: /app/storage/sessions
      MEDIA_DIRECTORY: /app/storage/media
      LOG_DIRECTORY: /app/storage/logs
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      API_KEY: ${API_KEY}
      LOG_LEVEL: info
    ports:
      - "127.0.0.1:3001:3001"
    volumes:
      - wa_mcp_storage:/app/storage
    healthcheck:
      test: ["CMD", "node", "dist/scripts/health-check.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

volumes:
  wa_mcp_storage:
    driver: local
```

### Environment File
```bash
# .env.production
NODE_ENV=production
MCP_TRANSPORT=http
MCP_HTTP_ENABLED=true
MCP_HTTP_PORT=3001
DATABASE_URL=/app/storage/wa-mcp.db
SESSION_DIRECTORY=/app/storage/sessions
MEDIA_DIRECTORY=/app/storage/media
LOG_DIRECTORY=/app/storage/logs
ENCRYPTION_KEY=your-64-char-hex-key
API_KEY=your-64-char-hex-key
LOG_LEVEL=info
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
MAX_MEDIA_SIZE_MB=50
WHATSAPP_AUTO_RECONNECT=true
WHATSAPP_RECONNECT_MAX_ATTEMPTS=10
WHATSAPP_MESSAGE_HISTORY_LIMIT=10000
```

### Build and Run
```bash
# Build
docker-compose build

# Start
docker-compose --env-file .env.production up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down
```

### Dockerfile Details

```dockerfile
# Multi-stage build
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++ sqlite-dev cairo-dev jpeg-dev pango-dev giflib-dev librsvg-dev

FROM base AS builder
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/drizzle.config.ts ./
USER nodejs
EXPOSE 3000 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD node dist/scripts/health-check.js
CMD ["node", "dist/index.js"]
```

## Production Deployment

### Requirements
- Linux server (Ubuntu 22.04+, Debian 12+, RHEL 9+)
- Node.js 20+ (if not using Docker)
- 1GB+ RAM
- 5GB+ disk space
- Domain with SSL (for HTTPS)

### Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/wa-mcp-pro
server {
    listen 80;
    server_name wa-mcp.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name wa-mcp.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/wa-mcp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wa-mcp.yourdomain.com/privkey.pem;

    # MCP WebSocket/HTTP
    location /mcp/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # REST API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health checks
    location /health {
        proxy_pass http://127.0.0.1:3001;
        access_log off;
    }

    # Swagger UI
    location /docs {
        proxy_pass http://127.0.0.1:3001;
    }
}
```

### SSL Certificate (Let's Encrypt)
```bash
sudo certbot --nginx -d wa-mcp.yourdomain.com
```

## Systemd Service (Linux)

### Service File
```ini
# /etc/systemd/system/wa-mcp-pro.service
[Unit]
Description=WA-MCP Pro WhatsApp MCP Server
After=network.target

[Service]
Type=simple
User=wa-mcp
WorkingDirectory=/opt/wa-mcp-pro
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production
EnvironmentFile=/opt/wa-mcp-pro/.env.production

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/wa-mcp-pro/storage

[Install]
WantedBy=multi-user.target
```

### Setup
```bash
# Create user
sudo useradd -r -s /bin/false wa-mcp

# Create directory
sudo mkdir -p /opt/wa-mcp-pro
sudo chown wa-mcp:wa-mcp /opt/wa-mcp-pro

# Copy files
sudo cp -r dist node_modules package.json /opt/wa-mcp-pro/
sudo cp .env.production /opt/wa-mcp-pro/

# Create storage directories
sudo mkdir -p /opt/wa-mcp-pro/storage/{sessions,media,logs}
sudo chown -R wa-mcp:wa-mcp /opt/wa-mcp-pro/storage

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable wa-mcp-pro
sudo systemctl start wa-mcp-pro
sudo systemctl status wa-mcp-pro
```

### Logs
```bash
sudo journalctl -u wa-mcp-pro -f
sudo journalctl -u wa-mcp-pro --since "1 hour ago"
```

## Windows Service

### Using NSSM (Non-Sucking Service Manager)

```powershell
# Install NSSM
choco install nssm

# Install service
nssm install WA-MCP-Pro "C:\Program Files\nodejs\node.exe" "C:\path\to\wa-mcp-pro\dist\index.js"
nssm set WA-MCP-Pro AppDirectory "C:\path\to\wa-mcp-pro"
nssm set WA-MCP-Pro AppEnvironmentExtra "NODE_ENV=production"
nssm set WA-MCP-Pro AppEnvironmentExtra "MCP_TRANSPORT=stdio"
nssm set WA-MCP-Pro AppStdout "C:\path\to\wa-mcp-pro\storage\logs\service-out.log"
nssm set WA-MCP-Pro AppStderr "C:\path\to\wa-mcp-pro\storage\logs\service-err.log"
nssm set WA-MCP-Pro AppRotateFiles 1
nssm set WA-MCP-Pro AppRotateBytes 10485760

# Start service
nssm start WA-MCP-Pro
```

### Using PM2 (Alternative)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'wa-mcp-pro',
    script: 'dist/index.js',
    cwd: 'C:\\path\\to\\wa-mcp-pro',
    env: {
      NODE_ENV: 'production',
      MCP_TRANSPORT: 'stdio'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: 'storage/logs/pm2-error.log',
    out_file: 'storage/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}
EOF

# Start
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Backup & Restore

### Backup Script
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/wa-mcp-pro"
DATE=$(date +%Y%m%d_%H%M%S)
STORAGE_DIR="/opt/wa-mcp-pro/storage"

mkdir -p "$BACKUP_DIR"

# Backup database
sqlite3 "$STORAGE_DIR/wa-mcp.db" ".backup $BACKUP_DIR/wa-mcp_$DATE.db"

# Backup sessions
tar -czf "$BACKUP_DIR/sessions_$DATE.tar.gz" -C "$STORAGE_DIR" sessions

# Backup media (optional, can be large)
# tar -czf "$BACKUP_DIR/media_$DATE.tar.gz" -C "$STORAGE_DIR" media

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

### Restore
```bash
# Stop service
systemctl stop wa-mcp-pro

# Restore database
sqlite3 /opt/wa-mcp-pro/storage/wa-mcp.db ".restore /backups/wa-mcp-pro/wa-mcp_20261109_120000.db"

# Restore sessions
tar -xzf /backups/wa-mcp-pro/sessions_20261109_120000.tar.gz -C /opt/wa-mcp-pro/storage

# Start service
systemctl start wa-mcp-pro
```

## Monitoring

### Health Checks
```bash
# Basic health
curl http://localhost:3001/health

# Readiness
curl http://localhost:3001/health/ready

# Liveness
curl http://localhost:3001/health/live
```

### Prometheus Metrics (Optional)
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'wa-mcp-pro'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
```

### Log Aggregation
```bash
# Forward to Loki/Grafana
# Add to docker-compose.yml
logging:
  driver: "loki"
  options:
    loki-url: "http://loki:3100/loki/api/v1/push"
```

## Scaling Considerations

### Current Architecture
- Single process
- SQLite database
- In-memory event bus

### Horizontal Scaling (Future)
1. **Redis** for distributed event bus
2. **PostgreSQL** for multi-writer database
3. **Load balancer** for REST API
4. **Separate workers** for automation

### Resource Limits
```yaml
# docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 1G
```

## Security Hardening

### Container Security
```dockerfile
# Run as non-root
USER nodejs

# Read-only root filesystem
read_only: true
tmpfs:
  - /tmp
  - /var/run

# Drop capabilities
cap_drop:
  - ALL

# Security options
security_opt:
  - no-new-privileges:true
```

### Network Security
```yaml
# docker-compose.yml
networks:
  wa-mcp-network:
    driver: bridge
    internal: true  # No external access
```

## Troubleshooting Deployment

### Common Issues

| Issue | Solution |
|-------|----------|
| Container won't start | Check logs: `docker-compose logs wa-mcp-pro` |
| Database locked | Ensure single container, check WAL mode |
| Permission denied | Check volume permissions: `chown -R 1001:1001 storage` |
| Port in use | Change port in .env or docker-compose.yml |
| SSL certificate | Check certbot renewal: `certbot renew --dry-run` |
| Service won't start | Check journalctl: `journalctl -u wa-mcp-pro -f` |

### Health Check Failures
```bash
# Check health endpoint directly
curl -v http://localhost:3001/health/ready

# Check database
sqlite3 storage/wa-mcp.db "PRAGMA integrity_check;"

# Check sessions
ls -la storage/sessions/

# Check logs
tail -f storage/logs/app.log
```

## Rollback Procedure

```bash
# 1. Stop current version
docker-compose down
# or
systemctl stop wa-mcp-pro

# 2. Restore backup
./restore.sh backup_date

# 3. Start previous version
docker-compose up -d
# or
systemctl start wa-mcp-pro

# 4. Verify
curl http://localhost:3001/health
```

## Maintenance

### Regular Tasks
```bash
# Weekly
pnpm skills:validate
docker-compose pull
docker-compose up -d --build

# Monthly
pnpm audit --prod
pnpm outdated
# Review logs for anomalies
# Clean old media: pnpm wa-mcp media:cleanup
```

### Updates
```bash
# Pull latest
git pull origin main

# Update dependencies
pnpm install

# Run migrations
pnpm db:migrate

# Rebuild
pnpm build

# Restart
docker-compose up -d --build
# or
systemctl restart wa-mcp-pro
```