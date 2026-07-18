/**
 * Typed domain errors. These map to safe API responses; provider- and
 * infrastructure-specific details must never leak to the browser.
 */

export type DomainErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INVALID_STATE_TRANSITION'
  | 'CONFIGURATION'
  | 'INTERNAL';

const HTTP_STATUS: Record<DomainErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INVALID_STATE_TRANSITION: 409,
  CONFIGURATION: 500,
  INTERNAL: 500,
};

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  /** Machine-readable, safe-to-expose context. Never place secrets here. */
  public readonly details?: Record<string, unknown>;

  constructor(code: DomainErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }

  get httpStatus(): number {
    return HTTP_STATUS[this.code];
  }

  toSafeResponse(): {
    error: { code: DomainErrorCode; message: string; details?: Record<string, unknown> };
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION', message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Resource not found', details?: Record<string, unknown>) {
    super('NOT_FOUND', message, details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFLICT', message, details);
    this.name = 'ConflictError';
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super('INVALID_STATE_TRANSITION', `Cannot transition from ${from} to ${to}`, { from, to });
    this.name = 'InvalidStateTransitionError';
  }
}

export class ConfigurationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFIGURATION', message, details);
    this.name = 'ConfigurationError';
  }
}

export function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError;
}
