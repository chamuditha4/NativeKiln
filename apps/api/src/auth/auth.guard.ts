import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainError } from '@native-kiln/shared';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { SESSION_COOKIE, SessionService } from './session.service.js';
import type { AuthenticatedRequest } from './auth.types.js';

/**
 * Global guard. Rejects requests without a valid session cookie unless the
 * route is marked @Public(). Populates `req.session` for handlers.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!token) {
      throw new DomainError('UNAUTHORIZED', 'Authentication required.');
    }

    const session = await this.sessions.validate(token);
    if (!session) {
      throw new DomainError('UNAUTHORIZED', 'Session expired or invalid.');
    }

    req.session = session;
    return true;
  }
}
