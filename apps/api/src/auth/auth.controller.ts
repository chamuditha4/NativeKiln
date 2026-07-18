import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { generateSecretToken } from '@native-kiln/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';
import { SESSION_COOKIE, SESSION_TTL_MS, SessionService } from './session.service.js';
import { CSRF_COOKIE } from './csrf.guard.js';
import { RateLimitService } from './rate-limit.service.js';
import { Public } from './public.decorator.js';
import type { AuthenticatedRequest } from './auth.types.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type LoginDto = z.infer<typeof loginSchema>;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly rateLimit: RateLimitService,
  ) {}

  private isProd(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  @Public()
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: { email: string; isAdmin: boolean }; csrfToken: string }> {
    const ip = req.ip ?? 'unknown';
    await this.rateLimit.assertLoginAllowed(`${ip}:${body.email}`);

    const { userId } = await this.auth.verifyCredentials(body.email, body.password);
    await this.rateLimit.clear(`${ip}:${body.email}`);

    const { token, expiresAt } = await this.sessions.create(userId, {
      userAgent: req.headers['user-agent'],
      ipAddress: ip,
    });

    const secure = this.isProd();
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    // Double-submit CSRF token: readable by JS so the SPA can echo it back.
    const csrfToken = generateSecretToken(24);
    res.cookie(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_MS,
    });

    return { user: { email: body.email, isAdmin: true }, csrfToken };
  }

  @Post('logout')
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (token) await this.sessions.revoke(token);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.clearCookie(CSRF_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@Req() req: AuthenticatedRequest): { email: string; isAdmin: boolean } {
    // AuthGuard guarantees req.session is present on non-public routes.
    const session = req.session!;
    return { email: session.email, isAdmin: session.isAdmin };
  }
}
