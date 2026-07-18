import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { generateId } from '@native-kiln/shared';

/**
 * Seeds the single administrator account. Safe to run repeatedly: it upserts
 * by email and never overwrites an existing password. If ADMIN_PASSWORD is not
 * provided, a strong random password is generated and printed ONCE.
 */

const prisma = new PrismaClient();

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim();
  if (!email) {
    throw new Error('ADMIN_EMAIL is required to seed the administrator account.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[seed] Administrator ${email} already exists — leaving it unchanged.`);
    return;
  }

  const providedPassword = process.env.ADMIN_PASSWORD?.trim();
  const generated = !providedPassword;
  const password = providedPassword || randomBytes(18).toString('base64url');

  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

  await prisma.user.create({
    data: {
      id: generateId('usr'),
      email,
      passwordHash,
      isAdmin: true,
      displayName: 'Administrator',
    },
  });

  console.log(`[seed] Created administrator: ${email}`);
  if (generated) {
    console.log('[seed] =====================================================');
    console.log(`[seed] Generated admin password (shown once): ${password}`);
    console.log('[seed] Store it in a password manager now. It will not be shown again.');
    console.log('[seed] =====================================================');
  }
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
