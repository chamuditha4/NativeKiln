import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { ConfigurationError, DomainError } from '@native-kiln/shared';

/**
 * Authenticated encryption for credentials at rest (AES-256-GCM).
 *
 * Design notes:
 *  - A unique random 12-byte nonce (IV) is generated for EVERY encryption.
 *  - The key version, nonce, ciphertext, and auth tag are all stored, so keys
 *    can be rotated later without losing the ability to decrypt old records.
 *  - The master key is provided only via runtime secrets (Coolify). It is a
 *    32-byte value, hex-encoded (64 chars) in the environment.
 *  - Decryption happens only in worker/runner paths — never in the browser.
 */

const ALGORITHM = 'aes-256-gcm';
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export interface EncryptedValue {
  /** Which master key version encrypted this value. */
  keyVersion: number;
  /** Base64-encoded random nonce (IV). */
  nonce: string;
  /** Base64-encoded ciphertext. */
  ciphertext: string;
  /** Base64-encoded GCM authentication tag. */
  authTag: string;
}

function parseKey(hexKey: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new ConfigurationError('CREDENTIAL_MASTER_KEY must be 64 hex characters (32 bytes).');
  }
  const key = Buffer.from(hexKey, 'hex');
  if (key.length !== KEY_BYTES) {
    throw new ConfigurationError('CREDENTIAL_MASTER_KEY must decode to 32 bytes.');
  }
  return key;
}

export class CredentialCipher {
  private readonly key: Buffer;
  private readonly keyVersion: number;
  /** Older key versions, kept for decrypting values encrypted before rotation. */
  private readonly previousKeys: Map<number, Buffer>;

  constructor(params: {
    masterKeyHex: string;
    keyVersion: number;
    previousKeys?: Record<number, string>;
  }) {
    this.key = parseKey(params.masterKeyHex);
    this.keyVersion = params.keyVersion;
    this.previousKeys = new Map();
    for (const [version, hex] of Object.entries(params.previousKeys ?? {})) {
      this.previousKeys.set(Number(version), parseKey(hex));
    }
  }

  private keyForVersion(version: number): Buffer {
    if (version === this.keyVersion) return this.key;
    const previous = this.previousKeys.get(version);
    if (!previous) {
      throw new DomainError(
        'CONFIGURATION',
        `No key available for credential key version ${version}.`,
      );
    }
    return previous;
  }

  encrypt(plaintext: string | Buffer): EncryptedValue {
    const nonce = randomBytes(NONCE_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, nonce);
    const data = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
      keyVersion: this.keyVersion,
      nonce: nonce.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  decrypt(value: EncryptedValue): Buffer {
    const key = this.keyForVersion(value.keyVersion);
    const nonce = Buffer.from(value.nonce, 'base64');
    const authTag = Buffer.from(value.authTag, 'base64');
    if (authTag.length !== TAG_BYTES) {
      throw new DomainError('VALIDATION', 'Invalid authentication tag length.');
    }
    const decipher = createDecipheriv(ALGORITHM, key, nonce);
    decipher.setAuthTag(authTag);
    const ciphertext = Buffer.from(value.ciphertext, 'base64');
    // Throws if the auth tag does not verify (tampering / wrong key).
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  decryptString(value: EncryptedValue): string {
    return this.decrypt(value).toString('utf8');
  }
}

/** Constant-time comparison for tokens/secrets. */
export function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
