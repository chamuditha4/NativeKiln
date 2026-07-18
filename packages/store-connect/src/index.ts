import type { SubmissionStore } from '@native-kiln/shared';

/**
 * Store connector interfaces. Provider-specific payloads (Google Play, App
 * Store Connect) stay behind these adapters. Concrete implementations arrive in
 * Phase 3 (Google Play) and Phase 5 (Apple).
 */

export interface SubmissionRequest {
  submissionId: string;
  projectId: string;
  store: SubmissionStore;
  /** Track (Play) or destination (TestFlight group). */
  track: string;
  artifactPath: string;
  releaseNotes?: string;
  rolloutPercent?: number;
  /** Whether to submit for public review — requires explicit confirmation. */
  submitForReview?: boolean;
}

export interface SubmissionOutcome {
  submissionId: string;
  externalBuildId?: string;
  externalVersionId?: string;
  /** Provider response AFTER redaction of any sensitive fields. */
  providerResponse: Record<string, unknown>;
}

/** A human-actionable blocker (agreements, export compliance, review issues). */
export class SubmissionBlockedError extends Error {
  constructor(
    message: string,
    public readonly actionRequired: string,
  ) {
    super(message);
    this.name = 'SubmissionBlockedError';
  }
}

export interface StoreConnector {
  readonly store: SubmissionStore;
  /** Uploads the artifact and begins processing. */
  upload(request: SubmissionRequest): Promise<SubmissionOutcome>;
  /** Polls processing/release status for a previously started submission. */
  getStatus(externalBuildId: string): Promise<Record<string, unknown>>;
}
