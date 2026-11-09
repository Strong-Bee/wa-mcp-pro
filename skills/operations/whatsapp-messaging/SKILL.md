---
name: whatsapp-messaging
description: Sending WhatsApp messages - text, media, location, contacts, reactions
category: operations
version: 1.0.0
author: WA-MCP Pro Team
tags: [messaging, media, text, image, video, document, audio, location, contact]
---

# WhatsApp Messaging Skill

## Purpose
Guide for sending WhatsApp messages via MCP tools.

## When to Use
- Sending text messages
- Sending media (images, videos, documents, audio)
- Sending locations
- Sending contacts
- Reacting to messages
- Deleting messages
- Marking messages as read

## Key MCP Tools

### Text Messages
- `whatsapp_send_message` - Send text message

### Media Messages
- `whatsapp_send_image` - Send image with caption
- `whatsapp_send_video` - Send video with caption
- `whatsapp_send_document` - Send document with filename
- `whatsapp_send_audio` - Send audio/voice message

### Other Message Types
- `whatsapp_send_location` - Send location
- `whatsapp_send_contact` - Send contact card

### Message Interactions
- `whatsapp_reply_message` - Reply to specific message
- `whatsapp_react_message` - Add reaction
- `whatsapp_delete_message` - Delete message
- `whatsapp_mark_read` - Mark as read

### Search
- `whatsapp_search_messages` - Search message history

## Message Sending Patterns

### Text Message
```bash
whatsapp_send_message --account_id "uuid" --to "+1234567890" --message "Hello World!"
```

### With Reply
```bash
whatsapp_send_message --account_id "uuid" --to "+1234567890" --message "Replying to you" --reply_to "message_id"
```

### Image
```bash
whatsapp_send_image --account_id "uuid" --to "+1234567890" --media_path "/path/to/image.jpg" --caption "Nice photo!"
```

### Video
```bash
whatsapp_send_video --account_id "uuid" --to "+1234567890" --media_path "/path/to/video.mp4" --caption "Watch this!"
```

### Document
```bash
whatsapp_send_document --account_id "uuid" --to "+1234567890" --media_path "/path/to/doc.pdf" --filename "report.pdf"
```

### Audio/Voice
```bash
whatsapp_send_audio --account_id "uuid" --to "+1234567890" --media_path "/path/to/audio.ogg"
```

### Location
```bash
whatsapp_send_location --account_id "uuid" --to "+1234567890" --latitude 37.7749 --longitude -122.4194 --name "San Francisco"
```

### Contact
```bash
whatsapp_send_contact --account_id "uuid" --to "+1234567890" --display_name "John Doe" --vcard "BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+1234567890\nEND:VCARD"
```

## Validation Rules

### Recipient Formats
- Phone: `+1234567890` or `1234567890@s.whatsapp.net`
- Group: `1234567890@g.us`
- Auto-normalized by system

### Media Limits
- Max size: 50MB (configurable)
- Allowed MIME types:
  - Images: jpeg, png, gif, webp
  - Videos: mp4, quicktime
  - Audio: mpeg, ogg, mp4
  - Documents: pdf, doc, docx, xls, xlsx

### Text Limits
- Max 4096 characters
- Supports emojis and Unicode

## Best Practices

1. **Validate recipients** before sending
2. **Use reply_to** for contextual conversations
3. **Check connection status** before sending
4. **Handle errors gracefully** - retry on transient failures
5. **Respect rate limits** - don't spam
6. **Confirm before bulk sends** - ask user for confirmation

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| WA_NOT_CONNECTED | Account not connected | Connect first |
| WA_INVALID_RECIPIENT | Invalid phone/JID | Check format |
| WA_MEDIA_TOO_LARGE | File exceeds limit | Compress or split |
| WA_MEDIA_INVALID | Unsupported format | Convert media |
| WA_MESSAGE_SEND_FAILED | WhatsApp error | Check logs, retry |

## Message Flow

```
User Request
    ↓
Validate Input (Zod)
    ↓
Check Connection
    ↓
Normalize JID
    ↓
Call Baileys sendMessage
    ↓
Store in Database
    ↓
Emit Events
    ↓
Return Result
```

## Confirmation for Important Messages

For messages that:
- Go to groups with many members
- Contain sensitive information
- Are part of automated workflows

**Ask user for confirmation** before sending.

## Searching Messages
```bash
whatsapp_search_messages --account_id "uuid" --query "keyword" --limit 50
```

## Marking as Read
```bash
whatsapp_mark_read --account_id "uuid" --chat_jid "+1234567890" --message_ids '["msg1", "msg2"]'
```

## References

- [MCP Tools Reference](../docs/MCP-TOOLS.md)
- [Media Handling Guide](../docs/MEDIA.md)
- [WhatsApp Limits](https://faq.whatsapp.com/)