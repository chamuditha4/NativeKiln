# NativeKiln

Open-source, self-hosted build and release infrastructure for Android and iOS.

A private, single-owner mobile build and submission platform — the useful parts
of Expo EAS, deployed from one Docker Compose project through Coolify. See
[CLAUDE.md](CLAUDE.md) for the full product specification and roadmap.

> **Status: Phase 0 (Scaffold & infrastructure) complete.** The control plane
> runs, the database schema is applied, authentication and health checks work,
> and configuration is validated at startup. Android/iOS compilation and store
> submission arrive in later phases and are not yet implemented.

## Architecture

TypeScript monorepo with pnpm workspaces.

| Path                                 | What it is                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `apps/web`                           | Next.js dashboard (login + dashboard skeleton)                                       |
| `apps/api`                           | NestJS API — auth, health, and (later) projects/builds/etc.                          |
| `apps/worker`                        | BullMQ job orchestration and background work                                         |
| `apps/runner-manager`                | Launches ephemeral Android build containers (only service allowed the Docker socket) |
| `apps/mac-runner`                    | macOS iOS runner CLI (Phase 4)                                                       |
| `packages/shared`                    | Domain errors, state machines, redaction, logger, shared types                       |
| `packages/config`                    | Zod-validated, fail-fast environment configuration                                   |
| `packages/credentials`               | AES-256-GCM authenticated encryption with key rotation support                       |
| `packages/database`                  | Prisma schema, client, migrations, admin seed                                        |
| `packages/build-engine`              | Runner adapter interfaces (framework-agnostic)                                       |
| `packages/store-connect`             | Store connector interfaces (Google Play / Apple)                                     |
| `runners/*`, `fixtures/*`, `infra/*` | Build images, smoke fixtures, Mac install assets (later phases)                      |

## Prerequisites

- Node.js 22 LTS and pnpm 10 (`corepack enable`).
- Docker with the Compose plugin.

## Local development

```bash
# 1. Configure environment
cp .env.example .env
# Generate real secrets and paste them into .env:
openssl rand -hex 32   # -> SESSION_SECRET
openssl rand -hex 32   # -> CREDENTIAL_MASTER_KEY (must be 64 hex chars = 32 bytes)
# Fill in the Cloudflare R2 values (S3_BUCKET, S3_ENDPOINT_URL, S3_ACCESS_KEY_ID,
# S3_SECRET_ACCESS_KEY). The bucket must already exist in your R2 account.

# 2. Install dependencies (first run compiles native modules)
pnpm install

# 3. Bring up the whole stack (builds images on first run)
docker compose up -d --build
```

On first start the `migrate` service applies the database migration and seeds the
single administrator. If you leave `ADMIN_PASSWORD` blank, a strong password is
generated and printed **once** in the migrate logs:

```bash
docker compose logs migrate
```

Then visit:

- Dashboard: <http://localhost:3000> (sign in at `/login`)
- API readiness: <http://localhost:4000/readyz>

### Useful commands

```bash
pnpm -r build          # build every package
pnpm -r test           # run unit tests
pnpm -r typecheck      # type-check every package
pnpm format            # prettier write
docker compose config  # validate the Compose file
docker compose logs -f api
```

### Running services without Docker (control plane hacking)

Start only the data services in Docker and run an app on the host — note the
data services are **not** published to the host by default (see Security), so for
host development either add temporary `ports:` mappings or run the app inside the
Compose network. The simplest reliable loop is `docker compose up -d --build`.

## Configuration

All configuration is validated at startup by `@native-kiln/config`. A missing or
invalid value **fails fast** with a message listing the offending keys (never
their values). See [.env.example](.env.example) for the full list with comments.

Key secrets (supplied via Coolify runtime secrets in production):

- `SESSION_SECRET` — signs/identifies sessions (≥ 32 chars).
- `CREDENTIAL_MASTER_KEY` — AES-256 key for credential encryption (64 hex chars).
  Bump `CREDENTIAL_KEY_VERSION` when rotating.

## Deploying with Coolify

1. Create a **Docker Compose** resource pointing at this repository.
2. Provide the environment variables from `.env.example` as Coolify secrets.
   Do **not** commit a real `.env`.
3. Set the public domain for the `web` service in Coolify; it also supplies
   HTTPS via its proxy. Point `APP_BASE_URL`/`API_BASE_URL` at your domains.
4. Deploy. `migrate` runs first; `api`, `web`, `worker`, `runner-manager`, and
   `cleanup` start once their dependencies are healthy.

The Compose file intentionally:

- defines **no** `container_name` (Coolify controls naming),
- bundles **no** Traefik/Caddy/Nginx (Coolify supplies the proxy),
- publishes **only** `web` and `api`; `postgres` and `redis` are internal-only
  (`expose`, not `ports`). Object storage is external (Cloudflare R2).

## Security boundaries

- **Docker socket:** only `runner-manager` mounts `/var/run/docker.sock` (read
  only). The public API never touches it. Verified in Phase 0.
- **Object storage:** Cloudflare R2 (S3-compatible), one bucket partitioned by
  prefix (`artifacts/`, `logs/`, `sources/`). Keys are supplied via runtime
  secrets, never committed. Rotate any key that has been shared.
- **Credentials:** encrypted at rest with AES-256-GCM, a unique nonce per value,
  and are never returned decrypted to the browser.
- **Auth:** one local administrator, Argon2id password hashing, HTTP-only secure
  session cookies, double-submit-cookie CSRF protection, and login rate limiting.
- **Logs:** structured JSON with a redaction layer for known secret values.
- Untrusted third-party repositories are **out of scope** — build scripts execute
  repository code, so V1 accepts only the owner's repositories (see CLAUDE.md).

## Backup and restore

Relational state lives in the `postgres_data` Docker volume; object state lives
in Cloudflare R2.

**PostgreSQL** (`postgres_data`):

```bash
# Backup
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > backup-db-$(date +%F).sql.gz

# Restore (into a fresh, empty database)
gunzip -c backup-db-YYYY-MM-DD.sql.gz \
  | docker compose exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

**Object storage (Cloudflare R2)** — artifacts, logs, and source archives:

R2 is managed by Cloudflare (durable and replicated). For an independent copy,
mirror the bucket with any S3 tool, e.g. `rclone` or the AWS CLI pointed at the
R2 endpoint:

```bash
aws s3 sync s3://$S3_BUCKET ./r2-backup \
  --endpoint-url "$S3_ENDPOINT_URL"
```

> Keep the database backup and any object-storage snapshot from close to the
> **same point in time** so artifact rows and objects stay consistent.

## macOS iOS runner (Phase 4 preview)

The runner CLI lives in `apps/mac-runner`. Today it can verify the local
toolchain without starting a build or submission:

```bash
pnpm --filter @native-kiln/mac-runner build
node apps/mac-runner/dist/cli.js doctor
```

Registration, `launchd` installation, and IPA builds arrive in Phase 4
(`infra/mac-runner`).

## Roadmap

Phases are defined in [CLAUDE.md](CLAUDE.md): **0** scaffold ✅ · 1 control plane
· 2 Android builder · 3 Google Play · 4 M1 iOS runner · 5 Apple submission ·
6 hardening.

## License

See [LICENSE](LICENSE).
