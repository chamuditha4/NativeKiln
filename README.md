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

## macOS iOS runner — setup guide

iOS apps can only be built on a Mac, so Native Kiln uses a Mac as a remote
"runner": the Linux control plane sends it iOS build jobs and gets back a signed
`.ipa` file. This section walks you through preparing that Mac, step by step. **No
prior command-line experience is assumed** — you can copy and paste each command.

> **What works today (Phase 0):** the setup below plus the `doctor` command that
> checks your Mac is ready. **Coming in Phase 4:** the runner registering itself
> with the control plane, running in the background via `launchd`, and actually
> building `.ipa` files. Doing the setup now means the Mac is ready the moment
> Phase 4 lands.

### Supported devices

Any Mac with an **Apple Silicon** chip (M1 or newer) works as a runner. That
includes:

- **Laptops** — MacBook Air, MacBook Pro.
- **Desktops** — Mac mini, Mac Studio, iMac, Mac Pro.

A **Mac mini** or **Mac Studio** makes an excellent always-on runner because it
is a desktop with no battery to worry about. A laptop works just as well; see the
laptop notes below.

> Intel Macs are **not** a supported target. They may work for basic builds but
> are untested and outside V1 scope.

### Before you start

- A supported Apple Silicon Mac (see above).
- **macOS** kept up to date (a current release that supports Xcode 26+).
- The Mac should be **always on and plugged into power** — it is a build server
  that needs to be reachable whenever a job arrives.
- An **Apple ID**, and later an **Apple Developer account** for signing (only
  needed once you build real apps in Phase 4+).

**If your runner is a laptop:**

- Keep it **connected to power** and configure it not to sleep while idle (Phase 4
  ships helpers for keeping it awake during builds).
- You can run it with the lid closed ("clamshell") when connected to power and,
  on some models, an external display or keyboard.

> ⚠️ **Battery safety (laptops).** If a laptop's battery looks **swollen**, the
> case or trackpad is **lifting/bulging**, or the machine gets **unusually hot**,
> stop and have the battery serviced before leaving it running unattended. A
> swollen lithium battery is a fire risk. Desktops (Mac mini, Mac Studio, etc.)
> have no battery and are unaffected.

### Running the Mac headless (no monitor, or a broken screen)

A build runner does not need a monitor day-to-day. Many people use a **Mac mini
with no display**, or an **old MacBook with a cracked/broken screen**, tucked away
somewhere and controlled entirely from another computer.

The recommended way to reach it is **[Tailscale](https://tailscale.com)** — a free
"private network" (mesh VPN) that lets your laptop talk to the Mac directly and
securely, **without opening any ports to the public internet** and without knowing
the Mac's IP address. This matches Native Kiln's security model: the Mac only ever
makes **outbound** connections; nothing on it is exposed publicly. (Any similar
tool — WireGuard, ZeroTier, or a plain LAN with static IP — works too; the steps
below use Tailscale because it is the easiest.)

#### One-time setup that needs the screen

Two things must be turned on **once** using the Mac's graphical screen:
**Remote Login (SSH)** and **Tailscale**. If the screen is broken, get temporary
picture in one of these ways, do the setup, then unplug it:

- Plug in an **external monitor** (HDMI/USB-C), or
- Use a cheap **"HDMI dummy plug"** (headless display adapter) so macOS behaves as
  if a monitor is attached, or
- If you have a **second Mac**, sign in to both with the same Apple ID and use
  **Screen Sharing** over the local network.

Once you can see the screen (even briefly):

**1. Turn on Remote Login (SSH):**

- Open **System Settings** → **General** → **Sharing**.
- Turn **Remote Login** **on**. Note the line it shows, e.g.
  `ssh yourusername@…` — that `yourusername` is what you'll log in as.

**2. (Optional but handy) Turn on Screen Sharing** so you can see the desktop
remotely later (needed for GUI-only steps like signing into the App Store or
opening Xcode the first time):

- Same **Sharing** screen → turn **Screen Sharing** **on**.

**3. Install Tailscale on the Mac:**

- Easiest: install the app from the **Mac App Store** (search "Tailscale"), or via
  Homebrew once you've done Step 3 of the install guide below:
  ```bash
  brew install --cask tailscale
  ```
- Open the **Tailscale** app (it appears in the menu bar at the top-right), click
  **Log in**, and sign in with Google/GitHub/email. Use the **same Tailscale
  account** on every device you want to connect from.
- Click the Tailscale menu-bar icon and note this Mac's name/address (there's a
  **"Copy IP address"** option). You'll also see a friendly name like
  `mac-mini` you can use instead of the number.

#### Connecting from your own computer

1. Install Tailscale on **your** computer too (Windows, Mac, or Linux) and sign in
   to the **same** account: <https://tailscale.com/download>.
2. Open a terminal on your computer and SSH in using the Mac's Tailscale name or
   IP and the username from Remote Login:
   ```bash
   ssh yourusername@mac-mini          # using the Tailscale device name
   # or
   ssh yourusername@100.x.y.z         # using the Tailscale IP
   ```
   The first time, it asks to confirm the fingerprint — type `yes`. Enter the
   Mac's login password when prompted.

You are now on the Mac's command line remotely and can run **all** of the install
steps below over SSH.

> **Tip — passwordless login.** Copy your SSH key to the Mac so you don't retype
> the password each time: `ssh-copy-id yourusername@mac-mini`. (If you don't have
> a key yet, run `ssh-keygen` first and press Return through the prompts.)

#### Seeing the desktop remotely (for GUI-only steps)

A few steps (opening Xcode the first time, signing into the App Store or your
Apple Developer account) need the graphical desktop. With **Screen Sharing** on
(above) and both machines on Tailscale, connect to the desktop:

- **From another Mac:** open **Finder** → **Go** → **Connect to Server…** and
  enter `vnc://mac-mini` (or `vnc://100.x.y.z`).
- **From Windows/Linux:** use any VNC client pointed at the same Tailscale
  address.

#### Keep a headless Mac awake and reachable

So the Mac stays online for incoming build jobs, stop it from sleeping:

```bash
# Never sleep the whole machine; allow the display to sleep. Asks for password.
sudo pmset -a sleep 0
sudo pmset -a displaysleep 10
```

On a **laptop run with the lid closed**, also make sure it's on power and, if
needed, keep it awake during long tasks with `caffeinate` (Phase 4 automates
this during builds):

```bash
caffeinate -dimsu   # keeps the Mac awake until you press Ctrl+C
```

> **Security note.** Only devices signed in to _your_ Tailscale account can reach
> the Mac, and only over the encrypted Tailscale network — you never forward ports
> on your router or expose SSH to the public internet. You can further restrict
> access with Tailscale ACLs, and optionally enable **Tailscale SSH** (`tailscale
up --ssh`) to manage SSH access from the Tailscale admin console.

### What is the "Terminal"?

Everything below is typed into the **Terminal** app — the Mac's text command
window. **If you connected over SSH (headless setup above), you are already in a
terminal** — skip straight to Step 1.

To open Terminal directly on the Mac:

1. Press `Command (⌘) + Space` to open Spotlight search.
2. Type `Terminal` and press `Return`.
3. A window opens where you can paste commands. Paste one, press `Return`, and
   wait for it to finish before the next.

To paste: `Command (⌘) + V`. Some installers will ask for your Mac login
password — as you type it, **nothing appears on screen** (that's normal), just
type it and press `Return`.

### Step 1 — Install the Xcode Command Line Tools

These give you `git` and basic build tools. Run:

```bash
xcode-select --install
```

A small window pops up — click **Install** and agree to the license. Wait for it
to finish (a few minutes).

### Step 2 — Install the full Xcode app

The Command Line Tools alone are **not enough** to build iOS apps; you need the
full Xcode app.

1. Open the **App Store** on the Mac.
2. Search for **Xcode** and click **Get / Install** (it is large — several GB —
   so this can take a while).
3. Once installed, **open Xcode once** so it can finish setting itself up, then
   accept any prompts.

Now point the tools at the full Xcode and accept its license (this asks for your
password):

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

Native Kiln targets **Xcode 26 or newer**. Check your version with:

```bash
xcodebuild -version
```

### Step 3 — Install Homebrew (the Mac package manager)

Homebrew is a tool that installs other developer tools with one command. Install
it by pasting:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

When it finishes, it may print two `echo ...` lines telling you to run them so
your Terminal can find `brew`. **Copy and run those exact lines it shows you.**
Then confirm it works:

```bash
brew --version
```

### Step 4 — Install Node.js

Native Kiln's runner is a small Node.js program, so the Mac needs Node 22:

```bash
brew install node@22
brew link --overwrite node@22
node --version   # should print v22.x
```

### Step 5 — Install CocoaPods and Fastlane

- **CocoaPods** installs iOS libraries an app depends on.
- **Fastlane** helps upload builds to TestFlight / the App Store.

```bash
brew install cocoapods fastlane
pod --version
fastlane --version
```

### Step 6 — Check the Mac is ready (`doctor`)

Native Kiln ships a `doctor` command that verifies everything above in one shot.
It only **reads** your setup — it never starts a build or uploads anything.

Get the runner code onto the Mac and run the check:

```bash
# Get the code (replace the URL with your repository)
git clone https://github.com/<your-account>/NativeKiln.git
cd NativeKiln

# Install dependencies and build the runner
corepack enable
pnpm install
pnpm --filter @native-kiln/mac-runner build

# Run the readiness check
node apps/mac-runner/dist/cli.js doctor
```

You'll see a line per tool, for example:

```text
[OK ] sw_vers      15.x
[OK ] xcodebuild   Xcode 26.x
[OK ] node         v22.x
[OK ] pod          1.x
[OK ] fastlane     2.x
[OK ] git          git version 2.x
```

Any line marked `MISSING` tells you which step above to revisit.

### Coming in Phase 4

These commands are stubs today and will be completed in Phase 4:

- `kiln-runner register --token <token> --url <api>` — you create a one-time
  registration token in the dashboard, paste it here, and the Mac securely stores
  its identity in the macOS **Keychain** (never in a plain text file).
- `kiln-runner run` — the Mac connects out to the control plane and starts
  building iOS jobs. It only ever makes **outbound** connections, so you never
  have to open your Mac up to the internet.
- A **`launchd`** installer so the runner starts automatically and restarts after
  reboots or network drops, plus notes on **preventing sleep** during a build
  (`caffeinate`). These assets will live in `infra/mac-runner`.

Until then, completing Steps 1–6 and getting a clean `doctor` result means your
Mac is fully prepared.

## Roadmap

Phases are defined in [CLAUDE.md](CLAUDE.md): **0** scaffold ✅ · 1 control plane
· 2 Android builder · 3 Google Play · 4 M1 iOS runner · 5 Apple submission ·
6 hardening.

## License

See [LICENSE](LICENSE).
