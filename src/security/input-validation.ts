import { z } from 'zod';
import { ERROR_CODES } from '../config/constants.js';
import { AppError } from '../core/errors.js';

export const phoneNumberSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/);

export const jidSchema = z.string().regex(/^[0-9-]+@(s\.whatsapp\.net|g\.us)$/);

export const messageContentSchema = z.string().min(1).max(4096);

export const mediaSchema = z.object({
  path: z.string().min(1),
  mimetype: z.string().min(1),
  filename: z.string().optional(),
  caption: z.string().optional(),
});

export const automationRuleSchema = z.object({
  name: z.string().min(1).max(100),
  triggerType: z.enum(['keyword', 'exact_match', 'regex', 'command']),
  triggerValue: z.string().min(1),
  response: z.string().min(1),
  enabled: z.boolean().default(true),
  cooldown: z.number().int().nonnegative().default(0),
});

export const sendMessageSchema = z.object({
  to: z.string().min(1),
  message: messageContentSchema,
  replyTo: z.string().optional(),
});

export const sendMediaSchema = z.object({
  to: z.string().min(1),
  media: mediaSchema,
  caption: z.string().optional(),
  replyTo: z.string().optional(),
});

export const createSessionSchema = z.object({
  name: z.string().min(1).max(100),
  phoneNumber: phoneNumberSchema.optional(),
});

export const apiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).default([]),
  expiresAt: z.date().optional(),
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const message = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
      .join('; ');
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, message, 400, { errors });
  }
  return result.data;
}

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const message = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
      .join('; ');
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, `${context ? context + ': ' : ''}${message}`, 400, { errors });
  }
  return result.data;
}