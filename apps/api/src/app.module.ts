import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { StorageModule } from './storage/storage.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthGuard } from './auth/auth.guard.js';
import { CsrfGuard } from './auth/csrf.guard.js';
import { DomainExceptionFilter } from './common/domain-exception.filter.js';

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule, StorageModule, HealthModule, AuthModule],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    // Order matters: authenticate first, then enforce CSRF on mutations.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
