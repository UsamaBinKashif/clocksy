# Progress Tracker

Update this file after every meaningful implementation change.

---

## Current Phase

Migrated to the self-hosted stack: Prisma + PostgreSQL + MinIO, backend-issued JWT auth. Core E2E loop is coded.

## Current Goal

Run all three apps against the Docker stack (`docker compose up -d`, `prisma migrate`, `db:seed`).

---

## Completed

| Layer | Done |
|---|---|
| **Desktop** | Login (backend JWT), start/pause/resume/stop, activity queue, idle sync to API, screenshots → presigned PUT to MinIO + `/screenshots/register` |
| **Backend** | JWT auth (bcrypt + jose), Prisma data access, sessions, activity, screenshot upload-url/register + presigned URL, team/employee reports |
| **Dashboard** | Cookie-based JWT auth + RBAC; **live** admin overview, employees table, employee detail + screenshot thumbs; employee `/me` with sessions/screenshots |
| **Schema** | Prisma schema + initial migration (`users`, `teams`, `sessions`, `activity_logs`, `screenshots`); MinIO `time-tracker` bucket |
| **Infra** | `backend/docker-compose.yml` — PostgreSQL + MinIO + bucket init |

## Still to do (not in this cut)

- Tray, auto-update, SSO/OAuth, electron installer
- Rich activity timeline / charts
- Date-range filters UI
- Team invite / admin provisioning UI (still seed/DB)
- `uiohook` build on Linux (needs X11 deps)
- Persisted desktop session across restarts

## Setup steps

1. `backend/.env` → set `JWT_SECRET`, `S3_*`, `POSTGRES_*`, `MINIO_*` (dashboard `JWT_SECRET` must match)
2. `cd backend && docker compose up -d && npx prisma migrate deploy && npm run db:seed`
3. Seed already assigns admin + `team_id`; `/reports/team` works out of the box

## How to run the full loop

```bash
# start infra once
cd backend && docker compose up -d

# terminal 1
cd backend && npm run dev

# terminal 2
cd dashboard && npm run dev

# terminal 3
cd desktop && npm run dev
```

Desktop Start → backend session → activity/screenshots upload → Dashboard Overview / Employees / Me.
