import { createHealthServer, createLogger } from '@native-kiln/shared';
import { loadWorkerConfig } from './config.js';

const logger = createLogger('cleanup');

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Scheduled cleanup of expired workspaces, abandoned uploads, and expired
 * artifacts. Phase 0 scaffold: it runs on an interval and logs. Real retention
 * logic (which must never delete the most recent successful production artifact
 * unless retention permits) is implemented alongside the artifact store.
 */
async function main(): Promise<void> {
  const config = loadWorkerConfig();

  createHealthServer({ port: 4300, service: 'cleanup' });

  const tick = (): void => {
    logger.info({ retentionDays: config.ARTIFACT_RETENTION_DAYS }, 'Cleanup tick (noop scaffold)');
  };

  tick();
  const timer = setInterval(tick, ONE_HOUR_MS);

  const shutdown = (): void => {
    clearInterval(timer);
    logger.info('Shutting down cleanup');
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error(
    { err: err instanceof Error ? err.message : String(err) },
    'Cleanup failed to start',
  );
  process.exit(1);
});
