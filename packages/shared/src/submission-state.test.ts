import { describe, it, expect } from 'vitest';
import {
  assertSubmissionTransition,
  canTransitionSubmission,
  isTerminalSubmissionState,
} from './submission-state.js';
import { InvalidStateTransitionError } from './errors.js';

describe('submission state machine', () => {
  it('follows the upload/process/submit flow', () => {
    expect(canTransitionSubmission('QUEUED', 'UPLOADING')).toBe(true);
    expect(canTransitionSubmission('UPLOADING', 'PROCESSING')).toBe(true);
    expect(canTransitionSubmission('PROCESSING', 'READY')).toBe(true);
    expect(canTransitionSubmission('READY', 'SUBMITTING')).toBe(true);
    expect(canTransitionSubmission('SUBMITTED', 'APPROVED')).toBe(true);
  });

  it('rejects invalid jumps', () => {
    expect(canTransitionSubmission('QUEUED', 'APPROVED')).toBe(false);
    expect(canTransitionSubmission('READY', 'APPROVED')).toBe(false);
  });

  it('marks terminal states', () => {
    expect(isTerminalSubmissionState('APPROVED')).toBe(true);
    expect(isTerminalSubmissionState('REJECTED')).toBe(true);
    expect(isTerminalSubmissionState('FAILED')).toBe(true);
    expect(isTerminalSubmissionState('READY')).toBe(false);
  });

  it('throws on illegal transitions', () => {
    expect(() => assertSubmissionTransition('QUEUED', 'SUBMITTED')).toThrow(
      InvalidStateTransitionError,
    );
  });
});
