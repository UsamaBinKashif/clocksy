# Clocksy Dashboard

The Clocksy admin dashboard — Next.js (App Router) + TypeScript + Tailwind CSS.
Managers review team hours, activity levels, session timelines, and screenshots.

This is a standalone repository. It installs, builds, and deploys (to Vercel)
independently of the `desktop` and `backend` repos.

## Requirements

- Node.js 24.x, npm 11.x

## Getting started

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_BACKEND_URL + JWT_SECRET
npm run dev                  # http://localhost:3000
```

`JWT_SECRET` must match the backend's so middleware can verify session tokens.

## Project layout

```
app/                 # App Router pages and layouts
  layout.tsx         # root layout + global styles
  page.tsx           # redirects to /admin or /me by role
  (auth)/login/      # email/password sign-in
  (admin)/admin/     # admin-only: overview, employees
  (employee)/me/     # employee home
  api/               # route handlers: login, logout, screenshots proxy
  globals.css        # Tailwind + design tokens
components/
  sign-out-button.tsx
lib/
  api.ts             # typed fetch wrapper for the backend (attaches JWT)
  auth.ts            # getMe() / getUser() — server-side session helpers
  profiles.ts        # getProfile() / getRole() / getAccessToken() for RBAC
  session.ts         # httpOnly session cookie helpers
  jwt.ts             # verifies backend JWTs (middleware + server)
  middleware.ts      # auth + role redirect logic
types/               # domain types (Session, ActivityLog, Screenshot, ...)
middleware.ts        # entry that runs the auth/role redirects
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Lint via `next lint` |

## Security

- Auth is a backend-issued JWT stored in an httpOnly cookie; the browser never
  handles the raw token.
- All protected data is fetched through the Fastify backend (`lib/api.ts`), never
  by querying the database directly.
