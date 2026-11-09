import { getLogger } from '../core/logger.js';
import { getDatabase } from '../database/client.js';
import { automations } from '../database/schema/automations.js';
import { eq, and } from 'drizzle-orm';

const logger = getLogger().child({ component: 'AutomationScheduler' });

interface ScheduledTask {
  id: string;
  automationId: string;
  cronExpression: string;
  nextRun: Date;
  timeoutId?: NodeJS.Timeout;
}

const scheduledTasks = new Map<string, ScheduledTask>();

export async function scheduleAutomation(automationId: string, cronExpression: string): Promise<void> {
  const existing = scheduledTasks.get(automationId);
  if (existing?.timeoutId) {
    clearTimeout(existing.timeoutId);
  }

  const nextRun = calculateNextRun(cronExpression);
  const delay = nextRun.getTime() - Date.now();

  if (delay <= 0) {
    logger.warn({ automationId }, 'Scheduled time in past, skipping');
    return;
  }

  const timeoutId = setTimeout(async () => {
    await executeScheduledAutomation(automationId);
    scheduleAutomation(automationId, cronExpression);
  }, delay);

  scheduledTasks.set(automationId, {
    id: crypto.randomUUID(),
    automationId,
    cronExpression,
    nextRun,
    timeoutId,
  });

  logger.debug({ automationId, nextRun }, 'Automation scheduled');
}

export async function unscheduleAutomation(automationId: string): Promise<void> {
  const existing = scheduledTasks.get(automationId);
  if (existing?.timeoutId) {
    clearTimeout(existing.timeoutId);
  }
  scheduledTasks.delete(automationId);
  logger.debug({ automationId }, 'Automation unscheduled');
}

async function executeScheduledAutomation(automationId: string): Promise<void> {
  logger.info({ automationId }, 'Executing scheduled automation');
  // This would trigger the automation
}

function calculateNextRun(cronExpression: string): Date {
  // Simple cron parser for basic expressions
  // Format: minute hour day month dayOfWeek
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) {
    return new Date(Date.now() + 60000);
  }

  const now = new Date();
  const next = new Date(now);

  // This is a simplified implementation
  // In production, use a proper cron library like cron-parser
  next.setMinutes(next.getMinutes() + 1);
  next.setSeconds(0);
  next.setMilliseconds(0);

  return next;
}

export async function loadScheduledAutomations(): Promise<void> {
  const db = getDatabase();
  const scheduled = await db
    .select()
    .from(automations)
    .where(and(eq(automations.enabled, true)));

  for (const automation of scheduled) {
    if (automation.triggerType === 'schedule' && automation.triggerValue) {
      await scheduleAutomation(automation.id, automation.triggerValue);
    }
  }

  logger.info({ count: scheduled.length }, 'Scheduled automations loaded');
}

export function getScheduledTasks(): ScheduledTask[] {
  return Array.from(scheduledTasks.values());
}

export function clearScheduler(): void {
  for (const task of scheduledTasks.values()) {
    if (task.timeoutId) {
      clearTimeout(task.timeoutId);
    }
  }
  scheduledTasks.clear();
}