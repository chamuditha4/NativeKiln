import {
  loadConfig,
  runtimeSchema,
  databaseSchema,
  redisSchema,
  securitySchema,
  storageSchema,
  retentionSchema,
} from '@native-kiln/config';

const workerSchema = runtimeSchema
  .merge(databaseSchema)
  .merge(redisSchema)
  .merge(securitySchema)
  .merge(storageSchema)
  .merge(retentionSchema);

export function loadWorkerConfig() {
  return loadConfig(workerSchema);
}
