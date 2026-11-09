import { getLogger } from '../core/logger.js';
import { getDatabase, isDatabaseConnected, getClient } from '../database/client.js';
import { getConnectionStatus } from '../whatsapp/baileys-adapter.js';
import { listAccounts } from '../whatsapp/connection-manager.js';
import { sql } from 'drizzle-orm';

const logger = getLogger().child({ component: 'Health' });

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: Record<string, { status: 'ok' | 'failed'; message?: string }>;
}

export async function checkHealth(): Promise<HealthCheckResult> {
  const checks: Record<string, { status: 'ok' | 'failed'; message?: string }> = {};

  checks.database = await checkDatabase();
  checks.whatsapp = await checkWhatsApp();
  checks.memory = checkMemory();

  const failedChecks = Object.values(checks).filter(c => c.status === 'failed').length;
  const status = failedChecks === 0 ? 'healthy' : failedChecks < Object.keys(checks).length ? 'degraded' : 'unhealthy';

  return {
    status,
    timestamp: new Date().toISOString(),
    checks,
  };
}

async function checkDatabase(): Promise<{ status: 'ok' | 'failed'; message?: string }> {
  try {
    const connected = isDatabaseConnected();
    if (!connected) {
      return { status: 'failed', message: 'Database not connected' };
    }

    const client = getClient();
    await client.execute('SELECT 1');
    return { status: 'ok' };
  } catch (error) {
    return { status: 'failed', message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function checkWhatsApp(): Promise<{ status: 'ok' | 'failed'; message?: string }> {
  try {
    const accounts = await listAccounts();
    if (accounts.length === 0) {
      return { status: 'ok', message: 'No accounts configured' };
    }

    const connected = accounts.filter(a => a.status === 'connected').length;
    if (connected === 0) {
      return { status: 'failed', message: 'No WhatsApp accounts connected' };
    }

    return { status: 'ok', message: `${connected}/${accounts.length} accounts connected` };
  } catch (error) {
    return { status: 'failed', message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function checkMemory(): { status: 'ok' | 'failed'; message?: string } {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const usagePercent = Math.round((usage.heapUsed / usage.heapTotal) * 100);

  if (usagePercent > 90) {
    return { status: 'failed', message: `High memory usage: ${usagePercent}% (${heapUsedMB}/${heapTotalMB} MB)` };
  }

  return { status: 'ok', message: `Memory: ${usagePercent}% (${heapUsedMB}/${heapTotalMB} MB)` };
}