# Clocksy Backend

The Clocksy API — Fastify + TypeScript. Issues and verifies JWTs, ingests
sessions and activity, registers screenshot metadata, serves presigned storage
URLs, and exposes admin reports. Data lives in PostgreSQL (via Prisma) and
screenshots in MinIO (S3-compatible).

## Requirements

- Node.js 24.x, npm 11.x
- Docker + Docker Compose (PostgreSQL + MinIO)

## Getting started

```bash
npm install
cp .env.example .env
# Fill in JWT_SECRET and the S3_* / POSTGRES_* / MINIO_* values.

# 1) Start PostgreSQL + MinIO (creates the `time-tracker` bucket)
docker compose up -d

# 2) Apply the database schema
npx prisma migrate deploy   # or: npm run db:migrate:dev  (local dev)

# 3) Seed demo users
npm run db:seed
```

| Email | Password | Role |
|---|---|---|
| `admin@clocksy.test` | `ClocksyTest123!` | admin |
| `alice@clocksy.test` | `ClocksyTest123!` | employee |
| `bob@clocksy.test` | `ClocksyTest123!` | employee |

Start the API:

```bash
npm run dev            # http://localhost:3001
curl http://localhost:3001/health
```

MinIO console is available at http://localhost:9001 (credentials =
`MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`).

## Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | no | Liveness |
| POST | `/auth/login` | no | Email + password -> JWT |
| GET | `/auth/me` | yes | Current profile |
| POST | `/sessions/start` | yes | Start (or resume) session |
| POST | `/sessions/pause` | yes | Pause session |
| POST | `/sessions/stop` | yes | End session |
| POST | `/activity` | yes | Batch activity minute-buckets |
| POST | `/screenshots/upload-url` | yes | Presigned PUT URL for an upload |
| POST | `/screenshots/register` | yes | Save metadata after upload |
| GET | `/screenshots/:id/url` | yes | Short-lived presigned download URL |
| GET | `/reports/team` | admin | Team sessions + members |
| GET | `/reports/employee/:id` | self/admin | Employee detail |

Identity always comes from the verified JWT (`request.user.sub`), never from the body.

## Stack

- **Prisma** — schema in [`prisma/schema.prisma`](./prisma/schema.prisma); the
  Prisma client is decorated onto Fastify as `app.prisma`.
- **Storage** — S3-compatible abstraction in
  [`src/lib/storage.ts`](./src/lib/storage.ts) (`upload` / `delete` / `getUrl` /
  `getUploadUrl`), decorated as `app.storage`. The rest of the app never touches
  the AWS SDK directly.
- **Auth** — bcrypt password hashing + HS256 JWTs (`src/lib/jwt.ts`), verified
  in [`src/plugins/auth.ts`](./src/plugins/auth.ts).
