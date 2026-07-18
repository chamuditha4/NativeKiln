import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionService } from './session.service.js';
import { RateLimitService } from './rate-limit.service.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionService, RateLimitService],
  exports: [SessionService],
})
export class AuthModule {}
