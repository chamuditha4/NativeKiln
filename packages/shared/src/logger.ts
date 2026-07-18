import { pino, type Logger, type LoggerOptions } from 'pino';

/**
 * Structured JSON logger with correlation fields. Never log whole request
 * bodies or secret values. Redaction of known secret values happens at the
 * point of use via the Redactor; this logger also drops common secret-shaped
 * keys defensively.
 */

export type CorrelationFields = {
  requestId?: string;
  buildId?: string;
  projectId?: string;
  runnerId?: string;
  jobAttempt?: number;
};

const REDACT_PATHS = [
  'password',
  '*.password',
  'secret',
  '*.secret',
  'token',
  '*.token',
  'authorization',
  '*.authorization',
  'req.headers.authorization',
  'req.headers.cookie',
  'CREDENTIAL_MASTER_KEY',
  'SESSION_SECRET',
];

export function createLogger(
  service: string,
  level: string = process.env.LOG_LEVEL ?? 'info',
  options: LoggerOptions = {},
): Logger {
  return pino({
    level,
    base: { service },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    ...options,
  });
}

export type { Logger };
