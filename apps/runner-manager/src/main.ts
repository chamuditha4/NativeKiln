import { existsSync } from 'node:fs';
import { Redis } from 'ioredis';
import {
  loadConfig,
  runtimeSchema,
  redisSchema,
  androidSchema,
  runnerManagerSchema,
} from '@native-kiln/config';
import { createHealthServer, createLogger } from '@native-kiln/shared';

const logger = createLogger('runner-manager');

const schema = runtimeSchema.merge(redisSchema).merge(androidSchema).merge(runnerManagerSchema);

const DOCKER_SOCKET = '/var/run/docker.sock';

async function main(): Promise<void> {
  const config = loadConfig(schema);

  // SECURITY BOUNDARY: only the runner-manager is permitted to touch the Docker
  // socket. It translates validated build jobs into controlled container specs
  // (Phase 2). It must never run repository scripts on the host.
  const dockerSocketPresent = existsSync(DOCKER_SOCKET);
  if (!dockerSocketPresent) {
    logger.warn(
      { socket: DOCKER_SOCKET },
      'Docker socket not mounted — Android build execution will be unavailable (expected until Phase 2).',
    );
  }

  const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });

  createHealthServer({
    port: config.RUNNER_MANAGER_PORT,
    service: 'runner-manager',
    readiness: async () => {
      const pong = await connection.ping();
      return {
        redis: pong === 'PONG' ? 'up' : 'down',
        dockerSocket: dockerSocketPresent ? 'present' : 'absent',
        concurrency: config.ANDROID_BUILD_CONCURRENCY,
      };
    },
  });

  logger.info(
    { port: config.RUNNER_MANAGER_PORT, concurrency: config.ANDROID_BUILD_CONCURRENCY },
    'Runner manager started (Phase 0 scaffold)',
  );

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down runner manager');
    await connection.quit();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

main().catch((err) => {
  logger.error(
    { err: err instanceof Error ? err.message : String(err) },
    'Runner manager failed to start',
  );
  process.exit(1);
});
