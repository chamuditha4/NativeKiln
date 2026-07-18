import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export interface ToolCheck {
  name: string;
  ok: boolean;
  version?: string;
  detail?: string;
}

async function version(cmd: string, args: string[]): Promise<ToolCheck> {
  try {
    const { stdout } = await exec(cmd, args, { timeout: 15_000 });
    return { name: cmd, ok: true, version: stdout.trim().split('\n')[0] };
  } catch (err) {
    return { name: cmd, ok: false, detail: err instanceof Error ? err.message : 'not found' };
  }
}

/**
 * Reports the toolchain the iOS runner depends on. This never starts a build or
 * a store submission — it only verifies the environment (Phase 4 uses it too).
 */
export async function runDoctor(): Promise<ToolCheck[]> {
  return Promise.all([
    version('sw_vers', ['-productVersion']),
    version('xcodebuild', ['-version']),
    version('node', ['--version']),
    version('pod', ['--version']),
    version('fastlane', ['--version']),
    version('git', ['--version']),
  ]);
}
