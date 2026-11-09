import { Command } from 'commander';
import { getConfig } from './config/env.js';
import { getLogger } from './core/logger.js';
import { runMigrations } from './database/migrations.js';
import { seedDatabase } from './database/seed.js';
import {
  createAccount,
  connectAccount,
  disconnectAccountSafe,
  logoutAccountSafe,
  listAccounts,
  getAccount,
  getAccountQR,
  getAccountPairingCode,
} from './whatsapp/connection-manager.js';
import { generateApiKey } from './scripts/generate-api-key.js';

const logger = getLogger().child({ component: 'CLI' });

interface StartOptions {
  transport: string;
}

interface AccountAddOptions {
  id: string;
  name: string;
  phone?: string;
}

interface AccountIdOptions {
  id: string;
}

interface PairingCodeOptions {
  id: string;
  phone: string;
}

interface GenerateApiKeyOptions {
  name: string;
  permissions?: string;
  expires?: string;
}

const program = new Command();

program
  .name('wa-mcp')
  .description('WA-MCP Pro - WhatsApp MCP Server')
  .version('1.0.0');

program
  .command('start')
  .description('Start the server')
  .option('--transport <type>', 'Transport type: stdio, http, hybrid', 'stdio')
  .action(async (options: StartOptions) => {
    process.env['MCP_TRANSPORT'] = options.transport;
    await import('./index.js');
  });

program
  .command('account:add')
  .description('Add a new WhatsApp account')
  .requiredOption('--id <uuid>', 'Account ID')
  .requiredOption('--name <name>', 'Account name')
  .option('--phone <number>', 'Phone number')
  .action(async (options: AccountAddOptions) => {
    await runMigrations();
    const accountConfig: { id: string; name: string; phoneNumber?: string } = { id: options.id, name: options.name };
    if (options.phone !== undefined) accountConfig.phoneNumber = options.phone;
    await createAccount(accountConfig);
    logger.info({ id: options.id, name: options.name }, 'Account created');
  });

program
  .command('account:list')
  .description('List all accounts')
  .action(async () => {
    await runMigrations();
    const accounts = await listAccounts();
    console.table(accounts.map(a => ({
      ID: a.id,
      Name: a.name,
      Phone: a.phoneNumber,
      Status: a.status,
    })));
  });

program
  .command('account:connect')
  .description('Connect an account')
  .requiredOption('--id <uuid>', 'Account ID')
  .action(async (options: AccountIdOptions) => {
    await runMigrations();
    await connectAccount(options.id);
    logger.info({ id: options.id }, 'Connection initiated');
  });

program
  .command('account:status')
  .description('Get account status')
  .requiredOption('--id <uuid>', 'Account ID')
  .action(async (options: AccountIdOptions) => {
    await runMigrations();
    const account = await getAccount(options.id);
    if (!account) {
      logger.error('Account not found');
      process.exit(1);
    }
    console.log(JSON.stringify(account, null, 2));
  });

program
  .command('account:disconnect')
  .description('Disconnect an account')
  .requiredOption('--id <uuid>', 'Account ID')
  .action(async (options: AccountIdOptions) => {
    await runMigrations();
    await disconnectAccountSafe(options.id);
    logger.info({ id: options.id }, 'Account disconnected');
  });

program
  .command('account:logout')
  .description('Logout an account')
  .requiredOption('--id <uuid>', 'Account ID')
  .action(async (options: AccountIdOptions) => {
    await runMigrations();
    await logoutAccountSafe(options.id);
    logger.info({ id: options.id }, 'Account logged out');
  });

program
  .command('account:qr')
  .description('Get QR code for account')
  .requiredOption('--id <uuid>', 'Account ID')
  .action(async (options: AccountIdOptions) => {
    await runMigrations();
    const qr = getAccountQR(options.id);
    if (!qr) {
      logger.error('No QR code available');
      process.exit(1);
    }
    console.log(qr);
  });

program
  .command('account:pairing-code')
  .description('Get pairing code for account')
  .requiredOption('--id <uuid>', 'Account ID')
  .requiredOption('--phone <number>', 'Phone number')
  .action(async (options: PairingCodeOptions) => {
    await runMigrations();
    const code = await getAccountPairingCode(options.id, options.phone);
    console.log(code);
  });

program
  .command('db:migrate')
  .description('Run database migrations')
  .action(async () => {
    await runMigrations();
    logger.info('Migrations completed');
  });

program
  .command('db:seed')
  .description('Seed database with default data')
  .action(async () => {
    await runMigrations();
    await seedDatabase();
    logger.info('Database seeded');
  });

program
  .command('generate-api-key')
  .description('Generate a new API key')
  .requiredOption('--name <name>', 'Key name')
  .option('--permissions <permissions>', 'Comma-separated permissions')
  .option('--expires <days>', 'Expiration in days')
  .action(async (options: GenerateApiKeyOptions) => {
    await runMigrations();
    const permissions = options.permissions?.split(',') || [];
    const expiresAt = options.expires ? new Date(Date.now() + parseInt(options.expires) * 86400000) : undefined;
    const { plainKey } = await generateApiKey(options.name, permissions, expiresAt);
    console.log(`API Key: ${plainKey}`);
    logger.warn('Save this key - it will not be shown again!');
  });

program
  .command('doctor')
  .description('Run diagnostics')
  .action(async () => {
    await runMigrations();
    const { exportDiagnostics } = await import('./monitoring/diagnostics.js');
    const report = await exportDiagnostics();
    console.log(report);
  });

program
  .command('version')
  .description('Show version')
  .action(() => {
    const config = getConfig();
    console.log(`${config.APP_NAME} v${config.APP_VERSION}`);
  });

program.parseAsync(process.argv).catch((error) => {
  logger.error({ error }, 'CLI error');
  process.exit(1);
});