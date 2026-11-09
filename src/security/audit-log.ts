import { getLogger } from '../core/logger.js';
import { createAuditLog } from '../database/repositories/audit_logs.js';
import { sanitizeForLog } from './secret-redaction.js';

const logger = getLogger().child({ component: 'AuditLog' });

export interface AuditLogEntry {
  accountId?: string;
  actor: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  metadata?: Record<string, unknown>;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const sanitizedMetadata = entry.metadata ? sanitizeForLog(entry.metadata) : undefined;
    await createAuditLog({
      accountId: entry.accountId ?? null,
      actor: entry.actor,
      action: entry.action,
      resource: entry.resource,
      result: entry.result,
      metadata: sanitizedMetadata as Record<string, unknown> | null,
    });
  } catch (error) {
    logger.error({ error, entry }, 'Failed to write audit log');
  }
}

export function createAuditLogger(accountId?: string) {
  return {
    success: (actor: string, action: string, resource: string, metadata?: Record<string, unknown>) =>
      logAudit({ accountId, actor, action, resource, result: 'success', metadata }),
    failure: (actor: string, action: string, resource: string, metadata?: Record<string, unknown>) =>
      logAudit({ accountId, actor, action, resource, result: 'failure', metadata }),
  };
}