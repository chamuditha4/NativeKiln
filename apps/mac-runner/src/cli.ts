#!/usr/bin/env node
import { runDoctor } from './doctor.js';

/**
 * Native Kiln macOS runner CLI (Phase 0 skeleton).
 *
 * Implemented now:
 *   doctor   Verify the local toolchain without starting a build or submission.
 *
 * Arriving in Phase 4:
 *   register --token <t> --url <api>   Exchange a one-time token for an identity.
 *   run                                Connect, claim leased jobs, build IPAs.
 */

const HELP = `native-kiln macOS runner

Usage:
  kiln-runner <command> [options]

Commands:
  doctor            Check macOS, Xcode, Node, CocoaPods, Fastlane, git.
  register          (Phase 4) Register this Mac with the control plane.
  run               (Phase 4) Start claiming and building iOS jobs.
  help              Show this help.
`;

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'help';

  switch (command) {
    case 'doctor': {
      const checks = await runDoctor();
      let allOk = true;
      for (const check of checks) {
        const status = check.ok ? 'OK ' : 'MISSING';
        if (!check.ok) allOk = false;
        console.log(`[${status}] ${check.name}${check.version ? `  ${check.version}` : ''}`);
      }
      process.exit(allOk ? 0 : 1);
      break;
    }
    case 'register':
    case 'run':
      console.error(`"${command}" is implemented in Phase 4 (M1 iOS runner).`);
      process.exit(2);
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exit(2);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
