import { describe, it, expect } from 'vitest';
import { loadConfig, securitySchema, storageSchema } from './index.js';
import { ConfigurationError } from '@native-kiln/shared';

describe('loadConfig', () => {
  it('parses storage config and applies defaults', () => {
    const cfg = loadConfig(storageSchema, {
      S3_BUCKET: 'testkokoro',
      S3_ENDPOINT_URL: 'https://example.r2.cloudflarestorage.com',
      S3_ACCESS_KEY_ID: 'a',
      S3_SECRET_ACCESS_KEY: 'b',
    } as NodeJS.ProcessEnv);
    expect(cfg.S3_REGION).toBe('auto');
    expect(cfg.S3_FORCE_PATH_STYLE).toBe(true);
    expect(cfg.S3_PREFIX_ARTIFACTS).toBe('artifacts/');
  });

  it('rejects an invalid endpoint URL', () => {
    expect(() =>
      loadConfig(storageSchema, {
        S3_BUCKET: 'b',
        S3_ENDPOINT_URL: 'not-a-url',
        S3_ACCESS_KEY_ID: 'a',
        S3_SECRET_ACCESS_KEY: 'b',
      } as NodeJS.ProcessEnv),
    ).toThrow(ConfigurationError);
  });

  it('throws a ConfigurationError listing missing keys, not values', () => {
    try {
      loadConfig(securitySchema, {
        SESSION_SECRET: 'too-short',
        CREDENTIAL_MASTER_KEY: 'nothex',
      } as NodeJS.ProcessEnv);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigurationError);
      const message = (err as ConfigurationError).message;
      expect(message).toContain('SESSION_SECRET');
      expect(message).toContain('CREDENTIAL_MASTER_KEY');
      // The actual (bad) secret values must not appear in the error text.
      expect(message).not.toContain('too-short');
      expect(message).not.toContain('nothex');
    }
  });

  it('rejects a master key that is not 32 bytes hex', () => {
    expect(() =>
      loadConfig(securitySchema, {
        SESSION_SECRET: 'x'.repeat(32),
        CREDENTIAL_MASTER_KEY: 'abcd',
      } as NodeJS.ProcessEnv),
    ).toThrow(ConfigurationError);
  });
});
