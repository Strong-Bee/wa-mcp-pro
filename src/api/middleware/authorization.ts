import { FastifyRequest } from 'fastify';
import { hasPermission, Permission } from '../../security/api-key.js';
import { AppError, ERROR_CODES } from '../../core/errors.js';

export function createAuthorizationMiddleware(requiredPermission: Permission) {
  return async function authorizationMiddleware(request: FastifyRequest): Promise<void> {
    const apiKey = request.apiKey as { permissions: string } | null;
    if (!apiKey) {
      throw new AppError(ERROR_CODES.MCP_AUTH_FAILED, 'Authentication required', 401);
    }

    const permissions = JSON.parse(apiKey.permissions) as string[];
    if (!hasPermission(permissions as Permission[], requiredPermission)) {
      throw new AppError(ERROR_CODES.MCP_PERMISSION_DENIED, `Permission denied: ${requiredPermission}`, 403);
    }
  };
}

export const requireAccountsRead = createAuthorizationMiddleware('accounts:read');
export const requireAccountsManage = createAuthorizationMiddleware('accounts:manage');
export const requireMessagesRead = createAuthorizationMiddleware('messages:read');
export const requireMessagesSend = createAuthorizationMiddleware('messages:send');
export const requireContactsRead = createAuthorizationMiddleware('contacts:read');
export const requireGroupsRead = createAuthorizationMiddleware('groups:read');
export const requireAutomationRead = createAuthorizationMiddleware('automation:read');
export const requireAutomationManage = createAuthorizationMiddleware('automation:manage');
export const requireSystemRead = createAuthorizationMiddleware('system:read');