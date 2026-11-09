import { PERMISSIONS, Permission, hasPermission as checkPermission, getPermissionsForRole } from './api-key.js';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'Permissions' });

export function checkUserPermission(
  userPermissions: Permission[],
  required: Permission | Permission[]
): boolean {
  const requiredArray = Array.isArray(required) ? required : [required];
  return requiredArray.every(p => checkPermission(userPermissions, p));
}

export function requirePermission(
  userPermissions: Permission[],
  required: Permission | Permission[]
): void {
  if (!checkUserPermission(userPermissions, required)) {
    const requiredArray = Array.isArray(required) ? required : [required];
    logger.warn({ userPermissions, required: requiredArray }, 'Permission denied');
    throw new Error(`Missing required permission: ${requiredArray.join(', ')}`);
  }
}

export function getEffectivePermissions(
  role: string,
  additionalPermissions: Permission[] = []
): Permission[] {
  const rolePermissions = getPermissionsForRole(role);
  const allPermissions = new Set<Permission>([...rolePermissions, ...additionalPermissions]);
  return Array.from(allPermissions);
}