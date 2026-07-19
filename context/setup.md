# Clocksy — Developer Setup

Everything you need to go from a fresh machine to a running local development
environment. Clocksy is split into **three independent repositories** — `desktop`,
`backend`, and `dashboard` — each with its own `package.json`, `package-lock.json`,
and `.env`. There is no monorepo, no Turborepo, and no pnpm. The package manager
is **npm** everywhere.

---

## Prerequisites

Install these before anything else. Exact minimum versions listed — do not use
older ones.

| Tool | Minimum Version | Install |
|---|---|---|
| Node.js | **24.x** (Active LTS) | [nodejs.org](https://nodejs.org) or `nvm install 24` |
| npm | **11.x** (ships with Node 24) | Bundled with Node.js |
| Docker + Compose | Any recent | [docker.com](https://www.docker.com) — runs PostgreSQL + MinIO |
| Git | Any recent | Pre-installed on most systems |

> **macOS only:** Xcode Command Line Tools are required for the desktop app's
> native modules (`uiohook-napi`, `better-sqlite3`, `sharp`). Run
> `xcode-select --install` if not already installed.
>
> **Windows only:** Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
> with the "Desktop development with C++" workload selected.
>
> **Linux:** Install build essentials — `sudo apt install build-essential python3`
> (Debian/Ubuntu) or equivalent.

Verify your setup:

```bash
node --version    # should print v24.x.x
npm --version     # should print 11.x.x
docker --version
```

---

## Repositories

Each repo is cloned, installed, configured, and run on its own.

| Repo | Stack | Dev port |
|---|---|---|
| `backend` | Fastify + TypeScript | `http://localhost:3001` |
| `dashboard` | Next.js (App Router) + TypeScript | `http://localhost:3000` |
| `desktop` | Electron + React + TypeScript (electron-vite) | Native window |

> A common local layout is to clone all three side by side under one parent
> folder, but that is only for convenience — nothing links them together.

---

## First-Time Setup

### 1. Backend (owns the database + storage)

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `backend/.env` — this is the **only** place the database and storage
credentials belong. Set `JWT_SECRET`, the `S3_*` values, and the `POSTGRES_*` /
`MINIO_*` values (defaults in `.env.example` work for local dev).

#### 1a. Start PostgreSQL + MinIO

```bash
docker compose up -d          # starts postgres, minio, and creates the bucket
```

- MinIO console: http://localhost:9001 (`MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`)
- PostgreSQL: `localhost:5432`

#### 1b. Apply the schema and seed demo data

```bash
npx prisma migrate deploy     # or: npm run db:migrate:dev  (local dev)
npm run db:seed               # admin@clocksy.test / ClocksyTest123! + 2 employees
```

Regenerate the Prisma client any time `prisma/schema.prisma` changes:

```bash
npm run db:generate
```

Start the API:

```bash
npm run dev
curl http://localhost:3001/health   # → {"status":"ok"}
```

### 2. Dashboard

```bash
cd dashboard
npm install
cp .env.example .env.local
```

Fill in `dashboard/.env.local`. `JWT_SECRET` must match the backend's so
middleware can verify session tokens:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
JWT_SECRET=must-match-backend
```

Start it:

```bash
npm run dev   # http://localhost:3000
```

### 3. Desktop

```bash
cd desktop
npm install
cp .env.example .env
```

Fill in `desktop/.env` (backend URL only — the desktop app holds no credentials):

```env
BACKEND_URL=http://localhost:3001
VITE_BACKEND_URL=http://localhost:3001
```

> `npm install` also rebuilds the native modules (`uiohook-napi`,
> `better-sqlite3`, `sharp`) for your platform. If this fails with a native build
> error, confirm the C++ build tools in Prerequisites are installed.

Start it:

```bash
npm run dev   # opens the Electron window
```

---

## Common Commands

Run these **inside the relevant repo** — there is no root-level orchestration.

| Command | What it does |
|---|---|
| `npm install` | Install dependencies for the current repo |
| `npm run dev` | Start the current repo in dev mode |
| `npm run build` | Production build for the current repo |
| `npm run typecheck` | Run `tsc --noEmit` for the current repo |
| `npm run lint` | Run ESLint for the current repo |
| `npm run lint -- --fix` | Auto-fix lint errors where possible |

Database/storage commands (run from the `backend` repo, which owns them):

| Command | What it does |
|---|---|
| `docker compose up -d` | Start PostgreSQL + MinIO (and create the bucket) |
| `docker compose down` | Stop the stack (add `-v` to also drop volumes/data) |
| `npm run db:migrate:dev` | Create + apply a migration in local dev |
| `npx prisma migrate deploy` | Apply pending migrations (CI/prod) |
| `npm run db:generate` | Regenerate the Prisma client after a schema change |
| `npm run db:seed` | Seed the demo team + accounts |

---

## Ports Reference

| Repo | URL | Notes |
|---|---|---|
| `backend` (Fastify) | `http://localhost:3001` | All API endpoints live here |
| `dashboard` (Next.js) | `http://localhost:3000` | Admin UI |
| `desktop` (Electron) | Native window | Opens on `npm run dev` |

---

## Subsequent Dev Sessions

Open each repo you are working on and run its dev script:

```bash
cd backend   && npm run dev   # terminal 1
cd dashboard && npm run dev   # terminal 2
cd desktop   && npm run dev   # terminal 3
```

You only need to run the repos relevant to your current task. No other steps are
required unless:

- **Schema changed** → in `backend`, run `npm run db:migrate:dev` (regenerates the
  Prisma client) and update each repo's `types/` copies by hand.
- **Dependencies changed** in a repo → re-run `npm install` in that repo.
- **New env variable added** → check that repo's `.env.example` diff and update
  your local `.env` / `.env.local`.

---

## Troubleshooting

**`uiohook-napi` fails to build on install (desktop)**

Ensure C++ build tools are installed (see Prerequisites). Then, from `desktop`:

```bash
npm install --force
```

**Electron window opens blank / renderer fails to load**

Check that `desktop/.env` has the correct `BACKEND_URL` / `VITE_BACKEND_URL`. A
missing env var causes a silent failure in the renderer.

**Prisma cannot reach the database**

Ensure `docker compose up -d` is running and `DATABASE_URL` in `backend/.env`
matches the `POSTGRES_*` values. Check `docker compose ps` for healthy containers.

**Backend returns 401 on every request**

The JWT is likely expired, or `JWT_SECRET` differs between the token issuer
(backend) and verifier (dashboard). Confirm both `.env` files use the same
`JWT_SECRET`, then sign in again.

**`npm run dev` in `desktop` does not open a window on a headless server**

Electron requires a windowing environment. On a headless Linux server, the
desktop app cannot open — run only the `backend` and `dashboard` repos there.

**Prisma migration drift**

Never hand-edit an applied migration. Change `prisma/schema.prisma` and create a
new migration:

```bash
npm run db:migrate:dev
```
