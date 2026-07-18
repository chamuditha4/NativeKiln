import { InvalidStateTransitionError } from './errors.js';

/** Build lifecycle. See CLAUDE.md "Build state machine". */
export const BUILD_STATES = [
  'QUEUED',
  'ASSIGNED',
  'PREPARING',
  'CLONING',
  'INSTALLING',
  'PREBUILDING',
  'COMPILING',
  'SIGNING',
  'UPLOADING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'TIMED_OUT',
] as const;

export type BuildState = (typeof BUILD_STATES)[number];

export const TERMINAL_BUILD_STATES: ReadonlySet<BuildState> = new Set([
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'TIMED_OUT',
]);

/**
 * Happy-path progression. From any non-terminal state a build may also fail,
 * be cancelled, or time out; those edges are added below.
 */
const HAPPY_PATH: BuildState[] = [
  'QUEUED',
  'ASSIGNED',
  'PREPARING',
  'CLONING',
  'INSTALLING',
  'PREBUILDING',
  'COMPILING',
  'SIGNING',
  'UPLOADING',
  'SUCCEEDED',
];

const ABORT_STATES: BuildState[] = ['FAILED', 'CANCELLED', 'TIMED_OUT'];

function buildTransitionMap(): Map<BuildState, ReadonlySet<BuildState>> {
  const map = new Map<BuildState, Set<BuildState>>();
  for (const state of BUILD_STATES) map.set(state, new Set());

  for (let i = 0; i < HAPPY_PATH.length - 1; i++) {
    const from = HAPPY_PATH[i]!;
    const to = HAPPY_PATH[i + 1]!;
    map.get(from)!.add(to);
  }

  // Any non-terminal state may move to any abort state.
  for (const state of BUILD_STATES) {
    if (TERMINAL_BUILD_STATES.has(state)) continue;
    for (const abort of ABORT_STATES) map.get(state)!.add(abort);
  }

  return map as Map<BuildState, ReadonlySet<BuildState>>;
}

const BUILD_TRANSITIONS = buildTransitionMap();

export function canTransitionBuild(from: BuildState, to: BuildState): boolean {
  if (from === to) return true; // idempotent re-application of same state
  return BUILD_TRANSITIONS.get(from)?.has(to) ?? false;
}

/**
 * Returns the target state, throwing InvalidStateTransitionError for illegal
 * moves. Same-state is treated as a no-op (idempotent).
 */
export function assertBuildTransition(from: BuildState, to: BuildState): BuildState {
  if (!canTransitionBuild(from, to)) {
    throw new InvalidStateTransitionError(from, to);
  }
  return to;
}

export function isTerminalBuildState(state: BuildState): boolean {
  return TERMINAL_BUILD_STATES.has(state);
}
