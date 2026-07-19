# Clocksy Desktop

The Clocksy employee time-tracker desktop app — Electron + React + TypeScript,
bundled with [electron-vite](https://electron-vite.org). Styling is Tailwind CSS
+ shadcn/ui in the renderer only.

This is a standalone repository. It installs, builds, and ships independently of
the `backend` and `dashboard` repos.

## Requirements

- Node.js 24.x, npm 11.x
- Platform C++ build tools (for the native tracking modules added later —
  `uiohook-napi`, `better-sqlite3`, `sharp`)

## Getting started

```bash
npm install
cp .env.example .env   # set BACKEND_URL (and optional SCREENSHOT_INTERVAL_MS)
npm run dev            # launches the Electron window with renderer HMR
```

### Linux sandbox error

If Electron aborts with `chrome-sandbox is owned by root and has mode 4755`, the
dev scripts already pass `--no-sandbox`. Prefer that for local development.

Optional system fix (requires sudo):

```bash
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

## Project layout

```
electron/
  main.ts            # wires IPC + window lifecycle (no business logic)
  preload.ts         # contextBridge — window.clocksy
  types/ipc.ts       # IPC channels + bridge types
  services/          # auth, tracker, activity, idle, screenshot, queue, upload
src/renderer/
  pages/             # Login, Tracker
  components/ui/
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the app with renderer hot-reload |
| `npm run build` | Production build (`out/`) |
| `npm start` | Preview the production build |
| `npm run typecheck` | Type-check main, preload, and renderer |
| `npm run lint` | Lint the project |

## Boundaries

- Sensitive work (auth, native APIs, file I/O, network) lives in `electron/` —
  never in the renderer.
- The renderer calls `window.clocksy.*` only; it never imports Node built-ins or
  native modules.
- The desktop app talks only to the Fastify backend; it never holds storage
  credentials (uploads use short-lived presigned URLs).

## Tracking notes

- Activity counts use `uiohook-napi` when it builds. On Linux that needs
  `libxt-dev libxtst-dev libx11-dev`. Without it, sessions still run (idle
  detect + screenshots); keyboard/mouse counts stay at 0.
- Screenshots: every 15 minutes (override with `SCREENSHOT_INTERVAL_MS` in `.env`).
  Captures write to a local queue, then upload to object storage via a
  backend-issued presigned URL, keyed `{user_id}/{session_id}/{filename}.jpg`.
- Local queue: SQLite under Electron `userData`. Activity retries against the
  backend when `/activity` is available; screenshots upload via presigned URLs.
- Session start/pause/stop try the backend first; if offline they continue with
  a local session id so tracking is never blocked.
