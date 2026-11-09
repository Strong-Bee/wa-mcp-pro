import { getLogger } from './logger.js';
import { eventBus } from './events.js';

type LifecycleHook = () => void | Promise<void>;

interface LifecycleHooks {
  onStart: LifecycleHook[];
  onStop: LifecycleHook[];
  onRestart: LifecycleHook[];
}

const hooks: LifecycleHooks = {
  onStart: [],
  onStop: [],
  onRestart: [],
};

let isShuttingDown = false;
let isStarted = false;

export function onStart(hook: LifecycleHook): () => void {
  hooks.onStart.push(hook);
  return () => {
    const index = hooks.onStart.indexOf(hook);
    if (index !== -1) {
      hooks.onStart.splice(index, 1);
    }
  };
}

export function onStop(hook: LifecycleHook): () => void {
  hooks.onStop.push(hook);
  return () => {
    const index = hooks.onStop.indexOf(hook);
    if (index !== -1) {
      hooks.onStop.splice(index, 1);
    }
  };
}

export function onRestart(hook: LifecycleHook): () => void {
  hooks.onRestart.push(hook);
  return () => {
    const index = hooks.onRestart.indexOf(hook);
    if (index !== -1) {
      hooks.onRestart.splice(index, 1);
    }
  };
}

export async function start(): Promise<void> {
  if (isStarted) {
    getLogger().warn('Lifecycle already started');
    return;
  }

  const logger = getLogger().child({ component: 'Lifecycle' });
  logger.info('Starting application lifecycle');

  try {
    await Promise.all(hooks.onStart.map((hook) => hook()));
    isStarted = true;
    logger.info('Application lifecycle started successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to start application lifecycle');
    throw error;
  }
}

export async function stop(): Promise<void> {
  if (isShuttingDown) {
    getLogger().warn('Shutdown already in progress');
    return;
  }

  isShuttingDown = true;
  const logger = getLogger().child({ component: 'Lifecycle' });
  logger.info('Stopping application lifecycle');

  try {
    await Promise.all(hooks.onStop.map((hook) => hook()));
    eventBus.clear();
    isStarted = false;
    logger.info('Application lifecycle stopped successfully');
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    throw error;
  }
}

export async function restart(): Promise<void> {
  const logger = getLogger().child({ component: 'Lifecycle' });
  logger.info('Restarting application lifecycle');

  await stop();
  await Promise.all(hooks.onRestart.map((hook) => hook()));
  await start();

  logger.info('Application lifecycle restarted successfully');
}

export function isRunning(): boolean {
  return isStarted && !isShuttingDown;
}

export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}

process.on('SIGINT', async () => {
  getLogger().info('Received SIGINT, initiating graceful shutdown');
  await stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  getLogger().info('Received SIGTERM, initiating graceful shutdown');
  await stop();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  getLogger().fatal({ error }, 'Uncaught exception');
  stop().finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  getLogger().fatal({ reason }, 'Unhandled rejection');
  stop().finally(() => process.exit(1));
});