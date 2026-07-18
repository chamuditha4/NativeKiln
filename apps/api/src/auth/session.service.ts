import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { generateId, generateSecretToken } from '@native-kiln/shared';
import { PrismaService } from '../prisma/prisma.service.js';

export const SESSION_COOKIE = 'kiln_session';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface SessionContext {
  sessionId: string;
  userId: string;
  email: string;
  isAdmin: boolean;
}

/** Sessions are opaque random tokens; only their SHA-256 hash is stored. */
@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Creates a session and returns the raw token (set as an HTTP-only cookie). */
  async create(
    userId: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = generateSecretToken(32);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.session.create({
      data: {
        id: generateId('ses'),
        userId,
        tokenHash: this.hash(token),
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
        expiresAt,
      },
    });
    return { token, expiresAt };
  }

  /** Validates a raw token, returning the session context or null. */
  async validate(token: string): Promise<SessionContext | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { user: true },
    });
    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }
    // Best-effort last-seen refresh; not on the hot path of correctness.
    void this.prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);

    return {
      sessionId: session.id,
      userId: session.userId,
      email: session.user.email,
      isAdmin: session.user.isAdmin,
    };
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.session
      .deleteMany({ where: { tokenHash: this.hash(token) } })
      .catch(() => undefined);
  }
}
