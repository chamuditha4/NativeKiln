import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainError } from '@native-kiln/shared';
import { safeEquals } from '@native-kiln/credentials';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import type { AuthenticatedRequest } from './auth.types.js';

export const CSRF_COOKIE = 'kiln_csrf';
export const CSRF_HEADER = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit-cookie CSRF protection. Mutating requests to authenticated
 * routes must present a header matching the non-HTTP-only CSRF cookie. Public
 * routes (e.g. login) are exempt; login itself issues the CSRF cookie.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (SAFE_METHODS.has(req.method)) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const cookie = req.cookies?.[CSRF_COOKIE] as string | undefined;
    const header = req.headers[CSRF_HEADER];
    const headerValue = Array.isArray(header) ? header[0] : header;

    if (!cookie || !headerValue || !safeEquals(cookie, headerValue)) {
      throw new DomainError('FORBIDDEN', 'Invalid or missing CSRF token.');
    }
    return true;
  }
}
