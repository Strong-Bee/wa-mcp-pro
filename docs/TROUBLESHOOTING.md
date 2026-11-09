# Troubleshooting Guide

## Quick Diagnostics

```bash
# Run health check
pnpm wa-mcp doctor

# Check system status
pnpm wa-mcp account:list

# View logs
tail -f storage/logs/app.log
```

## Connection Issues

### QR Code Not Generating

**Symptoms:** `whatsapp_get_qr` returns "No QR code available"

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Already connected | Check status: `whatsapp_get_status` |
| Session exists | Logout first: `whatsapp_logout` then `whatsapp_connect` |
| Baileys not ready | Wait 5-10 seconds after connect |
| Port conflict | Check if another instance running |

**Debug Steps:**
```bash
# 1. Check status
pnpm wa-mcp account:status --id "uuid"

# 2. If connected, disconnect first
pnpm wa-mcp account:disconnect --id "uuid"

# 3. Reconnect
pnpm wa-mcp account:connect --id "uuid"

# 4. Get QR
pnpm wa-mcp account:qr --id "uuid"
```

### Pairing Code Not Working

**Symptoms:** Code expires quickly or "Invalid code"

**Solutions:**
- Use code immediately (expires in ~60 seconds)
- Ensure phone number format: `+1234567890`
- WhatsApp mobile app must be on same WiFi or have internet
- Try QR code instead

### Connection Drops Frequently

**Symptoms:** Status shows `reconnecting` often

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Network instability | Check internet connection |
| WhatsApp Web limits | Wait between reconnects |
| Session corrupted | `logout` then re-authenticate |
| Multiple instances | Ensure single process |

**Configuration:**
```env
# Increase reconnect attempts
WHATSAPP_RECONNECT_MAX_ATTEMPTS=20

# Enable auto-reconnect
WHATSAPP_AUTO_RECONNECT=true
```

### "Already Connected" Error

**Symptoms:** Can't connect, status shows `connected`

**Solution:**
```bash
# Check actual status
pnpm wa-mcp account:status --id "uuid"

# If truly connected, use existing connection
# If stuck, force disconnect
pnpm wa-mcp account:disconnect --id "uuid"
pnpm wa-mcp account:connect --id "uuid"
```

## Authentication Issues

### "ENCRYPTION_KEY" Error

**Error:** `ENCRYPTION_KEY not configured` or `must be 64 hex characters`

**Solution:**
```bash
# Generate key
openssl rand -hex 32

# Add to .env
ENCRYPTION_KEY=your-64-char-hex-key
```

### "API_KEY" Error

**Error:** `API_KEY not configured` or invalid

**Solution:**
```bash
# Generate key
openssl rand -hex 32

# Add to .env
API_KEY=your-64-char-hex-key
```

### Invalid API Key

**Error:** `MCP_AUTH_FAILED` or 401 Unauthorized

**Solutions:**
- Check key matches `.env` exactly
- No extra spaces or quotes
- Key not expired
- Correct header: `Authorization: Bearer wamp_...`

## Database Issues

### "Database Locked"

**Error:** `SQLITE_BUSY: database is locked`

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Multiple processes | Ensure single instance |
| Long transaction | Check for hanging queries |
| WAL mode issue | Verify WAL mode enabled |

**Fix:**
```bash
# Check for other processes
lsof storage/wa-mcp.db

# Kill other processes
pkill -f "node.*wa-mcp"

# Restart
pnpm start
```

### Migration Failures

**Error:** Migration script fails

**Debug:**
```bash
# Check migration status
pnpm db:migrate status

# Run manually
sqlite3 storage/wa-mcp.db < migrations.sql

# Check schema
sqlite3 storage/wa-mcp.db ".schema"
```

### Database Corruption

**Symptoms:** Errors on queries, integrity check fails

**Recovery:**
```bash
# Backup first
cp storage/wa-mcp.db storage/wa-mcp.db.backup

# Check integrity
sqlite3 storage/wa-mcp.db "PRAGMA integrity_check;"

# If corrupted, restore from backup
cp storage/wa-mcp.db.backup storage/wa-mcp.db
```

## Messaging Issues

### Messages Not Sending

**Symptoms:** Tool succeeds but message not delivered

**Debug Checklist:**
- [ ] Account status: `connected`
- [ ] Recipient format correct (+1234567890 or JID)
- [ ] Media path exists and readable
- [ ] Media size < 50MB
- [ ] MIME type allowed
- [ ] Account not rate limited

**Debug:**
```bash
# Check account status
pnpm wa-mcp account:status --id "uuid"

# Test with simple text
pnpm wa-mcp send --id "uuid" --to "+1234567890" --msg "test"
```

### Media Upload Fails

**Errors:** `WA_MEDIA_TOO_LARGE`, `WA_MEDIA_INVALID`

**Limits:**
- Max size: 50MB (configurable)
- Allowed types: JPEG, PNG, GIF, WebP, MP4, MOV, MP3, OGG, PDF, DOC, DOCX, XLS, XLSX

**Solutions:**
```bash
# Check file size
ls -lh /path/to/media

# Check MIME type
file --mime-type /path/to/media

# Compress if needed
ffmpeg -i input.mp4 -vcodec libx264 -crf 28 output.mp4
```

### Messages Not Received

**Symptoms:** Sent from phone but not in history

**Causes:**
- Account not connected when message sent
- Baileys event handler not processing
- Database write failed

**Debug:**
```bash
# Check connection status
pnpm wa-mcp account:status --id "uuid"

# Check logs
grep "message.received" storage/logs/app.log

# Check database
sqlite3 storage/wa-mcp.db "SELECT * FROM messages WHERE accountId='uuid' ORDER BY timestamp DESC LIMIT 10;"
```

## Group Issues

### Cannot Create Group

**Error:** Permission denied or failed

**Requirements:**
- Account must be `connected`
- At least 1 participant (besides creator)
- Valid phone numbers/JIDs

### Cannot Add/Remove Participants

**Error:** Permission denied

**Requirements:**
- Account must be group admin
- Valid participant JIDs
- Group not at participant limit (1024)

### Invite Link Issues

**Error:** Cannot get/revoke invite

**Solutions:**
- Must be group admin
- Group must allow invites
- Try revoking then getting new link

## Automation Issues

### Auto-Reply Not Triggering

**Checklist:**
- [ ] Rule `enabled: true`
- [ ] Account `connected`
- [ ] Trigger type matches message
- [ ] Cooldown not active
- [ ] User not opted out
- [ ] Not loop prevention

**Debug:**
```bash
# List rules
pnpm wa-mcp automation:list --id "uuid"

# Check specific rule
pnpm wa-mcp automation:get --id "uuid" --rule_id "rule_uuid"

# Check logs
grep "automation" storage/logs/app.log
```

### Auto-Reply Looping

**Symptoms:** Bot replies to itself repeatedly

**Solutions:**
- Enable loop prevention (default on)
- Add cooldown (60+ seconds)
- Exclude bot's own JID in conditions
- Use exact match instead of keyword

### Cooldown Not Working

**Check:**
- Cooldown in seconds (not milliseconds)
- Per-user tracking
- Different rules have separate cooldowns

## Performance Issues

### High Memory Usage

**Symptoms:** Process using >1GB RAM

**Solutions:**
```bash
# Check memory
node --inspect dist/index.js
# Or
pnpm wa-mcp doctor

# Limit Node.js memory
node --max-old-space-size=512 dist/index.js
```

### Slow Responses

**Causes:**
- Database locked
- Large query results
- Baileys processing queue

**Solutions:**
- Add database indexes
- Paginate results (limit 50)
- Increase timeout

### High CPU Usage

**Causes:**
- Reconnection loop
- Message processing backlog
- Infinite loop in automation

**Debug:**
```bash
# Check reconnection status
grep "reconnect" storage/logs/app.log

# Check automation
pnpm wa-mcp automation:list --id "uuid" --enabled true
```

## WhatsApp-Specific Issues

### "This account cannot be used on WhatsApp Web"

**Cause:** Account banned or restricted

**Solutions:**
- Use different phone number
- Wait 24-48 hours
- Contact WhatsApp support

### "Phone number shared across multiple devices"

**Cause:** Multi-device beta limitations

**Solution:**
- Use pairing code instead of QR
- Disconnect other devices first

### Session Expired Frequently

**Causes:**
- WhatsApp Web session limit
- Multiple connections
- Network issues

**Solutions:**
- Use single connection
- Stable internet connection
- Pairing code more stable than QR

## Logging & Debugging

### Log Levels
```env
LOG_LEVEL=debug  # trace, debug, info, warn, error, fatal
```

### Key Log Files
```
storage/logs/app.log      # Main application log
storage/logs/error.log    # Errors only
```

### Useful Log Filters
```bash
# Connection events
grep "connection" storage/logs/app.log

# Message events
grep "message" storage/logs/app.log

# Automation
grep "automation" storage/logs/app.log

# Errors
grep "ERROR" storage/logs/app.log

# Specific account
grep "accountId=uuid" storage/logs/app.log
```

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug pnpm start

# With Node inspector
node --inspect dist/index.ts
```

## Getting Help

### Before Asking
1. Run `pnpm wa-mcp doctor`
2. Check relevant log section
3. Try basic troubleshooting steps
3. Note exact error message
4. Note steps to reproduce

### Support Channels
- **GitHub Issues:** Bug reports, feature requests
- **GitHub Discussions:** Questions, help
- **Documentation:** [docs/](docs/)
- **Security:** security@wa-mcp-pro.dev

### Information to Include
- OS and version
- Node.js version (`node -v`)
- pnpm version (`pnpm -v`)
- WA-MCP Pro version
- Exact error message
- Steps to reproduce
- Relevant log excerpts
- Configuration (sanitized)