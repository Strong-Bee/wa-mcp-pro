import { ERROR_CODES, ErrorCode } from '../config/constants.js';

export type { ErrorCode };
export { ERROR_CODES };

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly metadata: Record<string, unknown>;
  public readonly correlationId: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    metadata: Record<string, unknown> = {},
    correlationId: string = crypto.randomUUID()
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.metadata = metadata;
    this.correlationId = correlationId;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      metadata: this.metadata,
      correlationId: this.correlationId,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, metadata: Record<string, unknown> = {}, correlationId?: string) {
    super(ERROR_CODES.VALIDATION_ERROR, message, 400, metadata, correlationId);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', metadata: Record<string, unknown> = {}, correlationId?: string) {
    super(ERROR_CODES.MCP_AUTH_FAILED, message, 401, metadata, correlationId);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied', metadata: Record<string, unknown> = {}, correlationId?: string) {
    super(ERROR_CODES.MCP_PERMISSION_DENIED, message, 403, metadata, correlationId);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier: string, correlationId?: string) {
    super(ERROR_CODES.INTERNAL_SERVER_ERROR, `${resource} not found: ${identifier}`, 404, { resource, identifier }, correlationId);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, metadata: Record<string, unknown> = {}, correlationId?: string) {
    super(ERROR_CODES.INTERNAL_SERVER_ERROR, message, 409, metadata, correlationId);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', metadata: Record<string, unknown> = {}, correlationId?: string) {
    super(ERROR_CODES.RATE_LIMIT_EXCEEDED, message, 429, metadata, correlationId);
    this.name = 'RateLimitError';
  }
}

export class WhatsAppError extends AppError {
  constructor(code: ErrorCode, message: string, metadata: Record<string, unknown> = {}, correlationId?: string) {
    super(code, message, 500, metadata, correlationId);
    this.name = 'WhatsAppError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, metadata: Record<string, unknown> = {}, correlationId?: string) {
    super(ERROR_CODES.DATABASE_ERROR, message, 500, metadata, correlationId);
    this.name = 'DatabaseError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown, defaultCode: ErrorCode = ERROR_CODES.INTERNAL_SERVER_ERROR): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(defaultCode, error.message, 500, { originalError: error.name });
  }

  return new AppError(defaultCode, 'Unknown error', 500, { originalError: String(error) });
}