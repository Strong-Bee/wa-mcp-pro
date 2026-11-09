import { EventEmitter } from 'events';
import { EventType } from '../config/constants.js';
import { getLogger } from './logger.js';

type EventHandler = (...args: unknown[]) => void | Promise<void>;

class EventBus extends EventEmitter {
  private subscriptions: Map<EventType, Set<EventHandler>> = new Map();
  private logger = getLogger().child({ component: 'EventBus' });

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  subscribe(event: EventType, handler: EventHandler): () => void {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }
    this.subscriptions.get(event)!.add(handler);
    this.on(event, handler);

    return () => this.unsubscribe(event, handler);
  }

  unsubscribe(event: EventType, handler: EventHandler): void {
    const handlers = this.subscriptions.get(event);
    if (handlers) {
      handlers.delete(handler);
      this.off(event, handler);
      if (handlers.size === 0) {
        this.subscriptions.delete(event);
      }
    }
  }

  async emitAsync(event: EventType, ...args: unknown[]): Promise<void> {
    this.logger.debug({ event, argCount: args.length }, 'Emitting event');
    this.emitSync(event, ...args);

    const handlers = this.subscriptions.get(event);
    if (handlers) {
      await Promise.allSettled(
        Array.from(handlers).map(async (handler) => {
          try {
            await handler(...args);
          } catch (error) {
            this.logger.error({ event, error }, 'Event handler failed');
          }
        })
      );
    }
  }

  override emit(event: EventType, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  private emitSync(event: EventType, ...args: unknown[]): void {
    super.emit(event, ...args);
  }

  getSubscriptionCount(event: EventType): number {
    return this.subscriptions.get(event)?.size ?? 0;
  }

  getAllSubscriptions(): Map<EventType, number> {
    const result = new Map<EventType, number>();
    for (const [event, handlers] of this.subscriptions) {
      result.set(event, handlers.size);
    }
    return result;
  }

  clear(): void {
    for (const [event, handlers] of this.subscriptions) {
      for (const handler of handlers) {
        this.off(event, handler);
      }
    }
    this.subscriptions.clear();
  }
}

export const eventBus = new EventBus();

export function subscribe(event: EventType, handler: EventHandler): () => void {
  return eventBus.subscribe(event, handler);
}

export function unsubscribe(event: EventType, handler: EventHandler): void {
  eventBus.unsubscribe(event, handler);
}

export async function emit(event: EventType, ...args: unknown[]): Promise<void> {
  await eventBus.emitAsync(event, ...args);
}

export function getEventBus(): EventBus {
  return eventBus;
}