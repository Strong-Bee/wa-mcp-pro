import { AppError, ValidationError } from '../core/errors.js';
import { ERROR_CODES } from '../config/constants.js';

export function normalizeJid(input: string): string {
  let jid = input.trim();

  if (jid.includes('@')) {
    return jid.toLowerCase();
  }

  const digits = jid.replace(/\D/g, '');

  if (digits.length < 10 || digits.length > 15) {
    throw new ValidationError('Invalid phone number length', { input });
  }

  if (digits.endsWith('@g.us') || digits.endsWith('@s.whatsapp.net')) {
    return digits.toLowerCase();
  }

  return `${digits}@s.whatsapp.net`;
}

export function normalizeGroupJid(input: string): string {
  let jid = input.trim();

  if (jid.includes('@g.us')) {
    return jid.toLowerCase();
  }

  const digits = jid.replace(/\D/g, '');

  return `${digits}@g.us`;
}

export function parseJid(jid: string): { user: string; server: string; device?: string } | null {
  const match = jid.match(/^([^@]+)@([^:]+)(?::(\d+))?$/);
  if (!match) return null;

  return {
    user: match[1],
    server: match[2],
    device: match[3],
  };
}

export function isGroupJid(jid: string): boolean {
  return jid.endsWith('@g.us');
}

export function isUserJid(jid: string): boolean {
  return jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid');
}

export function isLidJid(jid: string): boolean {
  return jid.endsWith('@lid');
}

export function getPhoneNumberFromJid(jid: string): string | null {
  const parsed = parseJid(jid);
  if (!parsed) return null;
  return parsed.user;
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits.startsWith('+')) {
    return `+${digits}`;
  }
  return digits;
}

export function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function jidToPhoneNumber(jid: string): string | null {
  const phone = getPhoneNumberFromJid(jid);
  if (!phone) return null;
  return formatPhoneNumber(phone);
}

export function phoneNumberToJid(phone: string): string {
  const formatted = formatPhoneNumber(phone);
  return `${formatted.replace('+', '')}@s.whatsapp.net`;
}