import { createServer, type Server } from 'node:http';

export type HealthCheck = () => Promise<Record<string, unknown>> | Record<string, unknown>;

/**
 * Minimal HTTP health server for non-HTTP services (worker, runner-manager).
 * Serves `/healthz` (liveness) and `/readyz` (readiness via the provided check).
 */
export function createHealthServer(options: {
  port: number;
  service: string;
  readiness?: HealthCheck;
}): Server {
  const server = createServer(async (req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: options.service }));
      return;
    }
    if (req.url === '/readyz') {
      try {
        const detail = options.readiness ? await options.readiness() : {};
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: options.service, ...detail }));
      } catch (err) {
        res.writeHead(503, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'degraded',
            service: options.service,
            error: err instanceof Error ? err.message : 'unknown',
          }),
        );
      }
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  });

  server.listen(options.port, '0.0.0.0');
  return server;
}
