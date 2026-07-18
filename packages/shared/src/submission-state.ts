import { InvalidStateTransitionError } from './errors.js';

/** Submission lifecycle. See CLAUDE.md "Build state machine" (submission part). */
export const SUBMISSION_STATES = [
  'QUEUED',
  'UPLOADING',
  'PROCESSING',
  'READY',
  'SUBMITTING',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'FAILED',
] as const;

export type SubmissionState = (typeof SUBMISSION_STATES)[number];

export const TERMINAL_SUBMISSION_STATES: ReadonlySet<SubmissionState> = new Set([
  'APPROVED',
  'REJECTED',
  'FAILED',
]);

const TRANSITIONS: Record<SubmissionState, SubmissionState[]> = {
  QUEUED: ['UPLOADING', 'FAILED'],
  UPLOADING: ['PROCESSING', 'FAILED'],
  PROCESSING: ['READY', 'FAILED'],
  // READY means processed and available; may be submitted for review or left as-is.
  READY: ['SUBMITTING', 'SUBMITTED', 'FAILED'],
  SUBMITTING: ['SUBMITTED', 'FAILED'],
  SUBMITTED: ['APPROVED', 'REJECTED', 'FAILED'],
  APPROVED: [],
  REJECTED: [],
  FAILED: [],
};

export function canTransitionSubmission(from: SubmissionState, to: SubmissionState): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function assertSubmissionTransition(
  from: SubmissionState,
  to: SubmissionState,
): SubmissionState {
  if (!canTransitionSubmission(from, to)) {
    throw new InvalidStateTransitionError(from, to);
  }
  return to;
}

export function isTerminalSubmissionState(state: SubmissionState): boolean {
  return TERMINAL_SUBMISSION_STATES.has(state);
}
