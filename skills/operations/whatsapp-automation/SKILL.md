---
name: whatsapp-automation
description: Managing WhatsApp automation - auto-reply rules, triggers, cooldowns, monitoring
category: operations
version: 1.0.0
author: WA-MCP Pro Team
tags: [automation, auto-reply, rules, triggers, scheduling]
---

# WhatsApp Automation Skill

## Purpose
Guide for creating and managing WhatsApp automation rules via MCP tools.

## When to Use
- Creating auto-reply rules
- Managing keyword triggers
- Setting up customer support automation
- Monitoring automation logs
- Preventing spam/loops

## Key MCP Tools

### Rule Management
- `whatsapp_create_auto_reply` - Create automation rule
- `whatsapp_list_auto_reply` - List all rules
- `whatsapp_get_auto_reply` - Get rule details
- `whatsapp_update_auto_reply` - Update rule
- `whatsapp_delete_auto_reply` - Delete rule
- `whatsapp_toggle_auto_reply` - Enable/disable rule

## Trigger Types

### Keyword Match
Triggers when message contains the keyword (case-insensitive)
```bash
whatsapp_create_auto_reply --account_id "uuid" --name "Help Keyword" --trigger_type "keyword" --trigger_value "help" --response "How can I assist you?"
```

### Exact Match
Triggers when message exactly matches (case-insensitive)
```bash
whatsapp_create_auto_reply --account_id "uuid" --name "Exact Match" --trigger_type "exact_match" --trigger_value "ping" --response "pong"
```

### Regex Match
Triggers when message matches regex pattern
```bash
whatsapp_create_auto_reply --account_id "uuid" --name "Order Number" --trigger_type "regex" --trigger_value "^order\\s+\\d+$" --response "Checking your order..."
```

### Command Match
Triggers on command (starts with `/`)
```bash
whatsapp_create_auto_reply --account_id "uuid" --name "Start Command" --trigger_type "command" --trigger_value "start" --response "Welcome! Type /help for commands."
```

## Rule Options

### Cooldown
Minimum seconds between triggers for same user
```bash
whatsapp_create_auto_reply --cooldown 60  # 1 minute cooldown
```

### Enable/Disable
```bash
whatsapp_toggle_auto_reply --account_id "uuid" --automation_id "rule_id"
```

### Conditions (Advanced)
Rules can have conditions:
- `fromContacts` - Only trigger for specific contacts
- `fromGroups` - Only trigger in specific groups
- `excludeContacts` - Don't trigger for specific contacts
- `excludeGroups` - Don't trigger in specific groups
- `timeRange` - Only trigger during hours
- `messageTypes` - Only for specific message types

## Safety Guards

### Rate Limiting
- Max 5 auto-replies per user per minute (configurable)
- Prevents spam from rapid messages

### Opt-Out Detection
- Automatically detects "stop", "unsubscribe", "opt out"
- Stops auto-replies for opted-out users

### Loop Prevention
- Tracks repeated identical responses
- Stops after 3 identical responses to same chat

### Message Type Filtering
- Only triggers on text messages by default
- Configurable for other types

## Common Use Cases

### Customer Support
```bash
# Business hours auto-reply
whatsapp_create_auto_reply \
  --account_id "uuid" \
  --name "Business Hours" \
  --trigger_type "keyword" \
  --trigger_value "support" \
  --response "Our support team will respond within 24 hours. For urgent issues, call +1-800-XXX-XXXX." \
  --cooldown 300
```

### FAQ Responses
```bash
# Price inquiry
whatsapp_create_auto_reply \
  --account_id "uuid" \
  --name "Pricing" \
  --trigger_type "keyword" \
  --trigger_value "price" \
  --response "Our pricing starts at $29/month. Visit example.com/pricing for details." \
  --cooldown 60
```

### Appointment Booking
```bash
# Booking command
whatsapp_create_auto_reply \
  --account_id "uuid" \
  --name "Book Appointment" \
  --trigger_type "command" \
  --trigger_value "book" \
  --response "Please visit example.com/book to schedule an appointment." \
  --cooldown 120
```

### Out of Office
```bash
# Auto-reply when away
whatsapp_create_auto_reply \
  --account_id "uuid" \
  --name "Out of Office" \
  --trigger_type "keyword" \
  --trigger_value "hello" \
  --response "I'm currently away. I'll respond when I'm back." \
  --enabled true
```

## Monitoring

### List Rules
```bash
whatsapp_list_auto_reply --account_id "uuid" --enabled true
```

### Get Rule Details
```bash
whatsapp_get_auto_reply --account_id "uuid" --automation_id "rule_id"
```

### View Logs
```bash
whatsapp_get_automation_logs --account_id "uuid" --limit 50
```

## Best Practices

1. **Test thoroughly** before enabling
2. **Set appropriate cooldowns** (30-300 seconds)
3. **Use specific triggers** to avoid false positives
4. **Monitor logs** for issues
5. **Respect opt-outs** - system handles automatically
6. **Don't auto-reply to groups** unless intended
7. **Keep responses concise** - WhatsApp has limits
8. **Regular cleanup** - disable unused rules

## Limitations

- Only works when account is connected
- Processes messages in real-time
- Cannot retroactively apply to old messages
- Limited to text-based triggers
- No complex workflows (use external tools)

## Troubleshooting

| Issue | Check |
|-------|-------|
| Not triggering | Verify trigger type/value, check cooldown |
| Triggering too much | Increase cooldown, refine trigger |
| Loop detected | Check response uniqueness |
| Opt-out not working | Verify opt-out keywords |

## References

- [MCP Tools Reference](../docs/MCP-TOOLS.md)
- [Automation Engine](../src/automation/engine.ts)
- [Safety Guards](../src/automation/guards.ts)