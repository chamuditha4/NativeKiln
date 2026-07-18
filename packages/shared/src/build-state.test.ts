import { describe, it, expect } from 'vitest';
import { assertBuildTransition, canTransitionBuild, isTerminalBuildState } from './build-state.js';
import { InvalidStateTransitionError } from './errors.js';

describe('build state machine', () => {
  it('allows the happy-path progression', () => {
    expect(canTransitionBuild('QUEUED', 'ASSIGNED')).toBe(true);
    expect(canTransitionBuild('COMPILING', 'SIGNING')).toBe(true);
    expect(canTransitionBuild('UPLOADING', 'SUCCEEDED')).toBe(true);
  });

  it('rejects skipping ahead', () => {
    expect(canTransitionBuild('QUEUED', 'COMPILING')).toBe(false);
    expect(canTransitionBuild('CLONING', 'SUCCEEDED')).toBe(false);
  });

  it('allows aborting from any non-terminal state', () => {
    expect(canTransitionBuild('CLONING', 'FAILED')).toBe(true);
    expect(canTransitionBuild('COMPILING', 'CANCELLED')).toBe(true);
    expect(canTransitionBuild('INSTALLING', 'TIMED_OUT')).toBe(true);
  });

  it('treats same-state as idempotent no-op', () => {
    expect(canTransitionBuild('COMPILING', 'COMPILING')).toBe(true);
  });

  it('does not allow leaving a terminal state', () => {
    expect(canTransitionBuild('SUCCEEDED', 'FAILED')).toBe(false);
    expect(canTransitionBuild('FAILED', 'QUEUED')).toBe(false);
    expect(isTerminalBuildState('SUCCEEDED')).toBe(true);
    expect(isTerminalBuildState('QUEUED')).toBe(false);
  });

  it('throws a typed error on illegal transitions', () => {
    expect(() => assertBuildTransition('QUEUED', 'SUCCEEDED')).toThrow(InvalidStateTransitionError);
  });
});
