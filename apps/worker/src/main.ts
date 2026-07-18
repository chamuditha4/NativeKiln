import { Queue, Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { createHealthServer, createLogger, QUEUE_NAMES } from '@native-kiln/shared';
import { loadWorkerConfig } from './config.js';

const logger = createLogger('worker');

async function main(): Promise<void> {
  const config = loadWorkerConfig();

  // BullMQ requires this option on its blocking connection.
  const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });

  // A no-op cleanup queue exists in Phase 0 so orchestration is wired end to end.
  // Real build/submission processors are added in later phases.
  const workers: Worker[] = [];

  const cleanupWorker = new Worker(
    QUEUE_NAMES.CLEANUP,
    async (job: Job) => {
      logger.info({ jobId: job.id, name: job.name }, 'Processing cleanup job (noop scaffold)');
      return { ok: true };
    },
    { connection, concurrency: 1 },
  );
  workers.push(cleanupWorker);

  for (const worker of workers) {
    worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err: err.message }, 'Job failed');
    });
  }

  // Expose the queues for producers to confirm connectivity on readiness.
  const cleanupQueue = new Queue(QUEUE_NAMES.CLEANUP, { connection });

  createHealthServer({
    port: 4200,
    service: 'worker',
    readiness: async () => {
      const pong = await connection.ping();
      await cleanupQueue.getJobCounts();
      return { redis: pong === 'PONG' ? 'up' : 'down' };
    },
  });

  logger.info('Worker started; health server on :4200');

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down worker');
    await Promise.allSettled(workers.map((w) => w.close()));
    await cleanupQueue.close();
    await connection.quit();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

main().catch((err) => {
  logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Worker failed to start');
  process.exit(1);
});
