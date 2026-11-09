export function formatTimestamp(timestamp: number | Date): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  return date.toISOString();
}

export function parseTimestamp(input: string | number): Date {
  if (typeof input === 'number') {
    return new Date(input);
  }
  const date = new Date(input);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${input}`);
  }
  return date;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
  return `${(ms / 86400000).toFixed(1)}d`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

export function getRelativeTime(from: Date, to: Date = new Date()): string {
  const diff = to.getTime() - from.getTime();
  const absDiff = Math.abs(diff);

  if (absDiff < 10000) return 'just now';
  if (absDiff < 60000) return Math.floor(absDiff / 1000) + 's ago';
  if (absDiff < 3600000) return `${Math.floor(absDiff / 60000)}m ago`;
  if (absDiff < 86400000) return `${Math.floor(absDiff / 3600000)}h ago`;
  if (absDiff < 604800000) return `${Math.floor(absDiff / 86400000)}d ago`;
  return formatTimestamp(from);
}

export function cronToNextRun(cronExpression: string): Date {
  // Simplified - in production use a proper cron library
  const now = new Date();
  return new Date(now.getTime() + 60000);
}