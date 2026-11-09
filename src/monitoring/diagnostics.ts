import { getLogger } from '../core/logger.js';
import { getDatabase, isDatabaseConnected, getSqlite } from '../database/client.js';
import { listAccounts } from '../whatsapp/connection-manager.js';
import { getConnectionStatus, getSocket } from '../whatsapp/baileys-adapter.js';

const logger = getLogger().child({ component: 'Diagnostics' });

export interface DiagnosticsReport {
  timestamp: string;
  system: SystemInfo;
  database: DatabaseInfo;
  whatsapp: WhatsAppInfo;
  performance: PerformanceInfo;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  uptime: number;
  pid: number;
}

export interface DatabaseInfo {
  connected: boolean;
  path: string;
  size?: number;
  tables?: TableInfo[];
}

export interface TableInfo {
  name: string;
  rowCount: number;
}

export interface WhatsAppInfo {
  accounts: AccountDiagnostics[];
}

export interface AccountDiagnostics {
  id: string;
  name: string;
  status: string;
  hasSocket: boolean;
  lastActivity?: string;
}

export interface PerformanceInfo {
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  eventLoopLag?: number;
}

export async function generateDiagnostics(): Promise<DiagnosticsReport> {
  const [system, database, whatsapp, performance] = await Promise.all([
    getSystemInfo(),
    getDatabaseInfo(),
    getWhatsAppInfo(),
    getPerformanceInfo(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    system,
    database,
    whatsapp,
    performance,
  };
}

async function getSystemInfo(): Promise<SystemInfo> {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    uptime: process.uptime(),
    pid: process.pid,
  };
}

async function getDatabaseInfo(): Promise<DatabaseInfo> {
  const config = await import('../config/env.js').then(m => m.getConfig());
  const connected = isDatabaseConnected();

  const info: DatabaseInfo = {
    connected,
    path: config.DATABASE_URL,
  };

  if (connected) {
    try {
      const sqlite = getSqlite();
      const tables = sqlite.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as { name: string }[];

      info.tables = [];
      for (const table of tables) {
        const count = sqlite.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
        info.tables.push({ name: table.name, rowCount: count.count });
      }

      const stats = sqlite.prepare('PRAGMA page_count; PRAGMA page_size').all();
      if (stats.length >= 2) {
        const pageCount = (stats[0] as any).page_count;
        const pageSize = (stats[1] as any).page_size;
        info.size = pageCount * pageSize;
      }
    } catch (error) {
      logger.error({ error }, 'Failed to get database info');
    }
  }

  return info;
}

async function getWhatsAppInfo(): Promise<WhatsAppInfo> {
  const accounts = await listAccounts();

  return {
    accounts: accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      status: acc.status,
      hasSocket: !!getSocket(acc.id),
    })),
  };
}

function getPerformanceInfo(): PerformanceInfo {
  return {
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
  };
}

export async function exportDiagnostics(): Promise<string> {
  const report = await generateDiagnostics();
  return JSON.stringify(report, null, 2);
}