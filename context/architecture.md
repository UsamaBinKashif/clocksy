# Clocksy — Architecture

## Stack

| Layer | Technology | Role |
|---|---|---|
| Desktop app | Electron 30 + React 18 + TypeScript | Employee-facing tracker: session control, activity capture, screenshot queue, tray UI |
| Desktop bundler | `electron-vite` | Vite-based bundler for the renderer; fast HMR in dev; separate entry points for main, preload, renderer |
| Desktop UI | Tailwind CSS + shadcn/ui | Renderer-only styling; components copied into `desktop/src/renderer/components/ui` |
| Input tracking | `uiohook-napi` | Native hook for keyboard/mouse event counts in the main process; no content captured |
| Screenshot capture | Electron `desktopCapturer` + `sharp` | Periodic screen grab + JPEG compression before queuing |
| Idle detection | Electron `powerMonitor.getSystemIdleTime()` | Returns seconds since last input; used to auto-pause billing |
| Local queue / offline DB | `better-sqlite3` | Synchronous SQLite for activity records and screenshot metadata pending upload |
| Auto-update | `electron-updater` | Polls GitHub Releases for signed update packages; applies on next launch |
| Backend API | Fastify 4 + TypeScript | JWT-authenticated REST API: session ingestion, activity batching, screenshot URL management, admin reports |
| Backend validation | Fastify JSON Schema + `zod` | Route-level schema validation on every request and response |
| Admin dashboard | Next.js 14 (App Router) + TypeScript | Manager-facing web UI: team hours, activity charts, screenshot review |
| Dashboard UI | Tailwind CSS + shadcn/ui | Same component library as desktop; shared design tokens via CSS variables |
| Auth | Backend-issued JWT | Email/password (bcrypt); HS256 JWT signed and verified by Fastify (`jose`) |
| Database | PostgreSQL (Docker) via Prisma | Primary data store; access gated by the backend; desktop/dashboard never connect directly |
| File storage | MinIO (private bucket, S3 API) | Screenshot blobs; no public access; presigned URLs only |
| Shared types | Per-repo `types/` module | TypeScript interfaces for Session, ActivityLog, Screenshot, Profile — defined once per repo and duplicated across repos by hand |
| Data access | Prisma client (backend only) | Typed models + queries in the backend; the single database gateway |
| Local infra | Docker Compose | PostgreSQL + MinIO with persistent volumes, health checks, and bucket init |
| Repo tooling | npm | Plain npm scripts per repo; no monorepo, no Turborepo, no pnpm |
| CI | GitHub Actions | One workflow per repo — `npm ci && npm run lint && typecheck && build` |

---

## System Boundaries

Each of the three repos is independent — it has its own `package.json`,
`package-lock.json`, `tsconfig.json`, ESLint/Prettier config, `.env.example`,
and CI workflow. Shared domain types are duplicated per repo (kept in sync by
hand).

```
desktop/                          # Electron tracker app — own repo
├── electron/
│   ├── main.ts                   # Entry point — wires services, no business logic
│   ├── preload.ts                # contextBridge — whitelist of IPC methods exposed to renderer
│   ├── types/                    # Session, ActivityLog, Screenshot, Profile, IPC bridge types
│   └── services/
│       ├── auth.ts               # Backend login + in-memory JWT (main process only)
│       ├── config.ts             # Backend URL + tracking intervals
│       ├── tracker.ts            # Session start/stop/pause orchestration
│       ├── activity.ts           # uiohook-napi input counting; minute-bucket aggregation; 10s interval sampling for activity level
│       ├── idle.ts               # powerMonitor idle detection and auto-pause logic
│       ├── screenshot.ts         # desktopCapturer + sharp compression + queue write
│       ├── queue.ts              # better-sqlite3 read/write for pending records
│       └── upload.ts             # HTTP upload loop: dequeues records, POSTs to backend, retries
└── src/renderer/                 # React UI (browser context — no Node APIs)
    ├── components/ui/            # shadcn/ui copies — owned code, safe to modify
    ├── pages/                    # Login, Tracker window
    ├── types/                    # Renderer-facing view of the IPC bridge types
    └── lib/                      # Renderer-side utilities; calls preload API only

backend/                          # Fastify API — own repo
├── src/
│   ├── app.ts                    # Fastify instance, plugin/route registration
│   ├── server.ts                 # Entry point — port/env config, graceful shutdown
│   ├── types/                    # Session, ActivityLog, Screenshot, Profile types
│   ├── lib/
│   │   ├── prisma.ts             # Prisma client singleton
│   │   ├── storage.ts            # S3-compatible storage abstraction (MinIO)
│   │   ├── jwt.ts                # HS256 sign/verify helpers
│   │   └── serialize.ts          # Prisma model -> snake_case JSON mappers
│   ├── plugins/
│   │   ├── auth.ts               # JWT verification hook (applied globally)
│   │   ├── prisma.ts             # Fastify plugin: exposes app.prisma
│   │   └── storage.ts            # Fastify plugin: exposes app.storage
│   ├── routes/
│   │   ├── auth.ts               # POST /auth/login, GET /auth/me
│   │   ├── sessions.ts           # POST /sessions/start|stop|pause
│   │   ├── activity.ts           # POST /activity (batched ingestion)
│   │   ├── screenshots.ts        # POST /screenshots/upload-url|register, GET /screenshots/:id/url
│   │   └── reports.ts            # GET /reports/team, GET /reports/employee/:id
│   └── scripts/seed.ts           # Demo team + admin/employee seeding (Prisma + bcrypt)
├── prisma/                       # schema.prisma + migrations
└── docker-compose.yml            # PostgreSQL + MinIO + bucket init

dashboard/                        # Next.js admin UI — own repo
├── app/                          # App Router pages and layouts
│   ├── (auth)/                   # Login page
│   ├── (admin)/                  # Protected routes: overview, employees, sessions, screenshots
│   └── api/                      # Route handlers: login, logout, screenshot URL proxy
├── components/                   # Page-level components; shadcn/ui in components/ui/
├── types/                        # Session, ActivityLog, Screenshot, Profile types
└── lib/
    ├── api.ts                    # Typed fetch wrappers calling the Fastify backend
    ├── auth.ts                   # getMe()/getUser() via backend /auth/me
    ├── profiles.ts               # getProfile()/getRole()/getAccessToken()
    ├── session.ts                # httpOnly session cookie helpers
    ├── jwt.ts                    # verifies backend JWTs (middleware)
    └── middleware.ts             # auth + role redirect logic
```

The `prisma/` directory and `docker-compose.yml` live in the `backend` repo,
since the backend is the sole database gateway and owns the storage credentials,
schema, and migrations.

### Responsibility boundaries at a glance

| Boundary | Rule |
|---|---|
| `desktop/electron/services/*` | All sensitive work: auth, native APIs, network, file I/O. No DOM, no Tailwind. |
| `desktop/electron/preload.ts` | The only bridge between main and renderer. Exposes a typed, minimal API via `contextBridge`. |
| `desktop/src/renderer/*` | Pure React + Tailwind. Calls `window.clocksy.*` (preload API) only. No `require`, no Node globals. |
| `backend/*` | Only place the database and storage credentials are used. Every route is JWT-gated. |
| `dashboard/*` | Cookie-based JWT for Auth; role/profile read via the backend `/auth/me`. All team/reporting data fetched through the Fastify backend, never direct DB calls. |
| `<repo>/types/*` | Types only — no runtime code, no Node imports. Defined once per repo. |
| `backend/src/lib/prisma.ts` | The single Prisma client. All database queries in the backend go through Prisma; desktop/dashboard never connect to the DB. |

---

## Storage Model

### PostgreSQL via Prisma (relational data)

| Model / table | What it stores | Key columns |
|---|---|---|
| `User` / `users` | One row per account (auth + profile) | `id`, `email`, `password_hash`, `display_name`, `avatar_url`, `team_id`, `role` (`employee` \| `admin`) |
| `Team` / `teams` | Organisation teams + capture settings | `id`, `name`, `screenshots_enabled`, `screenshot_min_interval_sec`, `screenshot_max_interval_sec` |
| `Client` / `clients` | Billable clients | `id`, `team_id`, `name` |
| `Project` / `projects` | Projects a session can be tracked against | `id`, `team_id`, `client_id`, `name`, `archived` |
| `ApiKey` / `api_keys` | Team API keys for the public `/v1` API | `id`, `team_id`, `name`, `prefix`, `hashed_key`, `last_used_at`, `revoked_at` |
| `Session` / `sessions` | Each clocked-in work session | `id`, `user_id`, `team_id`, `project_id`, `started_at`, `ended_at`, `paused_seconds`, `status` (`active` \| `paused` \| `ended`) |
| `ActivityLog` / `activity_logs` | One row per minute bucket during a session | `id`, `session_id`, `user_id`, `bucket_start` (timestamp), `keyboard_count`, `mouse_count`, `is_idle` |
| `Screenshot` / `screenshots` | Screenshot metadata (blob is in storage) | `id`, `session_id`, `user_id`, `taken_at`, `storage_path`, `activity_percent` (active ÷ total 10s intervals for the span since the previous screenshot — see Activity Level) |

Foreign keys cascade from `User`/`Session` to their child rows. Access is gated exclusively by the backend — there are no direct client connections to the database.

### MinIO / S3 storage (blobs)

| Bucket | Access | Contents |
|---|---|---|
| `time-tracker` | **Private** | JPEG screenshot files keyed by `{user_id}/{session_id}/{timestamp}.jpg` |

No public bucket policies. Uploads use short-lived presigned PUT URLs and reads use presigned GET URLs, both generated server-side in Fastify (`src/lib/storage.ts`) and returned to authenticated requesters.

### SQLite — `better-sqlite3` (local desktop queue)

| Table | Purpose |
|---|---|
| `pending_activity` | Activity log rows awaiting upload; deleted on confirmed server receipt |
| `pending_screenshots` | Screenshot file path + metadata awaiting upload; deleted on confirmed server receipt |

The SQLite file lives in Electron's `app.getPath('userData')`. It is not synced, not backed up, and is the source of truth only for unconfirmed local data. Once the backend returns a success response, the row is deleted from SQLite.

### What does NOT go in the database

- Raw screenshot image bytes (those go to MinIO object storage)
- Keystroke content or clipboard contents (never collected)
- Period-level activity aggregates computed on the fly (a period's overall activity % is the mean of its screenshots' `activity_percent`, or derived from `activity_logs` when there are no screenshots — not materialised). Each screenshot's own `activity_percent` *is* stored (see Activity Level).

---

## Public Web API (`/v1`)

External tools can read tracked data via a team-scoped API key instead of a user
JWT. Keys are created by admins (`POST /api-keys`); the plaintext key
(`clk_<48 hex>`) is shown once and only its bcrypt hash + an 8-char lookup
`prefix` are stored. Requests present the key as `Authorization: Bearer <key>` or
an `x-api-key` header. The `/v1` prefix is excluded from the user-JWT hook and
authenticated by its own hook in `routes/public.ts`, which resolves the key to a
`team_id` and scopes every query to it.

| Endpoint | Returns |
|---|---|
| `GET /v1/time-entries?from&to&project_id` | Sessions for the team with tracked seconds, user, and project/client |
| `GET /v1/projects` | The team's projects |

## Self-service data deletion (ethical monitoring)

Employees own their data and can remove it through the dashboard, backed by
owner-only endpoints: `DELETE /screenshots/:id`, `DELETE /sessions/:id` (cascades
activity + screenshots), and `DELETE /me/data` (erases all of the caller's
sessions). Screenshot blobs are removed from storage before the metadata rows.
Admins cannot delete another employee's data through these routes.

## Auth and Access Model

### Authentication

Authentication is owned by the backend. Users sign in with email/password; the backend verifies the bcrypt hash and issues an HS256 JWT (`sub`, `email`, `role`, `team_id`). The same `JWT_SECRET` is shared with the dashboard (server-side only) so middleware can verify tokens.

| App | How auth is used |
|---|---|
| Desktop | Auth is handled entirely in the main process. The renderer calls `window.clocksy.login()` via the preload bridge; the main process calls `POST /auth/login` and holds the JWT in memory. The renderer never sees the token. |
| Backend | Every incoming request (except `/health` and `/auth/login`) must include a `Bearer` token. The `auth` Fastify plugin verifies its signature/expiry on every request and populates `request.user`. No route trusts a `user_id` from the request body for ownership checks. |
| Dashboard | Login posts to a Next.js route handler that stores the backend JWT in an httpOnly cookie. Middleware verifies the cookie JWT for auth/role redirects; server components read the caller's profile via the backend `/auth/me`. All team reports and screenshot data go through the Fastify backend — never direct DB access. |

### Roles

| Role | Who | Access |
|---|---|---|
| `employee` | Any logged-in team member | Can read and write their own sessions, activity logs, and screenshots only |
| `admin` | Designated team managers | Can read sessions, activity logs, and screenshots for all members of their team; cannot modify other employees' records |

Role is stored in `users.role`. Authorization is enforced in the backend route handlers (ownership via `request.user.sub`, team-admin via a `teamId` + `role` check) — never trusting anything passed in the request.

### Authorization pattern (applied in every route)

```ts
// Employee can access their own rows
const owned = session.userId === request.user.sub

// Admin can access rows belonging to members of their team
const isTeamAdmin =
  requester.role === 'admin' &&
  requester.teamId != null &&
  requester.teamId === owner.teamId

if (!owned && !isTeamAdmin) return reply.code(403).send({ error: 'Forbidden' })
```

The backend is the only component with database credentials, so employees cannot write records as other users. Clients only ever hold a JWT.

---

## Activity Level

Activity level uses a fixed-interval sampling method (the same approach as
commercial trackers such as scrin.io). It measures *whether* input happened, not
*what* was typed — only the presence of a keystroke or mouse movement is
recorded, never key content (no keylogging).

### How it is measured

Every **10 seconds** the desktop main process samples the OS-level idle time
(`powerMonitor.getSystemIdleTime()`). Each 10-second window is one **interval**,
classified as:

- **active** — some input occurred during the window (idle time `< 10s`), or
- **inactive** — no input during the window.

Using the OS idle API (rather than raw `uiohook` counts) means activity level
keeps working even when the native input hook is unavailable (e.g. on some Linux
display-server setups).

### The formula

When a screenshot is captured, its `activity_percent` is the share of active
intervals over the span since the previous screenshot:

```
Activity Level (%) = (Active Intervals / Total Intervals) × 100
```

**Example:** with a 10-minute screenshot interval, one span is
`600s ÷ 10s = 60 intervals`. If 42 of them had input:

```
42 / 60 = 0.70 → 70%
```

A period's overall activity level (shown on the dashboard) is the mean of that
period's screenshot `activity_percent` values; when no screenshots exist it falls
back to the minute-bucket `activity_logs`.

### Rules and edge cases

- **Paused / idle time is excluded** from the interval counts, so an explicit
  pause (or the auto-pause below) does not artificially lower the score.
- **Auto-pause:** after the idle threshold (default **5 min**) of no input, the
  session auto-pauses (see Background Tasks — Idle detection).
- **Stuck at 100%:** a reading pinned at a constant 100% usually indicates a
  hardware/software fault (e.g. a faulty mouse emitting continuous events) rather
  than genuine nonstop activity, and should be treated as suspect.

---

## Background Tasks

There are no AI models or ML components in this system. Background tasks are confined to the desktop main process:

| Task | Mechanism | Frequency |
|---|---|---|
| Activity aggregation | `uiohook-napi` event listeners increment in-memory counters; a `setInterval` flushes the current minute bucket to SQLite every 60 seconds | Every 60 seconds during an active session |
| Activity-level sampling | `setInterval` reads `powerMonitor.getSystemIdleTime()` and marks the 10s window active/inactive; consumed per screenshot to compute `activity_percent` (see Activity Level) | Every 10 seconds during an active session |
| Screenshot capture | `setInterval` triggers `desktopCapturer.getSources()`, then `sharp` compression, then a SQLite queue write | Every 15 minutes during an active session |
| Upload queue drain | An async loop in `upload.ts` polls the SQLite queue and POSTs to the Fastify backend; uses exponential backoff on failure | Continuous during active session; triggers on reconnect when offline |
| Idle detection | `setInterval` calls `powerMonitor.getSystemIdleTime()` and emits a pause/resume event when the idle threshold is crossed | Every 30 seconds during an active session |
| Auto-update check | `electron-updater` checks GitHub Releases on app startup and on a configurable interval | On startup; every 4 hours |

All intervals are started only after a session is explicitly started and stopped when the session ends or the app quits. There is no background tracking without an active session.

---

## Invariants

These rules must never be violated anywhere in the codebase. A PR that breaks any of them should not be merged.

### 1. The renderer process never touches sensitive APIs

The Electron renderer runs in a sandboxed browser context. It must never import or call:
- Any network/auth client (login goes through the preload bridge to the main process)
- `uiohook-napi`, `desktopCapturer`, `sharp`, `better-sqlite3`
- Node built-ins: `fs`, `net`, `child_process`, `path`, `os`

All of the above live exclusively in `electron/main.ts` or `electron/services/*`. The renderer communicates with the main process only through `window.clocksy.*` (the `contextBridge` preload API). Any new capability the renderer needs must be exposed as a new, explicitly typed preload method — not by relaxing the sandbox.

### 2. Database and storage credentials never leave the backend

`DATABASE_URL` and the `S3_*` storage credentials must appear in exactly one place: the `backend` repo's `.env` (and its corresponding secret store in deployment). They must never be:
- Imported in the `desktop` or `dashboard` repo
- Committed to source control in any `.env` file
- Passed to the frontend as an environment variable (e.g., `NEXT_PUBLIC_*`)

The `desktop` repo holds only the backend URL. The `dashboard` repo holds the backend URL plus the shared `JWT_SECRET` (server-side only, never `NEXT_PUBLIC_*`). Clients receive short-lived presigned URLs for storage, never credentials.

### 3. User identity is always taken from the verified JWT, never from request data

No Fastify route may use a `user_id`, `team_id`, or any identity claim sourced from the request body, query parameters, or headers other than the verified `Authorization: Bearer` token. `request.user.sub` (from the JWT payload) is the only valid source of identity. This applies to both ownership checks and audit fields written to the database.

### 4. All screenshot access goes through Fastify; no direct storage URLs are served to clients

A screenshot URL returned to the dashboard or desktop renderer must always be a short-lived MinIO presigned URL generated by Fastify (`GET /screenshots/:id/url`). Fastify must verify, before generating the URL, that the requesting user is either the owning employee or an admin of that employee's team. The bucket must deny all public reads. No code path may return a permanent or public URL for a screenshot.

### 5. Tracking runs only within an explicit session boundary

`uiohook-napi` listeners, screenshot intervals, idle polling, and upload queue draining must be started only in response to a confirmed session start event and stopped (and any pending data flushed) in response to a session stop or app quit. No activity data — keyboard counts, mouse counts, screenshots — may be collected or queued outside of this boundary. The main process must enforce this gate; the renderer's Start/Stop button is the trigger, but the main process owns the state.

### 6. Every new table ships with its authorization checks in the accessing routes

A schema change that adds a new table or column is not complete until the routes that read or write it enforce ownership/role checks against `request.user`. Since access is gated at the application layer (there is no database-level RLS), a new endpoint must:
- Derive identity only from `request.user.sub`
- Restrict rows to the caller (employee) or the caller's team (admin)
- Return `403` for any cross-user access

### 7. Shared types are defined once and imported everywhere

Within a single repo, `Session`, `ActivityLog`, `Screenshot`, and `Profile` are defined exactly once (under that repo's `types/` module) and imported everywhere else in the repo — never redefined per file. Across the three repos these shapes are duplicated intentionally, since the repos are independent; when the Prisma schema changes, update each repo's copy by hand. In the backend, all database access goes through Prisma (`src/lib/prisma.ts`); the desktop and dashboard reach data only through the backend API.

### 8. No data is written to the database with the client's timestamp as the billing source of truth

`activity_logs.bucket_start` and `sessions.started_at` / `sessions.ended_at` use the client-supplied timestamp for display and reference, but the backend sets a `received_at` column (server `NOW()`) on every insert. Any billing or hour-calculation logic must be based on `received_at` and server-reconciled durations, not the client-supplied timestamps alone. The client timestamp is stored as `client_at` for debugging but is never the authoritative value for billed time.
