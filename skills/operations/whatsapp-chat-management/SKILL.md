---
name: whatsapp-chat-management
description: Managing WhatsApp chats, contacts, and groups - reading, searching, group administration
category: operations
version: 1.0.0
author: WA-MCP Pro Team
tags: [chats, contacts, groups, management, administration]
---

# WhatsApp Chat Management Skill

## Purpose
Guide for managing WhatsApp chats, contacts, and groups via MCP tools.

## When to Use
- Reading chat lists
- Getting chat details
- Reading message history
- Managing contacts
- Managing groups
- Searching messages

## Key MCP Tools

### Chats
- `whatsapp_get_chats` - List chats
- `whatsapp_get_chat` - Get chat details
- `whatsapp_get_messages` - Get message history
- `whatsapp_search_messages` - Search messages
- `whatsapp_mark_as_read` - Mark chat as read
- `whatsapp_archive_chat` - Archive/unarchive
- `whatsapp_get_unread_count` - Get unread count

### Contacts
- `whatsapp_get_contacts` - List contacts
- `whatsapp_get_contact` - Get contact details
- `whatsapp_check_number` - Check if on WhatsApp
- `whatsapp_get_profile_picture` - Get profile photo
- `whatsapp_search_contacts` - Search contacts

### Groups
- `whatsapp_get_groups` - List groups
- `whatsapp_get_group_info` - Get group details
- `whatsapp_get_group_members` - List participants
- `whatsapp_create_group` - Create group
- `whatsapp_add_group_participant` - Add members
- `whatsapp_remove_group_participant` - Remove members
- `whatsapp_promote_group_participant` - Promote to admin
- `whatsapp_demote_group_participant` - Demote from admin
- `whatsapp_update_group_subject` - Change name
- `whatsapp_update_group_description` - Change description
- `whatsapp_get_group_invite` - Get invite link
- `whatsapp_revoke_group_invite` - Revoke invite
- `whatsapp_leave_group` - Leave group

## Common Operations

### Reading Chats
```bash
# List all chats
whatsapp_get_chats --account_id "uuid" --limit 50

# List only groups
whatsapp_get_chats --account_id "uuid" --is_group true

# Search chats
whatsapp_get_chats --account_id "uuid" --search "project"
```

### Reading Messages
```bash
# Get chat messages
whatsapp_get_messages --account_id "uuid" --chat_jid "+1234567890" --limit 50

# Get older messages
whatsapp_get_messages --account_id "uuid" --chat_jid "+1234567890" --before "2024-01-01T00:00:00Z"

# Search messages
whatsapp_search_messages --account_id "uuid" --query "meeting" --limit 20
```

### Managing Contacts
```bash
# List contacts
whatsapp_get_contacts --account_id "uuid" --limit 100

# Get contact details
whatsapp_get_contact --account_id "uuid" --jid "+1234567890@s.whatsapp.net"

# Check if on WhatsApp
whatsapp_check_number --account_id "uuid" --phone_number "+1234567890"

# Get profile picture
whatsapp_get_profile_picture --account_id "uuid" --jid "+1234567890@s.whatsapp.net"
```

### Group Management

#### Create Group
```bash
whatsapp_create_group --account_id "uuid" --subject "Team Chat" --participants '["+1234567890", "+0987654321"]'
```

#### Manage Members
```bash
# Add members
whatsapp_add_group_participant --account_id "uuid" --group_jid "12345@g.us" --participants '["+1111111111"]'

# Remove members
whatsapp_remove_group_participant --account_id "uuid" --group_jid "12345@g.us" --participants '["+1111111111"]'

# Promote to admin
whatsapp_promote_group_participant --account_id "uuid" --group_jid "12345@g.us" --participants '["+1111111111"]'

# Demote from admin
whatsapp_demote_group_participant --account_id "uuid" --group_jid "12345@g.us" --participants '["+1111111111"]'
```

#### Group Settings
```bash
# Update subject
whatsapp_update_group_subject --account_id "uuid" --group_jid "12345@g.us" --subject "New Name"

# Update description
whatsapp_update_group_description --account_id "uuid" --group_jid "12345@g.us" --description "Team chat for project X"

# Get invite link
whatsapp_get_group_invite --account_id "uuid" --group_jid "12345@g.us"

# Revoke invite
whatsapp_revoke_group_invite --account_id "uuid" --group_jid "12345@g.us"

# Leave group
whatsapp_leave_group --account_id "uuid" --group_jid "12345@g.us"
```

## Data Limitations

### What's Available
- Chats/messages received since connection
- Contacts synced on connection
- Group metadata on connection
- New incoming messages in real-time

### What's NOT Available
- Full message history before connection
- Deleted messages (unless captured)
- Messages from before account login
- Messages from other devices (multi-device sync varies)

### Sync Behavior
- Initial sync on first connection
- Real-time updates via events
- Periodic re-sync on reconnection

## Best Practices

1. **Check connection status** before querying
2. **Use pagination** for large lists (default 50, max 100)
3. **Cache contact lookups** to avoid repeated checks
4. **Respect group admin permissions** - only admins can manage participants
5. **Explain limitations** to users about historical data

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| WA_INVALID_JID | Invalid chat/group/contact ID | Verify JID format |
| WA_NOT_CONNECTED | Account not connected | Connect first |
| Permission denied | Not group admin | Need admin rights |
| Not found | Chat/contact doesn't exist | Check spelling |

## References

- [MCP Tools Reference](../docs/MCP-TOOLS.md)
- [WhatsApp Group Management](https://faq.whatsapp.com/)
- [Data Availability](../docs/DATA-LIMITATIONS.md)