import { getConfig } from '../config/env.js';
import { getLogger } from '../core/logger.js';
import { eventBus } from '../core/events.js';

const logger = getLogger().child({ component: 'ReconnectManager' });

interface ReconnectState {
  attempt: number;
  timeoutId?: NodeJS.Timeout;
  isReconnecting: boolean;
}

const reconnectStates = new Map<string, ReconnectState>();

export function scheduleReconnect(
  accountId: string,
  connectFn: () => Promise<void>,
  maxAttempts?: number
): void {
  const config = getConfig();
  const max = maxAttempts ?? config.WHATSAPP_RECONNECT_MAX_ATTEMPTS;

  let state = reconnectStates.get(accountId);
  if (!state) {
    state = { attempt: 0, isReconnecting: false };
    reconnectStates.set(accountId, state);
  }

  if (state.attempt >= max) {
    logger.warn({ accountId, attempt: state.attempt }, 'Max reconnect attempts reached');
    eventBus.emit('whatsapp.connection.error', accountId, new Error('Max reconnect attempts reached'));
    return;
  }

  if (state.isReconnecting) {
    return;
  }

  state.isReconnecting = true;
  state.attempt++;

  const delay = Math.min(1000 * Math.pow(2, state.attempt - 1) + Math.random() * 1000, 30000);

  logger.info({ accountId, attempt: state.attempt, delay }, 'Scheduling reconnect');

  eventBus.emit('whatsapp.disconnected', accountId, { reason: 'reconnecting', attempt: state.attempt });

  state.timeoutId = setTimeout(async () => {
    state!.isReconnecting = false;
    try {
      await connectFn();
    } catch (error) {
      logger.error({ accountId, error }, 'Reconnect failed');
      scheduleReconnect(accountId, connectFn, max);
    }
  }, delay);
}

export function cancelReconnect(accountId: string): void {
  const state = reconnectStates.get(accountId);
  if (state?.timeoutId) {
    clearTimeout(state.timeoutId);
    state.timeoutId = undefined;
  }
  reconnectStates.delete(accountId);
}

export function resetReconnectState(accountId: string): void {
  reconnectStates.delete(accountId);
}

export function getReconnectState(accountId: string): ReconnectState | undefined {
  return reconnectStates.get(accountId);
}

export function isReconnecting(accountId: string): boolean {
  return reconnectStates.get(accountId)?.isReconnecting ?? false;
}