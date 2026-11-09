import { isValidPhoneNumber, formatPhoneNumber, normalizeJid } from './jid.js';

export function parsePhoneNumber(input: string): { valid: boolean; formatted?: string; error?: string } {
  const digits = input.replace(/\D/g, '');

  if (digits.length < 10) {
    return { valid: false, error: 'Phone number too short' };
  }

  if (digits.length > 15) {
    return { valid: false, error: 'Phone number too long' };
  }

  if (!digits.match(/^[1-9]\d{9,14}$/)) {
    return { valid: false, error: 'Invalid phone number format' };
  }

  return { valid: true, formatted: formatPhoneNumber(input) };
}

export function validatePhoneNumber(input: string): boolean {
  return isValidPhoneNumber(input);
}

export function toInternationalFormat(input: string): string {
  return formatPhoneNumber(input);
}

export function toNationalFormat(input: string, countryCode: string = '1'): string {
  const parsed = parsePhoneNumber(input);
  if (!parsed.valid || !parsed.formatted) {
    throw new Error('Invalid phone number');
  }

  const digits = parsed.formatted.replace('+', '');
  if (digits.startsWith(countryCode)) {
    return digits.slice(countryCode.length);
  }
  return digits;
}

export function extractCountryCode(input: string): string | null {
  const parsed = parsePhoneNumber(input);
  if (!parsed.valid || !parsed.formatted) return null;

  const digits = parsed.formatted.replace('+', '');
  if (digits.startsWith('1')) return '1';
  if (digits.startsWith('44')) return '44';
  if (digits.startsWith('91')) return '91';
  if (digits.startsWith('86')) return '86';
  if (digits.startsWith('49')) return '49';
  if (digits.startsWith('33')) return '33';

  return digits.slice(0, 3);
}

export function maskPhoneNumber(input: string): string {
  const parsed = parsePhoneNumber(input);
  if (!parsed.valid || !parsed.formatted) return input;

  const formatted = parsed.formatted;
  if (formatted.length <= 4) return formatted;

  return formatted.slice(0, -4).replace(/\d/g, '*') + formatted.slice(-4);
}