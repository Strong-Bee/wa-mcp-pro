import pino, { Logger, LoggerOptions } from 'pino';
import { getConfig } from '../config/env.js';
import path from 'path';
import fs from 'fs';

let loggerInstance: Logger | null = null;

export function createLogger(options?: Partial<LoggerOptions>): Logger {
  const config = getConfig();

  const logDir = config.LOG_DIRECTORY;
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const transports: pino.TransportTargetOptions[] = [
    {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
      level: config.LOG_LEVEL,
    },
  ];

  if (config.NODE_ENV === 'production') {
    transports.push({
      target: 'pino/file',
      options: {
        destination: path.join(logDir, 'app.log'),
        mkdir: true,
      },
      level: config.LOG_LEVEL,
    });

    transports.push({
      target: 'pino/file',
      options: {
        destination: path.join(logDir, 'error.log'),
        mkdir: true,
      },
      level: 'error',
    });
  }

  const logger = pino({
    level: config.LOG_LEVEL,
    transport: {
      targets: transports,
    },
    base: {
      service: config.APP_NAME,
      version: config.APP_VERSION,
    },
    ...options,
  });

  return logger;
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = createLogger();
  }
  return loggerInstance;
}

export function setLogger(logger: Logger): void {
  loggerInstance = logger;
}

export function createChildLogger(bindings: Record<string, unknown>): Logger {
  return getLogger().child(bindings);
}