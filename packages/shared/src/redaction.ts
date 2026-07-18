/**
 * Secret redaction for logs and any outbound text. Redacts exact known secret
 * values plus their common encoded variants (base64, url-encoded). This is a
 * defense-in-depth layer; code should also avoid handling secrets near logs.
 */

const REDACTED = '[REDACTED]';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Encoded variants a secret might appear as in logs. */
function encodedVariants(secret: string): string[] {
  const variants = new Set<string>([secret]);
  try {
    variants.add(Buffer.from(secret, 'utf8').toString('base64'));
    variants.add(Buffer.from(secret, 'utf8').toString('base64url'));
  } catch {
    // ignore encoding failures
  }
  try {
    variants.add(encodeURIComponent(secret));
  } catch {
    // ignore encoding failures
  }
  // Only redact meaningfully long values to avoid nuking short common strings.
  return [...variants].filter((v) => v.length >= 6);
}

export class Redactor {
  private readonly patterns: RegExp[];

  constructor(secrets: Iterable<string>) {
    const values = new Set<string>();
    for (const secret of secrets) {
      if (!secret) continue;
      for (const variant of encodedVariants(secret)) values.add(variant);
    }
    // Longest first so overlapping values redact the largest match.
    this.patterns = [...values]
      .sort((a, b) => b.length - a.length)
      .map((v) => new RegExp(escapeRegExp(v), 'g'));
  }

  redact(text: string): string {
    let out = text;
    for (const pattern of this.patterns) out = out.replace(pattern, REDACTED);
    return out;
  }
}

/** Convenience for one-off redaction. */
export function redactSecrets(text: string, secrets: Iterable<string>): string {
  return new Redactor(secrets).redact(text);
}
