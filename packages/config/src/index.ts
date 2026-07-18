import { z, type ZodTypeAny } from 'zod';
import { ConfigurationError } from '@native-kiln/shared';

export * from './schema.js';

/**
 * Validates `source` against `schema`, failing fast with a clear message that
 * lists the offending KEYS only — never their values (which may be secrets).
 */
export function loadConfig<TSchema extends ZodTypeAny>(
  schema: TSchema,
  source: NodeJS.ProcessEnv = process.env,
): z.infer<TSchema> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;

  const issues = result.error.issues
    .map((issue) => {
      const key = issue.path.join('.') || '(root)';
      return `  - ${key}: ${issue.message}`;
    })
    .sort();

  throw new ConfigurationError(
    `Invalid or missing configuration:\n${issues.join('\n')}`,
    // Only key names are safe to expose.
    { keys: result.error.issues.map((i) => i.path.join('.')).filter(Boolean) },
  );
}
