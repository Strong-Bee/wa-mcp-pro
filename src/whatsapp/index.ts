// Re-export all modules
export * from './types.js';
export * from './jid-utils.js';
export * from './session-manager.js';
export * from './reconnect-manager.js';
export * from './baileys-adapter.js';
export * from './connection-manager.js';

// message-service exports
export type { SendMessageOptions, SendMediaOptions } from './message-service.js';
export {
  sendTextMessage,
  sendMediaMessage,
  sendLocationMessage,
  sendContactMessage,
  reactToMessage,
  deleteMessage,
  getMessages,
  markAsRead,
  searchMessages,
} from './message-service.js';

export * from './contact-service.js';
export * from './chat-service.js';

// group-service exports
export {
  getGroups,
  getGroup,
  getGroupParticipants,
  createGroup,
  addGroupParticipants,
  removeGroupParticipants,
  promoteGroupParticipants,
  demoteGroupParticipants,
  updateGroupSubject,
  updateGroupDescription,
  getGroupInviteCode,
  revokeGroupInviteCode,
  countGroups,
  leaveGroup,
} from './group-service.js';

export * from './media-service.js';
export * from './presence-service.js';
export * from './history-service.js';