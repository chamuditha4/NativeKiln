import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { StorageService } from '../storage/storage.service.js';
import { Public } from '../auth/public.decorator.js';

type ComponentStatus = { status: 'up' | 'down'; error?: string };

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
  ) {}

  /** Liveness: process is up. Fast, no dependencies. */
  @Public()
  @Get('healthz')
  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness: dependencies are reachable. Used by Compose/Coolify health checks. */
  @Public()
  @Get('readyz')
  async readiness(): Promise<{
    status: 'ok' | 'degraded';
    components: Record<string, ComponentStatus>;
  }> {
    const [database, redis, storage] = await Promise.all([
      this.check(() => this.prisma.$queryRaw`SELECT 1`),
      this.check(() => this.redis.ping()),
      this.check(() => this.storage.healthy()),
    ]);

    const components = { database, redis, storage };
    const allUp = Object.values(components).every((c) => c.status === 'up');
    return { status: allUp ? 'ok' : 'degraded', components };
  }

  private async check(fn: () => Promise<unknown>): Promise<ComponentStatus> {
    try {
      await fn();
      return { status: 'up' };
    } catch (err) {
      return { status: 'down', error: err instanceof Error ? err.message : 'unknown' };
    }
  }
}
