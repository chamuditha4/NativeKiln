-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "Framework" AS ENUM ('EXPO', 'REACT_NATIVE', 'FLUTTER', 'NATIVE_ANDROID', 'NATIVE_IOS');

-- CreateEnum
CREATE TYPE "BuildProfileType" AS ENUM ('DEVELOPMENT', 'PREVIEW', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('APK', 'AAB', 'IPA');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('ANDROID_KEYSTORE', 'GOOGLE_SERVICE_ACCOUNT', 'APPLE_API_KEY', 'APPLE_DISTRIBUTION_CERT', 'APPLE_PROVISIONING_PROFILE', 'REPOSITORY_TOKEN', 'GENERIC');

-- CreateEnum
CREATE TYPE "BuildState" AS ENUM ('QUEUED', 'ASSIGNED', 'PREPARING', 'CLONING', 'INSTALLING', 'PREBUILDING', 'COMPILING', 'SIGNING', 'UPLOADING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "SubmissionState" AS ENUM ('QUEUED', 'UPLOADING', 'PROCESSING', 'READY', 'SUBMITTING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "SubmissionStore" AS ENUM ('GOOGLE_PLAY', 'APP_STORE');

-- CreateEnum
CREATE TYPE "RunnerStatus" AS ENUM ('ONLINE', 'OFFLINE', 'BUSY', 'DISABLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "framework" "Framework" NOT NULL,
    "androidPackageId" TEXT,
    "appleBundleId" TEXT,
    "retentionDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_sources" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "repositoryUrl" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "credentialId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_profiles" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BuildProfileType" NOT NULL,
    "platform" "Platform" NOT NULL,
    "artifactType" "ArtifactType",
    "autoIncrement" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "build_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environment_variables" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "nonce" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environment_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "nonce" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "builds" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "buildProfileId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "state" "BuildState" NOT NULL DEFAULT 'QUEUED',
    "requestedRef" TEXT NOT NULL,
    "commitSha" TEXT,
    "buildNumber" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "runnerId" TEXT,
    "errorMessage" TEXT,
    "logObjectKey" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "builds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_steps" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" "BuildState" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "build_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_log_chunks" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "build_log_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifacts" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "sha256" TEXT NOT NULL,
    "buildNumber" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "status" "RunnerStatus" NOT NULL DEFAULT 'OFFLINE',
    "tokenHash" TEXT NOT NULL,
    "version" TEXT,
    "concurrency" INTEGER NOT NULL DEFAULT 1,
    "currentBuildId" TEXT,
    "lastHeartbeat" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runner_capabilities" (
    "id" TEXT NOT NULL,
    "runnerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runner_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runner_registration_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "runner_registration_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "store" "SubmissionStore" NOT NULL,
    "track" TEXT,
    "state" "SubmissionState" NOT NULL DEFAULT 'QUEUED',
    "releaseStatus" TEXT,
    "rolloutPercent" INTEGER,
    "externalBuildId" TEXT,
    "externalVersionId" TEXT,
    "providerResponse" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "project_sources_projectId_key" ON "project_sources"("projectId");

-- CreateIndex
CREATE INDEX "build_profiles_projectId_idx" ON "build_profiles"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "build_profiles_projectId_name_key" ON "build_profiles"("projectId", "name");

-- CreateIndex
CREATE INDEX "environment_variables_projectId_idx" ON "environment_variables"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "environment_variables_projectId_key_key" ON "environment_variables"("projectId", "key");

-- CreateIndex
CREATE INDEX "credentials_projectId_idx" ON "credentials"("projectId");

-- CreateIndex
CREATE INDEX "credentials_type_idx" ON "credentials"("type");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_projectId_name_key" ON "credentials"("projectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "builds_idempotencyKey_key" ON "builds"("idempotencyKey");

-- CreateIndex
CREATE INDEX "builds_projectId_idx" ON "builds"("projectId");

-- CreateIndex
CREATE INDEX "builds_state_idx" ON "builds"("state");

-- CreateIndex
CREATE INDEX "builds_runnerId_idx" ON "builds"("runnerId");

-- CreateIndex
CREATE UNIQUE INDEX "builds_projectId_buildNumber_key" ON "builds"("projectId", "buildNumber");

-- CreateIndex
CREATE INDEX "build_steps_buildId_idx" ON "build_steps"("buildId");

-- CreateIndex
CREATE UNIQUE INDEX "build_steps_buildId_sequence_key" ON "build_steps"("buildId", "sequence");

-- CreateIndex
CREATE INDEX "build_log_chunks_buildId_sequence_idx" ON "build_log_chunks"("buildId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "build_log_chunks_buildId_sequence_key" ON "build_log_chunks"("buildId", "sequence");

-- CreateIndex
CREATE INDEX "artifacts_buildId_idx" ON "artifacts"("buildId");

-- CreateIndex
CREATE INDEX "artifacts_expiresAt_idx" ON "artifacts"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "runners_tokenHash_key" ON "runners"("tokenHash");

-- CreateIndex
CREATE INDEX "runners_platform_idx" ON "runners"("platform");

-- CreateIndex
CREATE INDEX "runners_status_idx" ON "runners"("status");

-- CreateIndex
CREATE INDEX "runner_capabilities_runnerId_idx" ON "runner_capabilities"("runnerId");

-- CreateIndex
CREATE UNIQUE INDEX "runner_capabilities_runnerId_key_key" ON "runner_capabilities"("runnerId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "runner_registration_tokens_tokenHash_key" ON "runner_registration_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_idempotencyKey_key" ON "submissions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "submissions_projectId_idx" ON "submissions"("projectId");

-- CreateIndex
CREATE INDEX "submissions_buildId_idx" ON "submissions"("buildId");

-- CreateIndex
CREATE INDEX "submissions_state_idx" ON "submissions"("state");

-- CreateIndex
CREATE INDEX "audit_events_userId_idx" ON "audit_events"("userId");

-- CreateIndex
CREATE INDEX "audit_events_action_idx" ON "audit_events"("action");

-- CreateIndex
CREATE INDEX "audit_events_createdAt_idx" ON "audit_events"("createdAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_sources" ADD CONSTRAINT "project_sources_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_profiles" ADD CONSTRAINT "build_profiles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_variables" ADD CONSTRAINT "environment_variables_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builds" ADD CONSTRAINT "builds_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builds" ADD CONSTRAINT "builds_buildProfileId_fkey" FOREIGN KEY ("buildProfileId") REFERENCES "build_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builds" ADD CONSTRAINT "builds_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "runners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_steps" ADD CONSTRAINT "build_steps_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "builds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_log_chunks" ADD CONSTRAINT "build_log_chunks_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "builds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "builds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runner_capabilities" ADD CONSTRAINT "runner_capabilities_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "runners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "builds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

