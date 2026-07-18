# =============================================================================
# Native Kiln — multi-target image for the Node/TypeScript services.
# Build a specific service by selecting its target, e.g.:
#   docker build --target runtime-api -t native-kiln/api .
# The web dashboard has its own Dockerfile (apps/web/Dockerfile).
# Secrets are NEVER passed as build args or baked into images.
# =============================================================================

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="/pnpm:$PATH"
# openssl + ca-certificates are required by Prisma's query engine at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# ---- Build stage: install, generate Prisma client, compile all packages ------
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @native-kiln/database generate
RUN pnpm -r build

# ---- Runtime stages ----------------------------------------------------------
# Each runtime stage reuses the fully-built workspace. dumb PID 1 handling is
# provided by `node --enable-source-maps` + Compose stop signals.

FROM build AS runtime-api
ENV NODE_ENV=production
WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]

FROM build AS runtime-worker
ENV NODE_ENV=production
WORKDIR /app/apps/worker
CMD ["node", "dist/main.js"]

FROM build AS runtime-cleanup
ENV NODE_ENV=production
WORKDIR /app/apps/worker
CMD ["node", "dist/cleanup.js"]

FROM build AS runtime-runner-manager
ENV NODE_ENV=production
WORKDIR /app/apps/runner-manager
CMD ["node", "dist/main.js"]

# ---- Migrate/seed stage: applies migrations, then seeds the admin ------------
FROM build AS runtime-migrate
ENV NODE_ENV=production
WORKDIR /app/packages/database
CMD ["sh", "-c", "pnpm migrate:deploy && pnpm seed"]
