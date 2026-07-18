import { Injectable } from '@nestjs/common';
import { DomainError } from '@native-kiln/shared';
import { RedisService } from '../redis/redis.service.js';

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

/** Sliding fixed-window login rate limiter keyed by identifier (IP + email). */
@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  async assertLoginAllowed(identifier: string): Promise<void> {
    const key = `ratelimit:login:${identifier}`;
    const count = await this.redis.connection.incr(key);
    if (count === 1) {
      await this.redis.connection.expire(key, WINDOW_SECONDS);
    }
    if (count > MAX_ATTEMPTS) {
      throw new DomainError('RATE_LIMITED', 'Too many login attempts. Try again later.');
    }
  }

  async clear(identifier: string): Promise<void> {
    await this.redis.connection.del(`ratelimit:login:${identifier}`);
  }
}
