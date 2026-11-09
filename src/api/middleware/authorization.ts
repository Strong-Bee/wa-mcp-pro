import type { FastifyRequest } from 'fastify';
import { hasPermission, PERMISSIONS, type Permission, type RolePermission } from '../../security/api-key.js';
import { AppError, ERROR_CODES } from '../../core/errors.js';

function readPermissions(value: unknown): RolePermission[] {
  try {
    const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((permission): permission is RolePermission =>
      typeof permission === 'string' &&
      (permission === '*' || PERMISSIONS.includes(permission as Permission))
    );
  } catch {
    return [];
  }
}

function getRequestPermissions(request: FastifyRequest): RolePermission[] {
  const apiKey = request.apiKey as { permissions?: unknown } | null;
  if (!apiKey) {
    throw new AppError(ERROR_CODES.MCP_AUTH_FAILED, 'Authentication required', 401);
  }
  return readPermissions(apiKey.permissions);
}

export function createAuthorizationMiddleware(requiredPermission: Permission) {
  return async function authorizationMiddleware(request: FastifyRequest): Promise<void> {
    const permissions = getRequestPermissions(request);
    if (!hasPermission(permissions, requiredPermission)) {
      throw new AppError(ERROR_CODES.MCP_PERMISSION_DENIED, `Permission denied: ${requiredPermission}`, 403);
    }
  };
}

/**
 * The low-level MCP tool dispatcher does not currently enforce per-tool scopes.
 * Until per-tool authorization is wired into the dispatcher, require every
 * permission for the remote MCP endpoint rather than allowing a read-only key
 * to invoke write-capable tools.
 */
export async function requireMcpAccess(request: FastifyRequest): Promise<void> {
  const permissions = getRequestPermissions(request);
  const hasFullAccess = PERMISSIONS.every((permission) => hasPermission(permissions, permission));
  if (!hasFullAccess) {
    throw new AppError(
      ERROR_CODES.MCP_PERMISSION_DENIED,
      'Remote MCP currently requires all permissions. Use a full-scope API key or use the scoped REST API.',
      403
    );
  }
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
