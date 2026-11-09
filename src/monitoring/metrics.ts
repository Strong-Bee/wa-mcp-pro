import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'Metrics' });

interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

const metricsBuffer: MetricData[] = [];
const MAX_BUFFER_SIZE = 1000;

export function recordMetric(name: string, value: number, labels?: Record<string, string>): void {
  const metric: MetricData = {
    name,
    value,
    labels,
    timestamp: new Date(),
  };

  metricsBuffer.push(metric);
  if (metricsBuffer.length > MAX_BUFFER_SIZE) {
    metricsBuffer.shift();
  }
}

export function incrementCounter(name: string, labels?: Record<string, string>): void {
  recordMetric(name, 1, labels);
}

export function recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
  recordMetric(name, value, labels);
}

export function recordGauge(name: string, value: number, labels?: Record<string, string>): void {
  recordMetric(name, value, labels);
}

export function getMetrics(name?: string): MetricData[] {
  if (name) {
    return metricsBuffer.filter(m => m.name === name);
  }
  return [...metricsBuffer];
}

export function clearMetrics(): void {
  metricsBuffer.length = 0;
}

export function getMetricsSummary(): Record<string, { count: number; sum: number; avg: number; min: number; max: number }> {
  const summary: Record<string, { count: number; sum: number; avg: number; min: number; max: number }> = {};

  for (const metric of metricsBuffer) {
    if (!summary[metric.name]) {
      summary[metric.name] = { count: 0, sum: 0, avg: 0, min: Infinity, max: -Infinity };
    }
    const s = summary[metric.name];
    s.count++;
    s.sum += metric.value;
    s.min = Math.min(s.min, metric.value);
    s.max = Math.max(s.max, metric.value);
  }

  for (const key of Object.keys(summary)) {
    summary[key].avg = summary[key].sum / summary[key].count;
  }

  return summary;
}

setInterval(() => {
  const summary = getMetricsSummary();
  logger.debug({ metrics: summary }, 'Metrics summary');
}, 60000);