import type { ArtifactType, BuildProfileType, Framework, Platform } from '@native-kiln/shared';

/**
 * Runner adapter interfaces. Business logic must depend only on these, never on
 * Expo/RN/Flutter commands directly (see CLAUDE.md "Non-negotiable architecture").
 * Concrete adapters (Phase 2+) live under `runners/*` and implement these.
 */

export interface BuildRequest {
  buildId: string;
  projectId: string;
  platform: Platform;
  framework: Framework;
  profileType: BuildProfileType;
  artifactType: ArtifactType;
  /** Exact commit to build. A branch/tag must already be resolved to a SHA. */
  commitSha: string;
  repositoryUrl: string;
  /** Non-secret build fields, already validated (scheme, configuration, ...). */
  config: Record<string, unknown>;
}

export type BuildLogLevel = 'info' | 'warn' | 'error';

export interface BuildLogEvent {
  buildId: string;
  /** Already redacted before it reaches this callback. */
  line: string;
  level: BuildLogLevel;
  timestamp: string;
}

export interface BuildArtifactResult {
  type: ArtifactType;
  /** Absolute path to the produced artifact inside the runner workspace. */
  path: string;
  sizeBytes: number;
  sha256: string;
  /** Verified metadata used to validate against project expectations. */
  packageId?: string;
  versionCode?: number;
  versionName?: string;
}

export interface BuildResult {
  buildId: string;
  artifacts: BuildArtifactResult[];
}

/** Signal used to cooperatively cancel an in-flight build. */
export interface CancellationSignal {
  readonly cancelled: boolean;
  onCancel(listener: () => void): void;
}

export interface BuildAdapter {
  readonly framework: Framework;
  readonly platform: Platform;

  /** Returns true if this adapter can handle the given request. */
  supports(request: BuildRequest): boolean;

  /**
   * Executes the build. Implementations MUST:
   *  - emit redacted logs through `onLog`,
   *  - honor `signal` for cooperative cancellation,
   *  - clean up their workspace in a `finally` path.
   */
  run(
    request: BuildRequest,
    onLog: (event: BuildLogEvent) => void,
    signal: CancellationSignal,
  ): Promise<BuildResult>;
}

/** Registry mapping framework/platform pairs to adapters. */
export class BuildAdapterRegistry {
  private readonly adapters: BuildAdapter[] = [];

  register(adapter: BuildAdapter): void {
    this.adapters.push(adapter);
  }

  resolve(request: BuildRequest): BuildAdapter | undefined {
    return this.adapters.find((a) => a.supports(request));
  }
}
