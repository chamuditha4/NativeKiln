import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { DomainError, generateId } from '@native-kiln/shared';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifies credentials with Argon2id. Returns the user id on success.
   * Uses a uniform error and a dummy verify path to avoid leaking whether the
   * email exists (timing / user enumeration).
   */
  async verifyCredentials(email: string, password: string): Promise<{ userId: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    let ok = false;
    try {
      if (user) {
        ok = await argon2.verify(user.passwordHash, password);
      } else {
        // Spend comparable time hashing to keep responses timing-uniform.
        await argon2.hash(password);
        ok = false;
      }
    } catch {
      ok = false;
    }

    if (!user || !ok) {
      throw new DomainError('UNAUTHORIZED', 'Invalid email or password.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.prisma.auditEvent.create({
      data: {
        id: generateId('aud'),
        userId: user.id,
        action: 'auth.login',
        targetType: 'user',
        targetId: user.id,
      },
    });

    return { userId: user.id };
  }
}
