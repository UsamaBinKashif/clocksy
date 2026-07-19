# Clocksy — Build Plan

Units are ordered by dependency. Each unit stays within one system boundary, produces a visible or verifiable result, and is small enough to complete in a single focused session. Units that are inseparable or have no standalone result have been merged.

---

## Phase 1 — Foundation

### Unit 1 — Three-Repo Scaffold

**Builds:** The three independent repositories — `desktop`, `backend`, and
`dashboard`. Each gets its own `package.json`, `package-lock.json`,
`tsconfig.json`, ESLint config, Prettier config, `.gitignore`, and
`.env.example`. There is no root workspace, no `turbo.json`, and no
`pnpm-workspace.yaml`.

**Visible result:** `npm install` succeeds inside each repo. Each repo has a
consistent, self-contained TypeScript and lint baseline. Running `npm run build`
in any repo exits cleanly even before feature code exists.

**Depends on:** Nothing. This is the starting point.

---

### Unit 2 — Shared Domain Types (per repo)

**Builds:** A `types/` module in each repo — TypeScript interfaces for `Session`, `ActivityLog`, `Screenshot`, and `Profile`, plus an index barrel export. The three copies are identical at creation and are kept in sync by hand as the schema evolves.

**Visible result:** `npm run typecheck` passes in each repo. Any file within a repo can import its domain types from the local `types/` module.

**Depends on:** Unit 1 (repos scaffolded)

---

### Unit 3 — Prisma Schema, Migrations & Docker Infra

**Builds:** `prisma/schema.prisma` and `docker-compose.yml` inside the **`backend`** repo (which owns the schema, storage, and their credentials):
- `User` (auth + profile: email, password_hash, display_name, avatar_url, team_id, role)
- `Team`
- `Session` (status, paused_seconds, client_at, received_at)
- `ActivityLog` (minute buckets, client_at, received_at)
- `Screenshot` (metadata only, storage_path)

Foreign keys and cascades are declared in the schema. `docker-compose.yml` runs PostgreSQL + MinIO with persistent volumes, health checks, and a one-shot job that creates the private `time-tracker` bucket.

**Visible result:** `docker compose up -d` brings up healthy PostgreSQL + MinIO and creates the bucket. `npx prisma migrate deploy` applies the schema cleanly and `npm run db:seed` inserts the demo team + accounts. Authorization is enforced by the backend at the application layer (no DB-level RLS).

**Depends on:** Unit 1 (backend repo exists). Unit 2 types are a reference, not a hard runtime dependency.

---

### Unit 4 — Prisma Client & Storage Abstraction (backend)

**Builds:** `backend/src/lib/prisma.ts` (a single `PrismaClient`, decorated onto Fastify as `app.prisma`) and `backend/src/lib/storage.ts` (an S3-compatible abstraction — `upload`, `delete`, `getUrl`, `getUploadUrl` — decorated as `app.storage`). The desktop and dashboard have no database or storage clients; they reach data only through the backend API.

**Visible result:** `npm run typecheck` passes in the backend. Importing the Prisma client resolves fully-typed models; the storage service exposes the four methods.

**Depends on:** Unit 2 (local domain types), Unit 3 (schema + generated client)

---

## Phase 2 — Backend API

### Unit 5 — Fastify App Skeleton + Auth Plugin

**Builds:** `backend` scaffold: `package.json`, `tsconfig.json`, `src/app.ts` (Fastify instance, plugin registration, graceful shutdown), `src/server.ts` (entry point, port/env config), `src/plugins/prisma.ts` + `src/plugins/storage.ts` (decorators), `src/plugins/auth.ts` (global `onRequest` hook that verifies the backend JWT on every route and populates `request.user`), `src/routes/auth.ts` (`POST /auth/login`, `GET /auth/me`), and a `GET /health` route.

**Visible result:** `npm run dev` in `backend` starts the server. `curl http://localhost:3001/health` returns `{"status":"ok"}`. `curl http://localhost:3001/sessions` (a protected route stub) returns `401 Unauthorized` without a valid JWT.

**Depends on:** Unit 1 (backend repo), Unit 4 (Prisma client + storage abstraction)

---

### Unit 6 — Session Routes

**Builds:** `src/routes/sessions.ts` with three routes, each with Fastify JSON schema validation:
- `POST /sessions/start` — inserts a new session row, returns `session_id`
- `POST /sessions/pause` — updates `status = 'paused'`, accumulates `paused_seconds`
- `POST /sessions/stop` — updates `status = 'ended'`, sets `ended_at`

All routes read identity from `request.user.sub`. Writes go through `app.prisma`.

**Visible result:** With a valid JWT, all three endpoints respond correctly and the session row in PostgreSQL reflects the correct status transitions. An invalid or missing JWT returns `401` on all three.

**Depends on:** Unit 5 (Fastify skeleton + auth plugin), Unit 3 (sessions table), Unit 4 (Prisma client)

---

### Unit 7 — Activity Ingestion Route

**Builds:** `src/routes/activity.ts` — `POST /activity` accepts a JSON array of minute-bucket records (`session_id`, `bucket_start`, `keyboard_count`, `mouse_count`, `is_idle`). Validates ownership (session must belong to `request.user.sub`). Batch-inserts into `activity_logs` via `app.prisma`. `received_at` defaults to `NOW()` on insert.

**Visible result:** Posting a batch of 3 activity records with a valid JWT inserts 3 rows in `activity_logs` with correct `received_at` timestamps. Posting with a `session_id` that belongs to a different user returns `403`.

**Depends on:** Unit 5, Unit 6 (session must exist to validate ownership), Unit 3 (activity_logs table), Unit 4

---

### Unit 8 — Screenshot Routes

**Builds:** `src/routes/screenshots.ts` with three routes:
- `POST /screenshots/upload-url` — validates the session belongs to the requesting user, returns a short-lived MinIO presigned PUT URL (scoped to the user's key prefix) for the client to upload directly.
- `POST /screenshots/register` — records the screenshot metadata row in `screenshots` after upload.
- `GET /screenshots/:id/url` — verifies the requester is the owning employee or an admin of that employee's team, returns a short-lived presigned download URL.

**Visible result:** `POST /screenshots/upload-url` returns a presigned URL. A `PUT` to that URL with a JPEG payload uploads the file to the private bucket. `GET /screenshots/:id/url` returns a working download link. An employee trying to fetch another employee's screenshot URL receives `403`.

**Depends on:** Unit 5, Unit 6, Unit 3 (screenshots table + private bucket), Unit 4

---

### Unit 9 — Admin Report Routes

**Builds:** `src/routes/reports.ts` with two routes:
- `GET /reports/team` — returns all sessions + activity summaries for all members of the requesting admin's team, filterable by date range via query params.
- `GET /reports/employee/:id` — returns sessions, activity logs, and screenshot metadata for a specific employee, gated to admins of that employee's team.

Both routes return `403` if the requesting user's role is not `admin`.

**Visible result:** An admin JWT returns team data. An employee JWT on the same routes returns `403`. The response shape matches the Fastify JSON schema defined for each route.

**Depends on:** Unit 5, Unit 6, Unit 7, Unit 8, Unit 4

---

## Phase 3 — Desktop App

### Unit 10 — Electron + Vite Skeleton

**Builds:** `desktop` scaffold: `package.json`, `electron.vite.config.ts`, `tsconfig.json` (separate configs for main, preload, renderer), `electron/main.ts` (creates `BrowserWindow`, loads renderer, registers app lifecycle hooks — no business logic), `electron/preload.ts` (empty `contextBridge` with a typed `window.clocksy` stub), `src/renderer/main.tsx` (React root mount), `src/renderer/App.tsx` (placeholder), Tailwind + PostCSS config, global CSS with design tokens from `ui-context.md`, shadcn/ui initialisation.

**Visible result:** `npm run dev` in `desktop` opens an Electron window showing the React placeholder. Hot module reload works in the renderer. `window.clocksy` is accessible in the browser devtools console.

**Depends on:** Unit 1, Unit 2

---

### Unit 11 — Auth Service + Login UI

**Builds:**
- `electron/services/auth.ts` — calls the backend `POST /auth/login` from the main process, holds the returned JWT + user in memory, and exposes `login`, `logout`, `getUser`, `getAccessToken`.
- `electron/preload.ts` — exposes `login`, `logout`, `getUser` via `contextBridge`.
- `src/renderer/pages/Login.tsx` — login form (email/password), calls `window.clocksy.login()`. Minimal, centred layout using design tokens from `ui-context.md`.
- `src/renderer/App.tsx` — routes between `<Login>` and `<Tracker>` based on auth state received via the preload.

**Visible result:** Launching the app shows the login page. Signing in with a valid account navigates to the (placeholder) tracker screen. Signing out returns to the login page. The renderer never sees the raw access token.

**Depends on:** Unit 10, Unit 5 (backend `/auth/login`)

---

### Unit 12 — SQLite Queue

**Builds:** `electron/services/queue.ts` — initialises a `better-sqlite3` database in `app.getPath('userData')`. Creates `pending_activity` and `pending_screenshots` tables on first run (idempotent). Exports typed functions: `enqueueActivity`, `dequeuePendingActivity`, `confirmActivity`, `enqueueScreenshot`, `dequeuePendingScreenshots`, `confirmScreenshot`. Records are deleted only on explicit confirm (after server receipt).

**Visible result:** Unit tests (or a manual smoke test in the main process) confirm that enqueuing 5 activity records, then dequeuing, then confirming 3 leaves exactly 2 rows in `pending_activity`.

**Depends on:** Unit 10 (Electron app exists, `app.getPath` available)

---

### Unit 13 — Activity Tracking Service

**Builds:** `electron/services/activity.ts` — starts `uiohook-napi` event listeners on session start. Increments in-memory `keyboardCount` and `mouseCount` per minute. Every 60 seconds, calls `queue.enqueueActivity` with the current bucket and resets counters. Exports `start(sessionId)` and `stop()`. No content is captured — only integer counts.

**Visible result:** Starting a session and typing/clicking for 2 minutes results in 2 rows in the `pending_activity` SQLite table with non-zero counts. Stopping the session flushes the partial current-minute bucket and stops the listener.

**Depends on:** Unit 12 (queue), Unit 11 (session ID comes from auth/session start)

---

### Unit 14 — Idle Detection Service

**Builds:** `electron/services/idle.ts` — polls `powerMonitor.getSystemIdleTime()` every 30 seconds. Emits `idle` and `active` events when the idle threshold is crossed in either direction. `tracker.ts` will subscribe to these events to pause/resume billing. Exports `start(thresholdSeconds)` and `stop()`. Default threshold: 300 seconds (5 minutes).

**Visible result:** Leaving the machine idle for the threshold period causes the idle service to emit the `idle` event (verified in the main process log). Moving the mouse causes it to emit `active`.

**Depends on:** Unit 10 (Electron main process context)

---

### Unit 15 — Screenshot Service

**Builds:** `electron/services/screenshot.ts` — on a 15-minute interval, calls `desktopCapturer.getSources({ types: ['screen'] })`, takes the primary display thumbnail, compresses it to JPEG at 1280px wide / 70% quality with `sharp`, writes the compressed buffer to a temp file, and calls `queue.enqueueScreenshot` with the file path and metadata. Exports `start(sessionId)` and `stop()`.

**Visible result:** Starting a session and waiting 15 minutes (or calling the capture function manually with a short interval in dev mode) results in a JPEG file on disk and a corresponding row in `pending_screenshots`.

**Depends on:** Unit 12 (queue), Unit 11 (session ID)

---

### Unit 16 — Upload Service

**Builds:** `electron/services/upload.ts` — a continuous async loop that:
1. Dequeues pending activity records and POSTs batches to `POST /activity` on the backend.
2. Dequeues pending screenshots, requests a presigned upload URL from `POST /screenshots/upload-url`, PUTs the file to storage, then registers the record via `POST /screenshots/register`.
3. On network failure, applies exponential backoff (max 60-second delay). Resumes immediately when connectivity is restored.
4. Calls `queue.confirmActivity` / `queue.confirmScreenshot` only after a successful backend response.

Exports `start(authToken)` and `stop()`.

**Visible result:** With a running backend, activity records and screenshots queued in SQLite upload and are confirmed (deleted from SQLite) within seconds. Disabling the network mid-session and re-enabling it causes the queue to drain without duplicates.

**Depends on:** Unit 12 (queue), Unit 5–8 (backend routes must be live), Unit 11 (auth token)

---

### Unit 17 — Tracker Orchestration + Preload API

**Builds:**
- `electron/services/tracker.ts` — owns session state. On `start`: calls the backend `POST /sessions/start`, then calls `activity.start()`, `idle.start()`, `screenshot.start()`, `upload.start()`. On `pause`: calls `POST /sessions/pause`, suspends activity/screenshot intervals. On `stop`: calls `POST /sessions/stop`, calls `stop()` on all services, flushes remaining queue. Subscribes to idle events and proxies them to pause/resume.
- `electron/preload.ts` — adds `startSession`, `pauseSession`, `stopSession`, `onSessionStatus` (IPC event listener) to the `contextBridge`.
- `electron/main.ts` — wires IPC handlers for the above to `tracker.ts`.

**Visible result:** Clicking Start in the renderer (or calling `window.clocksy.startSession()` from devtools) starts all background services. Clicking Stop cleanly shuts them down and flushes the queue. Session status updates flow back to the renderer via `onSessionStatus`.

**Depends on:** Units 11–16 (all services), Units 5–8 (backend)

---

### Unit 18 — Tracker Window UI

**Builds:** `src/renderer/pages/Tracker.tsx` — the main tracker window UI:
- Current session status (Active / Paused / Idle) with a colour indicator using design tokens
- Elapsed time display (HH:MM:SS, monospace font)
- Today's total tracked hours
- Start / Pause / Stop button (accent yellow/orange per `ui-context.md`)
- Mini activity indicator (active vs idle)

All data flows through `window.clocksy.*` preload calls. No Node APIs in this file.

**Visible result:** The tracker window renders correctly. Starting a session shows the elapsed timer incrementing. The status indicator changes colour when the session is active vs idle vs stopped.

**Depends on:** Unit 17 (preload API complete), Unit 10 (Tailwind + shadcn set up)

---

### Unit 19 — System Tray

**Builds:** `electron/main.ts` tray integration — creates a `Tray` instance with an icon. Context menu shows: session status, elapsed time, Start/Stop/Pause actions, Quit. Clicking the tray icon shows/hides the main window. Tray icon changes state (active vs idle vs stopped) based on session state from `tracker.ts`.

**Visible result:** The app minimises to the tray. Right-clicking the tray icon shows the context menu with live session state. Clicking Quit cleanly stops all services and exits.

**Depends on:** Unit 17 (tracker state), Unit 18 (renderer is functional)

---

### Unit 20 — Auto-Update

**Builds:** `electron-updater` integration in `electron/main.ts` — checks for updates on startup and every 4 hours. Shows a native dialog when an update is available. Downloads and installs on next quit. Configured against the GitHub Releases URL for this repo.

**Visible result:** Publishing a new version to GitHub Releases with an incremented `package.json` version causes a running app to detect the update. The user sees the update prompt.

**Depends on:** Unit 19 (app is functionally complete), GitHub repository and Releases workflow exist.

---

## Phase 4 — Admin Dashboard

### Unit 21 — Next.js Skeleton + Auth

**Builds:** `dashboard` scaffold: `package.json`, `tsconfig.json`, `tailwind.config.js` (with design tokens from `ui-context.md`), global CSS, `next.config.js`, `app/layout.tsx`. Auth layer: `lib/session.ts` + `lib/jwt.ts` (httpOnly cookie + JWT verification), `lib/auth.ts` (`getMe`/`getUser` via backend `/auth/me`), `lib/api.ts` (typed `fetch` wrapper that attaches the backend JWT as `Authorization: Bearer`), route handlers `app/api/login` + `app/api/logout`. Login page at `app/(auth)/login/page.tsx`. Middleware that redirects unauthenticated users to `/login`.

**Visible result:** `npm run dev` in `dashboard` starts the Next.js dev server. Visiting `/` redirects to `/login`. Logging in with a valid admin account redirects to `/admin`. The session persists across page reloads via the cookie.

**Depends on:** Unit 1, Unit 5 (backend `/auth/login` + `/auth/me`)

---

### Unit 22 — Dashboard Layout + Navigation

**Builds:** `app/(admin)/layout.tsx` — the shell shared by all admin pages: left sidebar with navigation links (Overview, Employees, Screenshots), workspace name at the top, user avatar menu (sign out) at the bottom. Top bar with page title. Design matches `ui-context.md` — neutral sidebar, accent colours on active nav item.

**Visible result:** All admin pages render inside the shared layout. Active nav item is highlighted. The user avatar menu opens and the sign-out option works.

**Depends on:** Unit 21

---

### Unit 23 — Team Overview Page

**Builds:** `app/(admin)/page.tsx` — the main dashboard page:
- Four stat tiles: total hours today, active members count, average activity %, total idle time
- Employee status table: avatar, name, hours today, activity % bar, status pill (Active / Idle / Offline)
- Date filter (today / this week / custom range) that re-fetches data

Data fetched from `GET /reports/team` via `lib/api.ts`.

**Visible result:** The overview page renders real data from the backend. Changing the date filter updates the stat tiles and table. Each row reflects the correct status for the employee based on their most recent session.

**Depends on:** Unit 22, Unit 9 (team report route)

---

### Unit 24 — Employee Session Timeline Page

**Builds:** `app/(admin)/employees/[id]/page.tsx` — per-employee detail page:
- Session list for the selected date range
- Horizontal timeline for each session showing active (green), idle (amber), and paused (grey) segments by hour, derived from `activity_logs`
- Summary stats: total tracked, total idle, activity %

Data fetched from `GET /reports/employee/:id`.

**Visible result:** Clicking an employee row on the overview page navigates to their detail page with a rendered timeline. Active/idle segments are visually distinct and proportional to real data.

**Depends on:** Unit 23, Unit 9

---

### Unit 25 — Screenshot Gallery Page

**Builds:** `app/(admin)/employees/[id]/screenshots/page.tsx` — paginated screenshot gallery for a selected session:
- Thumbnail grid (4 columns), each showing a blurred placeholder until the presigned URL loads
- Clicking a thumbnail opens a lightbox with the full image
- Each thumbnail shows the timestamp and activity % at capture time

Presigned URLs are fetched one at a time from a same-origin route handler (which proxies `GET /screenshots/:id/url`) as thumbnails enter the viewport (lazy load). No URLs are pre-fetched in bulk.

**Visible result:** The gallery renders thumbnails for a session's screenshots. Clicking a thumbnail shows the full image. Screenshots belonging to other teams return a `403` and are not displayed.

**Depends on:** Unit 24, Unit 8 (screenshot presigned URL route)

---

## Phase 5 — CI & Distribution

### Unit 26 — GitHub Actions CI (per repo)

**Builds:** A `.github/workflows/ci.yml` in **each** repo. Every workflow runs on
PRs to that repo and executes `npm ci && npm run lint && npm run typecheck && npm run build`.
The `desktop` and `dashboard` workflows add a secret-scan step that fails the
build if database or storage credentials (`DATABASE_URL`, `S3_SECRET_KEY`, etc.)
appear anywhere in the repo. Since the repos are independent, there is no
cross-repo filtering or shared cache — each repo's PR only runs that repo's workflow.

**Visible result:** Opening a PR in `dashboard` runs only the dashboard workflow;
`backend` and `desktop` are untouched. A PR that introduces backend credentials
into `desktop` or `dashboard` fails that repo's CI.

**Depends on:** Units 1–25 (each repo must build cleanly first)

---

### Unit 27 — Desktop Installer & Auto-Update Pipeline

**Builds:** `.github/workflows/release.yml` — triggered on a version tag (`v*`):
- Builds and code-signs installers for Windows (`.exe`), macOS (`.dmg`, notarised), and Linux (`.AppImage`) using `electron-builder`.
- Uploads artifacts to a GitHub Release.
- `electron-updater` in the app polls this release URL.

Lives in the `desktop` repo. Also adds `electron-builder.config.js` to `desktop` with correct `appId`, `productName`, platform targets, and signing certificate references (via GitHub Secrets — no keys in source).

**Visible result:** Pushing a `v1.0.0` tag triggers the release workflow. A GitHub Release is created with all three installer artifacts. A running app with `electron-updater` configured detects the new release.

**Depends on:** Unit 20 (auto-update wired in the app), Unit 26 (CI pipeline structure)
