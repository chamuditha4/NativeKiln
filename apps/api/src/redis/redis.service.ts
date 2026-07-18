import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { API_CONFIG, type ApiConfig } from '../config/api-config.js';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(@Inject(API_CONFIG) config: ApiConfig) {
    this.client = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
  }

  get connection(): Redis {
    return this.client;
  }

  async ping(): Promise<boolean> {
    const res = await this.client.ping();
    return res === 'PONG';
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
