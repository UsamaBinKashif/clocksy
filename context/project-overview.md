# Clocksy — Project Overview

## Overview

Clocksy is an internal employee time-tracking system modelled after Upwork Desktop Tracker and Hubstaff. It consists of three interconnected products: a lightweight Electron desktop app that employees run while working (capturing session time, mouse/keyboard activity counts, and periodic screenshots), a Fastify API that validates all data submissions and manages access-controlled storage, and a Next.js admin dashboard where managers review team hours, activity levels, and screenshots. All user data is stored in a self-hosted stack — PostgreSQL (accessed via Prisma) for relational data and MinIO (S3-compatible) for screenshot blobs — with authentication and authorization enforced by the Fastify backend so employees can only see their own records and admins can only see records belonging to their team.

---

## Goals

1. Give employees a simple, non-intrusive way to clock in and out of work sessions from their desktop.
2. Automatically capture evidence of activity (aggregate input counts + periodic screenshots) during clocked-in sessions without recording keystrokes or clipboard content.
3. Give managers a clear, scannable dashboard of team hours, activity rates, and screenshots for any given day or date range.
4. Guarantee that tracked time is never silently lost due to a dropped network connection — the desktop app queues data locally and uploads on reconnect.
5. Keep the security model strict: no public screenshot URLs, no storage credentials in client apps, no tracking outside an active session.
6. Support independent deployment of each component: dashboard to Vercel, backend to Railway/Render, desktop app distributed via signed GitHub Releases with auto-update.

---

## Core User Flow (End-to-End)

1. **Employee installs the desktop app** — downloads the signed installer from GitHub Releases; auto-update is configured from first launch.
2. **Employee logs in** — authenticates via the backend (email/password); the backend issues a JWT. The main process holds the token; the renderer never touches it directly.
3. **Employee starts a session** — clicks "Start" in the tracker window. The main process records a session start via the backend (PostgreSQL) and begins tracking.
4. **Activity is captured in the background**:
   - `uiohook-napi` counts mouse movements/clicks and key presses per minute bucket — counts only, no content captured.
   - `powerMonitor.getSystemIdleTime()` detects idle periods and pauses billing for idle time over the threshold.
   - `desktopCapturer` takes a screenshot every 15 minutes, compresses it with `sharp`, and stores it locally via `better-sqlite3` queue before uploading to the private MinIO bucket via a backend-issued presigned URL.
   - Activity records and screenshot metadata are written to SQLite first, then synced to the backend. If the network is down, the queue retries on reconnect.
5. **Employee pauses or stops the session** — the main process records the session end/pause, flushes any remaining queued data, and updates the session record.
6. **Manager opens the admin dashboard** — logs in with the same credentials. The dashboard fetches team session and activity data from the Fastify backend, which verifies the manager's JWT and confirms they are an admin of that team before returning any data.
7. **Manager reviews activity** — views daily/weekly hours per employee, activity percentage bars (derived from input counts), and thumbnail screenshots. Screenshot thumbnails are served as short-lived signed URLs generated server-side by Fastify — never as public links.
8. **Manager audits a specific session** — clicks into a session to see a timeline of activity, idle gaps, and screenshots with timestamps.

---

## Features

### Desktop App (`desktop`)

| Feature | Detail |
|---|---|
| Login / logout | Backend JWT auth via main process; token stored in memory, not in renderer |
| Session start / stop / pause | Single-button UI; elapsed timer display; today's total hours |
| Activity tracking | Keyboard + mouse counts per 60-second bucket; no keystroke content |
| Idle detection | Auto-pause after configurable idle threshold using `powerMonitor` |
| Screenshot capture | Every 15 minutes during active session; compressed via `sharp`; queued locally |
| Offline queue | `better-sqlite3` local queue; retry upload on reconnect; no data loss on disconnect |
| Auto-update | `electron-updater` polling GitHub Releases for signed update packages |
| System tray | App minimises to tray; session status visible from tray icon |

### Backend API (`backend`)

| Feature | Detail |
|---|---|
| JWT verification | Every route validates the backend-issued JWT; user identity is always taken from the token, never from the request body |
| Session endpoints | `POST /sessions/start`, `POST /sessions/stop`, `POST /sessions/pause` |
| Activity log ingestion | `POST /activity` — accepts batched minute-bucket records from the desktop queue |
| Screenshot upload handoff | `POST /screenshots/upload-url` — returns a short-lived signed upload URL; backend records metadata after confirmation |
| Signed screenshot retrieval | `GET /screenshots/:id/url` — returns a short-lived signed download URL; only accessible to the owning employee or their team admin |
| Admin report endpoints | `GET /reports/team`, `GET /reports/employee/:id` — gated by admin role check |
| Request/response validation | Fastify JSON schema on every route |

### Admin Dashboard (`dashboard`)

| Feature | Detail |
|---|---|
| Team overview | Card tiles: total hours today, active members, average activity %, idle time |
| Employee list | Table with avatar, name, hours today, activity %, status pill (Active / Idle / Offline) |
| Session timeline | Per-employee daily timeline showing active, idle, and paused segments |
| Screenshot gallery | Paginated thumbnail grid per session; click to view full image via signed URL |
| Date range filter | Filter all views by day, week, or custom range |
| Activity chart | Hourly bar chart — productive vs idle breakdown per day |

### Shared Infrastructure

| Feature | Detail |
|---|---|
| Auth | Backend-issued JWT — email/password (bcrypt password hashes) |
| Database | PostgreSQL via Prisma; access gated by the backend |
| Storage | Private MinIO bucket (S3 API); no public object access |
| Shared types | Per-repo `types/` module — Session, ActivityLog, Screenshot, Profile shapes; duplicated across the three repos and kept in sync by hand |
| Data access | Prisma client in the backend (typed query helpers); desktop and dashboard go through the API |

---

## In Scope

- Electron desktop tracker app (Windows, macOS, Linux) with session management, activity capture, screenshot queue, and offline resilience.
- Fastify backend with JWT-authenticated endpoints for session ingestion, activity log batching, screenshot handling, and admin reporting.
- Next.js admin dashboard for managers: team hours, activity, session timelines, screenshot review.
- Prisma schema (PostgreSQL tables) for: `users`, `teams`, `sessions`, `activity_logs`, `screenshots`.
- Three independent npm repositories (`desktop`, `backend`, `dashboard`), each with its own `tsconfig`, ESLint/Prettier config, and lockfile.
- CI pipeline (GitHub Actions) with path-based filters so only the affected app builds on each PR.
- Signed installer distribution via GitHub Releases with auto-update support.

---

## Out of Scope

- **Raw keystroke or clipboard capture** — only aggregate counts are stored; no content, ever.
- **Webcam or microphone access** — not tracked, not stored.
- **Background tracking outside an active session** — the tracker is fully off when the employee has not clicked Start.
- **Multi-tenant SaaS features** — no self-service signup, billing, or plan management; this is an internal tool for a single organisation.
- **Public-facing reporting** — no shareable report links; all data access requires authentication.
- **Mobile app** — desktop only.
- **Browser extension** — not in scope; tracking is desktop-process-level only.
- **Manual time entry or time editing** — employees cannot retroactively add or modify tracked time.
- **Integrations** (Jira, Slack, Asana, etc.) — not in this version.
- **External identity providers** (Google/SSO) — email/password only in this version.

---

## Success Criteria

| Criterion | Definition of Done |
|---|---|
| Session tracking works end-to-end | Employee can start, pause, and stop a session; session record appears in PostgreSQL with correct start/end timestamps and duration |
| Activity data reaches the backend | Minute-bucket activity records (keyboard_count, mouse_count, idle flag) appear in `activity_logs` for every minute of an active session |
| Screenshots are captured and secured | A screenshot is taken every 15 minutes, uploaded to the private MinIO bucket, and retrievable only via a Fastify-generated presigned URL — never via a public link |
| Offline queue recovers correctly | Killing the network during a session and restoring it causes all queued records and screenshots to upload without duplicates or data loss |
| Admin dashboard reflects real data | Manager can view today's hours, activity %, and screenshots for all team members; data matches what is in the database |
| Authorization is enforced | An employee's JWT cannot fetch another employee's session, activity, or screenshot data — the backend rejects cross-user access with `403` |
| No secrets in client code | A full grep of the `desktop` and `dashboard` repos contains no storage credentials and no hardcoded secrets |
| All apps build and type-check cleanly | `npm run build` and `npm run typecheck` pass with zero errors in each of the three repos |
| Auto-update delivers a new version | Incrementing the version and publishing a GitHub Release causes a running desktop app to detect and apply the update on next launch |
