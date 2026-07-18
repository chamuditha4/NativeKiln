# =============================================================================
# Native Kiln — web dashboard (Next.js). Build context is the repo root.
#   docker build -f apps/web/Dockerfile -t native-kiln/web .
# =============================================================================

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# The API base URL must be known at build time for NEXT_PUBLIC_ inlining.
ARG API_BASE_URL=http://localhost:4000
ENV API_BASE_URL=${API_BASE_URL}
RUN pnpm --filter @native-kiln/web build

FROM build AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
