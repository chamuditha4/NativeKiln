import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { CredentialCipher, safeEquals } from './index.js';

const KEY_V1 = randomBytes(32).toString('hex');
const KEY_V2 = randomBytes(32).toString('hex');

describe('CredentialCipher', () => {
  it('round-trips a secret', () => {
    const cipher = new CredentialCipher({ masterKeyHex: KEY_V1, keyVersion: 1 });
    const enc = cipher.encrypt('super-secret-value');
    expect(enc.keyVersion).toBe(1);
    expect(enc.ciphertext).not.toContain('super-secret-value');
    expect(cipher.decryptString(enc)).toBe('super-secret-value');
  });

  it('uses a unique nonce per encryption', () => {
    const cipher = new CredentialCipher({ masterKeyHex: KEY_V1, keyVersion: 1 });
    const a = cipher.encrypt('same');
    const b = cipher.encrypt('same');
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('fails to decrypt when the auth tag is tampered', () => {
    const cipher = new CredentialCipher({ masterKeyHex: KEY_V1, keyVersion: 1 });
    const enc = cipher.encrypt('tamper-me');
    const badTag = Buffer.from(enc.authTag, 'base64');
    badTag[0] = badTag[0]! ^ 0xff;
    expect(() => cipher.decrypt({ ...enc, authTag: badTag.toString('base64') })).toThrow();
  });

  it('decrypts old values after key rotation', () => {
    const v1 = new CredentialCipher({ masterKeyHex: KEY_V1, keyVersion: 1 });
    const encrypted = v1.encrypt('legacy');
    const rotated = new CredentialCipher({
      masterKeyHex: KEY_V2,
      keyVersion: 2,
      previousKeys: { 1: KEY_V1 },
    });
    expect(rotated.decryptString(encrypted)).toBe('legacy');
    // New encryptions use the new version.
    expect(rotated.encrypt('new').keyVersion).toBe(2);
  });

  it('rejects an invalid master key', () => {
    expect(() => new CredentialCipher({ masterKeyHex: 'short', keyVersion: 1 })).toThrow();
  });
});

describe('safeEquals', () => {
  it('compares equal and unequal strings', () => {
    expect(safeEquals('abc', 'abc')).toBe(true);
    expect(safeEquals('abc', 'abd')).toBe(false);
    expect(safeEquals('abc', 'abcd')).toBe(false);
  });
});
