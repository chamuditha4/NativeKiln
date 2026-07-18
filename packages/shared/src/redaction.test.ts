import { describe, it, expect } from 'vitest';
import { Redactor, redactSecrets } from './redaction.js';

describe('redaction', () => {
  it('redacts exact secret values', () => {
    const out = redactSecrets('token is superSecretValue123 here', ['superSecretValue123']);
    expect(out).toBe('token is [REDACTED] here');
  });

  it('redacts base64 and url-encoded variants', () => {
    const secret = 'p@ss word/with+special';
    const b64 = Buffer.from(secret, 'utf8').toString('base64');
    const urlEnc = encodeURIComponent(secret);
    const r = new Redactor([secret]);
    expect(r.redact(`raw=${secret}`)).toContain('[REDACTED]');
    expect(r.redact(`b64=${b64}`)).toContain('[REDACTED]');
    expect(r.redact(`url=${urlEnc}`)).toContain('[REDACTED]');
  });

  it('ignores empty and very short secrets', () => {
    const r = new Redactor(['', 'ab']);
    expect(r.redact('ab is fine and empty too')).toBe('ab is fine and empty too');
  });

  it('redacts the longest overlapping match', () => {
    const out = redactSecrets('value=abcdef123456', ['abcdef', 'abcdef123456']);
    expect(out).toBe('value=[REDACTED]');
  });
});
