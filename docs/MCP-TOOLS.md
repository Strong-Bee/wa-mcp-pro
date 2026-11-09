# MCP Tools Reference

Complete reference for all 17 MCP tools available in WA-MCP Pro.

## Connection Tools

### `whatsapp_connect`
Connect a WhatsApp account.

**Input:**
```json
{
  "account_id": "string (uuid)"
}
```

**Output:**
```json
{
  "message": "Account {account_id} connection initiated"
}
```

**Errors:** `WA_CONNECTION_FAILED`, `WA_AUTH_REQUIRED`

---

### `whatsapp_disconnect`
Disconnect a WhatsApp account (keeps session).

**Input:**
```json
{
  "account_id": "string (uuid)"
}
```

**Output:**
```json
{
  "message": "Account {account_id} disconnected"
}
```

---

### `whatsapp_logout`
Logout a WhatsApp account (removes session).

**Input:**
```json
{
  "account_id": "string (uuid)"
}
```

**Output:**
```json
{
  "message": "Account {account_id} logged out"
}
```

---

### `whatsapp_get_status`
Get connection status of an account.

**Input:**
```json
{
  "account_id": "string (uuid)"
}
```

**Output:**
```json
{
  "account_id": "string",
  "status": "disconnected|connecting|qr_pending|authenticated|connected|reconnecting|logged_out|error"
}
```

---

### `whatsapp_get_qr`
Get QR code for authentication.

**Input:**
```json
{
  "account_id": "string (uuid)"
}
```

**Output:**
```json
{
  "qr": "string (QR code data URI)"
}
```

**Errors:** `WA_AUTH_REQUIRED` - No QR available

---

### `whatsapp_get_pairing_code`
Get pairing code for authentication.

**Input:**
```json
{
  "account_id": "string (uuid)",
  "phone_number": "string (international format)"
}
```

**Output:**
```json
{
  "code": "string (pairing code)"
}
```

---

### `whatsapp_list_accounts`
List all WhatsApp accounts.

**Input:** `{}`

**Output:**
```json
[
  {
    "id": "uuid",
    "name": "string",
    "phone_number": "string",
    "status": "string"
  }
]
```

---

### `whatsapp_create_account`
Create a new WhatsApp account.

**Input:**
```json
{
  "id": "string (uuid)",
  "name": "string",
  "phone_number": "string (optional)"
}
```

**Output:**
```json
{
  "message": "Account {name} ({id}) created"
}
```

---

## Messaging Tools

### `whatsapp_send_message`
Send a text message.

**Input:**
```json
{
  "account_id": "uuid",
  "to": "string (phone or JID)",
  "message": "string (max 4096 chars)",
  "reply_to": "string (message ID, optional)"
}
```

**Output:**
```json
{
  "message_id": "string",
  "status": "pending|sent|failed",
  "timestamp": "ISO8601"
}
```

---

### `whatsapp_send_image`
Send an image.

**Input:**
```json
{
  "account_id": "uuid",
  "to": "string",
  "media_path": "string (local file path)",
  "caption": "string (optional)",
  "reply_to": "string (optional)"
}
```

**Output:** Same as send_message

---

### `whatsapp_send_video`
Send a video.

**Input:**
```json
{
  "account_id": "uuid",
  "to": "string",
  "media_path": "string",
  "caption": "string (optional)",
  "reply_to": "string (optional)"
}
```

---

### `whatsapp_send_document`
Send a document.

**Input:**
```json
{
  "account_id": "uuid",
  "to": "string",
  "media_path": "string",
  "filename": "string (optional)",
  "caption": "string (optional)",
  "reply_to": "string (optional)"
}
```

---

### `whatsapp_send_audio`
Send an audio file.

**Input:**
```json
{
  "account_id": "uuid",
  "to": "string",
  "media_path": "string",
  "reply_to": "string (optional)"
}
```

---

### `whatsapp_send_location`
Send a location.

**Input:**
```json
{
  "account_id": "uuid",
  "to": "string",
  "latitude": "number",
  "longitude": "number",
  "name": "string (optional)",
  "address": "string (optional)"
}
```

---

### `whatsapp_send_contact`
Send a contact card.

**Input:**
```json
{
  "account_id": "uuid",
  "to": "string",
  "display_name": "string",
  "vcard": "string (vCard format)"
}
```

---

### `whatsapp_react_message`
React to a message.

**Input:**
```json
{
  "account_id": "uuid",
  "to": "string (chat JID)",
  "message_id": "string",
  "reaction": "string (emoji)"
}
```

**Output:**
```json
{
  "success": true
}
```

---

### `whatsapp_delete_message`
Delete a message.

**Input:**
```json
{
  "account_id": "uuid",
  "message_id": "string",
  "remote_jid": "string (chat JID)"
}
```

**Output:**
```json
{
  "success": true
}
```

---

### `whatsapp_mark_read`
Mark messages as read.

**Input:**
```json
{
  "account_id": "uuid",
  "chat_jid": "string",
  "message_ids": "string[]"
}
```

**Output:**
```json
{
  "success": true
}
```

---

### `whatsapp_search_messages`
Search messages.

**Input:**
```json
{
  "account_id": "uuid",
  "query": "string",
  "limit": "number (default 50, max 100)"
}
```

**Output:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "chat_jid": "string",
      "sender_jid": "string",
      "message_type": "string",
      "message_content": "string",
      "direction": "inbound|outbound",
      "timestamp": "ISO8601",
      "status": "string"
    }
  ]
}
```

---

## Contact Tools

### `whatsapp_get_contacts`
List contacts.

**Input:**
```json
{
  "account_id": "uuid",
  "limit": "number (default 50)",
  "offset": "number (default 0)",
  "search": "string (optional)"
}
```

---

### `whatsapp_get_contact`
Get contact details.

**Input:**
```json
{
  "account_id": "uuid",
  "jid": "string"
}
```

**Output:**
```json
{
  "id": "uuid",
  "jid": "string",
  "name": "string|null",
  "phone_number": "string|null",
  "profile_picture_url": "string|null"
}
```

---

### `whatsapp_check_number`
Check if phone number is on WhatsApp.

**Input:**
```json
{
  "account_id": "uuid",
  "phone_number": "string"
}
```

**Output:**
```json
{
  "exists": "boolean",
  "jid": "string|null"
}
```

---

### `whatsapp_get_profile_picture`
Get contact profile picture.

**Input:**
```json
{
  "account_id": "uuid",
  "jid": "string"
}
```

**Output:**
```json
{
  "jid": "string",
  "profile_picture_url": "string|null"
}
```

---

### `whatsapp_search_contacts`
Search contacts.

**Input:**
```json
{
  "account_id": "uuid",
  "query": "string",
  "limit": "number (default 50)"
}
```

---

## Chat Tools

### `whatsapp_get_chats`
List chats.

**Input:**
```json
{
  "account_id": "uuid",
  "limit": "number (default 50)",
  "offset": "number (default 0)",
  "is_group": "boolean (optional)",
  "search": "string (optional)"
}
```

---

### `whatsapp_get_chat`
Get chat details.

**Input:**
```json
{
  "account_id": "uuid",
  "chat_jid": "string"
}
```

**Output:**
```json
{
  "id": "uuid",
  "chat_jid": "string",
  "name": "string|null",
  "is_group": "boolean",
  "unread_count": "number",
  "last_message_timestamp": "ISO8601|null"
}
```

---

### `whatsapp_get_messages`
Get chat message history.

**Input:**
```json
{
  "account_id": "uuid",
  "chat_jid": "string",
  "limit": "number (default 50, max 500)",
  "before": "ISO8601 (optional)"
}
```

---

### `whatsapp_mark_as_read`
Mark chat as read.

**Input:**
```json
{
  "account_id": "uuid",
  "chat_jid": "string",
  "message_ids": "string[]"
}
```

---

### `whatsapp_archive_chat`
Archive/unarchive chat.

**Input:**
```json
{
  "account_id": "uuid",
  "chat_jid": "string",
  "archive": "boolean (default true)"
}
```

---

### `whatsapp_get_unread_count`
Get total unread count.

**Input:**
```json
{
  "account_id": "uuid"
}
```

**Output:**
```json
{
  "account_id": "uuid",
  "unread_count": "number"
}
```

---

### `whatsapp_search_chats`
Search chats.

**Input:**
```json
{
  "account_id": "uuid",
  "query": "string",
  "limit": "number (default 50)"
}
```

---

## Group Tools

### `whatsapp_get_groups`
List groups.

**Input:**
```json
{
  "account_id": "uuid",
  "limit": "number (default 50)",
  "offset": "number (default 0)"
}
```

---

### `whatsapp_get_group_info`
Get group details.

**Input:**
```json
{
  "account_id": "uuid",
  "group_jid": "string"
}
```

**Output:**
```json
{
  "id": "uuid",
  "group_jid": "string",
  "subject": "string",
  "description": "string|null",
  "owner": "string",
  "participants": [
    {
      "jid": "string",
      "role": "admin|superadmin|member"
    }
  ],
  "created_at": "ISO8601"
}
```

---

### `whatsapp_get_group_members`
Get group participants.

**Input:**
```json
{
  "account_id": "uuid",
  "group_jid": "string"
}
```

**Output:**
```json
{
  "participants": [
    {
      "jid": "string",
      "role": "admin|superadmin|member"
    }
  ]
}
```

---

### `whatsapp_create_group`
Create a new group.

**Input:**
```json
{
  "account_id": "uuid",
  "subject": "string",
  "participants": "string[] (phone numbers or JIDs)"
}
```

**Output:**
```json
{
  "group_id": "string (group JID)"
}
```

---

### `whatsapp_add_group_participant`
Add participants to group.

**Input:**
```json
{
  "account_id": "uuid",
  "group_jid": "string",
  "participants": "string[]"
}
```

---

### `whatsapp_remove_group_participant`
Remove participants from group.

**Input:**
```json
{
  "account_id": "uuid",
  "group_jid": "string",
  "participants": "string[]"
}
```

---

### `whatsapp_promote_group_participant`
Promote participants to admin.

**Input:**
```json
{
  "account_id": "uuid",
  "group_jid": "string",
  "participants": "string[]"
}
```

---

### `whatsapp_demote_group_participant`
Demote participants from admin.

**Input:**
```json
{
  "account_id": "uuid",
  "group_jid": "string",
  "participants": "string[]"
}
```

---

### `whatsapp_update_group_subject`
Update group subject.

**Input:**
```json
{
  "account_id": "uuid",
  "group_jid": "string",
  "subject": "string"
}
```

---

### `whatsapp_update_group_description`
Update group description.

**Input:**
```json
{
  "account_id": "uuid",
  "group_jid": "string",
  "description": "string"
}
```

---

### `whatsapp_get_group_invite`
Get group invite code.

**Input:**
```json
{
  "account_id": "uuid",
  "group_jid": "string"
}
```

**Output:**
```json
{
  "invite_code": "string"
}
```

---

### `whatsapp_revoke_group_invite`
Revoke group invite code.

**Input:**
```json
{
  "account_id": "uuid",
  "group_jid": "string"
}
```

**Output:**
```json
{
  "invite_code": "string (new code)"
}
```

---

### `whatsapp_leave_group`
Leave a group.

**Input:**
```json
{
  "account_id": "uuid",
  "group_jid": "string"
}
```

---

## Media Tools

### `whatsapp_download_media`
Download media from message.

**Input:**
```json
{
  "account_id": "uuid",
  "message_id": "string",
  "chat_jid": "string",
  "message_type": "string"
}
```

**Output:**
```json
{
  "path": "string (local file path)",
  "mimetype": "string",
  "filename": "string",
  "size": "number (bytes)"
}
```

---

### `whatsapp_validate_media`
Validate media before sending.

**Input:**
```json
{
  "mimetype": "string",
  "size": "number (bytes)"
}
```

**Output:**
```json
{
  "valid": "boolean",
  "error": "string (if invalid)"
}
```

---

### `whatsapp_get_media_info`
Get media file info.

**Input:**
```json
{
  "account_id": "uuid",
  "file_path": "string"
}
```

**Output:**
```json
{
  "size": "number",
  "mimetype": "string"
}
```

---

### `whatsapp_cleanup_media`
Clean up old media files.

**Input:**
```json
{
  "account_id": "uuid",
  "older_than_days": "number (default 30)"
}
```

**Output:**
```json
{
  "deleted": "number"
}
```

---

## Automation Tools

### `whatsapp_create_auto_reply`
Create auto-reply rule.

**Input:**
```json
{
  "account_id": "uuid",
  "name": "string",
  "trigger_type": "keyword|exact_match|regex|command",
  "trigger_value": "string",
  "response": "string",
  "enabled": "boolean (default true)",
  "cooldown": "number (seconds, default 0)"
}
```

---

### `whatsapp_list_auto_reply`
List auto-reply rules.

**Input:**
```json
{
  "account_id": "uuid",
  "limit": "number (default 50)",
  "offset": "number (default 0)",
  "enabled": "boolean (optional)"
}
```

---

### `whatsapp_get_auto_reply`
Get auto-reply rule details.

**Input:**
```json
{
  "account_id": "uuid",
  "automation_id": "uuid"
}
```

---

### `whatsapp_update_auto_reply`
Update auto-reply rule.

**Input:**
```json
{
  "account_id": "uuid",
  "automation_id": "uuid",
  "name": "string (optional)",
  "trigger_type": "keyword|exact_match|regex|command (optional)",
  "trigger_value": "string (optional)",
  "response": "string (optional)",
  "enabled": "boolean (optional)",
  "cooldown": "number (optional)"
}
```

---

### `whatsapp_delete_auto_reply`
Delete auto-reply rule.

**Input:**
```json
{
  "account_id": "uuid",
  "automation_id": "uuid"
}
```

---

### `whatsapp_toggle_auto_reply`
Enable/disable auto-reply rule.

**Input:**
```json
{
  "account_id": "uuid",
  "automation_id": "uuid"
}
```

---

## System Tools

### `whatsapp_health_check`
Check system health.

**Input:**
```json
{
  "account_id": "uuid (optional)"
}
```

**Output:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "ISO8601",
  "uptime": "number (seconds)",
  "version": "string",
  "memory": "object",
  "database": "connected|disconnected",
  "whatsapp": {
    "account_id": "uuid",
    "status": "string"
  } (if account_id provided)
}
```

---

### `whatsapp_get_metrics`
Get system metrics.

**Input:**
```json
{
  "account_id": "uuid (optional)"
}
```

**Output:**
```json
{
  "total_messages": "number",
  "uptime": "number",
  "memory_usage": "object",
  "cpu_usage": "object"
}
```

---

### `whatsapp_get_version`
Get application version.

**Input:** `{}`

**Output:**
```json
{
  "name": "WA-MCP-Pro",
  "version": "1.0.0",
  "node_version": "string"
}
```

---

### `whatsapp_get_capabilities`
Get available capabilities.

**Input:** `{}`

**Output:**
```json
{
  "transports": ["stdio", "http"],
  "authentication": ["qr", "pairing_code"],
  "messaging": ["text", "image", "video", "document", "audio", "location", "contact"],
  "groups": ["create", "manage_participants", "update_info", "invite"],
  "automation": ["keyword", "exact_match", "regex", "command"],
  "media": ["download", "validate", "cleanup"],
  "database": "sqlite",
  "multi_account": true
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `WA_NOT_CONNECTED` | 500 | WhatsApp not connected |
| `WA_CONNECTION_FAILED` | 500 | Connection failed |
| `WA_AUTH_REQUIRED` | 401 | Authentication required |
| `WA_SESSION_EXPIRED` | 401 | Session expired |
| `WA_INVALID_JID` | 400 | Invalid JID |
| `WA_INVALID_RECIPIENT` | 400 | Invalid recipient |
| `WA_MESSAGE_SEND_FAILED` | 500 | Message send failed |
| `WA_MEDIA_INVALID` | 400 | Invalid media |
| `WA_MEDIA_TOO_LARGE` | 400 | Media too large |
| `MCP_TOOL_ERROR` | 500 | Tool execution error |
| `MCP_AUTH_FAILED` | 401 | Authentication failed |
| `MCP_PERMISSION_DENIED` | 403 | Permission denied |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Internal error |

---

## Response Format

All tools return:
```json
{
  "content": [
    {
      "type": "text",
      "text": "JSON string or plain text"
    }
  ]
}
```

Errors are thrown as MCP errors with structured error objects.