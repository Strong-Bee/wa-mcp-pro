import path from 'path';

export function sanitizeFilename(filename: string): string {
  return path.basename(filename)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
}

export function sanitizePath(input: string, baseDir: string): string {
  const resolved = path.resolve(baseDir, input);
  const base = path.resolve(baseDir);

  if (!resolved.startsWith(base)) {
    throw new Error('Path traversal attempt detected');
  }

  return resolved;
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeSql(input: string): string {
  return input.replace(/'/g, "''");
}

export function sanitizeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripAnsi(input: string): string {
  return input.replace(/\x1b\[[0-9;]*m/g, '');
}

export function truncate(input: string, maxLength: number, suffix: string = '...'): string {
  if (input.length <= maxLength) return input;
  return input.slice(0, maxLength - suffix.length) + suffix;
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

export function removeControlCharacters(input: string): string {
  return input.replace(/[\x00-\x1F\x7F]/g, '');
}

export function escapeMarkdown(input: string): string {
  return input
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
}