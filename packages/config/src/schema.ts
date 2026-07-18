import { z } from 'zod';

/**
 * Environment schema. Grouped for readability. Services load the subset they
 * need via `loadConfig`. Validation never echoes secret VALUES — only key names.
 */

const booleanFromString = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const port = z.coerce.number().int().min(1).max(65535);

/** 64 hex chars == 32 bytes == AES-256 key. */
const hex32 = z.string().regex(/^[0-9a-fA-F]{64}$/, 'must be 64 hex characters (32 bytes)');

export const runtimeSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  APP_BASE_URL: z.string().url(),
  API_BASE_URL: z.string().url(),
  API_PORT: port.default(4000),
  WEB_PORT: port.default(3000),
});

export const databaseSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

export const redisSchema = z.object({
  REDIS_URL: z.string().min(1),
});

export const securitySchema = z.object({
  SESSION_SECRET: z.string().min(32, 'must be at least 32 characters'),
  CREDENTIAL_MASTER_KEY: hex32,
  CREDENTIAL_KEY_VERSION: z.coerce.number().int().positive().default(1),
});

/**
 * S3-compatible object storage. Works with Cloudflare R2 (set S3_ENDPOINT_URL to
 * the account endpoint) and any other S3-compatible provider. A single bucket is
 * used, partitioned by prefix for artifacts, logs, and source archives.
 */
export const storageSchema = z.object({
  S3_BUCKET: z.string().min(1),
  // R2 uses the pseudo-region "auto".
  S3_REGION: z.string().min(1).default('auto'),
  // Required for R2 and other non-AWS providers; omit for real AWS S3.
  S3_ENDPOINT_URL: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  // Path-style addressing is the most reliable across S3-compatible providers.
  S3_FORCE_PATH_STYLE: booleanFromString.default('true'),
  // Key prefixes partitioning the single bucket into logical stores.
  S3_PREFIX_ARTIFACTS: z.string().default('artifacts/'),
  S3_PREFIX_LOGS: z.string().default('logs/'),
  S3_PREFIX_SOURCES: z.string().default('sources/'),
});

export const androidSchema = z.object({
  ANDROID_BUILD_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  ANDROID_BUILD_MEMORY: z.string().min(1).default('6g'),
  ANDROID_BUILD_CPUS: z.string().min(1).default('2'),
  ANDROID_BUILD_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(3600),
  ANDROID_BUILD_IMAGE: z.string().min(1).default('native-kiln/expo-android:latest'),
});

export const retentionSchema = z.object({
  ARTIFACT_RETENTION_DAYS: z.coerce.number().int().min(1).default(30),
});

export const runnerManagerSchema = z.object({
  RUNNER_MANAGER_PORT: port.default(4100),
  DISK_USAGE_LIMIT_PERCENT: z.coerce.number().int().min(1).max(100).default(90),
});

/** Full schema — the union of every group. */
export const fullSchema = runtimeSchema
  .merge(databaseSchema)
  .merge(redisSchema)
  .merge(securitySchema)
  .merge(storageSchema)
  .merge(androidSchema)
  .merge(retentionSchema)
  .merge(runnerManagerSchema);

export type FullConfig = z.infer<typeof fullSchema>;
