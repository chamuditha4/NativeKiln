import {
  loadConfig,
  runtimeSchema,
  databaseSchema,
  redisSchema,
  securitySchema,
  storageSchema,
  retentionSchema,
} from '@native-kiln/config';

/** The configuration subset the API service requires. Fails fast if invalid. */
const apiSchema = runtimeSchema
  .merge(databaseSchema)
  .merge(redisSchema)
  .merge(securitySchema)
  .merge(storageSchema)
  .merge(retentionSchema);

export type ApiConfig = ReturnType<typeof loadApiConfig>;

export function loadApiConfig(source: NodeJS.ProcessEnv = process.env) {
  return loadConfig(apiSchema, source);
}

/** DI token for the resolved, validated config. */
export const API_CONFIG = Symbol('API_CONFIG');
