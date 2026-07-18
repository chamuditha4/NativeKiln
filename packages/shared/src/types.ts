/** Shared domain enums/types used across services and the database layer. */

export const PLATFORMS = ['ANDROID', 'IOS'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const FRAMEWORKS = [
  'EXPO',
  'REACT_NATIVE',
  'FLUTTER',
  'NATIVE_ANDROID',
  'NATIVE_IOS',
] as const;
export type Framework = (typeof FRAMEWORKS)[number];

export const BUILD_PROFILE_TYPES = ['DEVELOPMENT', 'PREVIEW', 'PRODUCTION'] as const;
export type BuildProfileType = (typeof BUILD_PROFILE_TYPES)[number];

export const ARTIFACT_TYPES = ['APK', 'AAB', 'IPA'] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const CREDENTIAL_TYPES = [
  'ANDROID_KEYSTORE',
  'GOOGLE_SERVICE_ACCOUNT',
  'APPLE_API_KEY',
  'APPLE_DISTRIBUTION_CERT',
  'APPLE_PROVISIONING_PROFILE',
  'REPOSITORY_TOKEN',
  'GENERIC',
] as const;
export type CredentialType = (typeof CREDENTIAL_TYPES)[number];

export const RUNNER_STATUSES = ['ONLINE', 'OFFLINE', 'BUSY', 'DISABLED'] as const;
export type RunnerStatus = (typeof RUNNER_STATUSES)[number];

export const SUBMISSION_STORES = ['GOOGLE_PLAY', 'APP_STORE'] as const;
export type SubmissionStore = (typeof SUBMISSION_STORES)[number];

export const GOOGLE_PLAY_TRACKS = ['internal', 'alpha', 'beta', 'production'] as const;
export type GooglePlayTrack = (typeof GOOGLE_PLAY_TRACKS)[number];

/** BullMQ queue names — single source of truth shared by producers/consumers. */
export const QUEUE_NAMES = {
  ANDROID_BUILD: 'android-build',
  IOS_BUILD: 'ios-build',
  SUBMISSION: 'submission',
  CLEANUP: 'cleanup',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
