import { randomBytes } from 'node:crypto';

/**
 * Opaque, URL-safe identifiers with a short type prefix. We never expose
 * database sequences or predictable IDs. Format: `<prefix>_<22-char base62ish>`.
 */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export type IdPrefix =
  | 'usr'
  | 'ses'
  | 'prj'
  | 'src'
  | 'prof'
  | 'env'
  | 'cred'
  | 'bld'
  | 'step'
  | 'log'
  | 'art'
  | 'run'
  | 'cap'
  | 'sub'
  | 'aud'
  | 'rtok';

export function generateId(prefix: IdPrefix, length = 22): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    // Non-null: i is bounded by length, matching bytes length.
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `${prefix}_${out}`;
}

/** Generates a high-entropy secret token (e.g. registration tokens, API keys). */
export function generateSecretToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('base64url');
}
