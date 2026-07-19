# Clocksy — AI Agent Workflow Rules

These are rules, not suggestions. Follow them on every task without exception.

---

## 1. Overall Approach

**Work spec-first, code second.**

Before writing any code for a new unit of work, state:
1. What you are building (one sentence).
2. Which files you will create or modify (exact paths).
3. What you will explicitly not touch.

Do not proceed until that scope is confirmed. If the user did not ask for a plan, produce a brief one anyway as the first output of each task — it costs one message and prevents wasted implementation.

**Build incrementally. Never scaffold more than the current unit.**

A "unit" is the smallest independently verifiable piece of work: one service file, one route, one component, one migration. Do not anticipate future units and add stubs, placeholder functions, or TODO comments for them. Future units are scoped when they are reached.

---

## 2. Scoping Rules

- Implement exactly what was asked. No more, no less.
- Do not refactor code that is outside the scope of the current task, even if you see a clear improvement. Note it as a separate follow-up instead.
- Do not rename files, variables, or functions unless the task explicitly requires it.
- Do not reformat code outside the lines you are changing. Preserve surrounding whitespace, import ordering, and comment style.
- Do not add dependencies unless they are already listed in `time-tracker.mdc` → "Preferred libraries" or explicitly requested by the user. If a new dependency is genuinely required, call it out and wait for confirmation before adding it.
- Do not create new files if an existing file can be extended to do the job cleanly.

---

## 3. Process Boundaries (Desktop App)

Every piece of code you write for the `desktop` repo must be placed in the correct process. Apply this check before writing a single line:

| Code touches... | It belongs in... |
|---|---|
| `uiohook-napi`, `desktopCapturer`, `sharp`, `better-sqlite3`, `fs`, `net`, `powerMonitor`, auth/network clients | `electron/services/*` (main process) |
| IPC channel definitions and `contextBridge` exposure | `electron/preload.ts` |
| React components, UI state, Tailwind, shadcn | `src/renderer/*` |
| Types shared between preload and renderer | The desktop repo's `electron/types/` module (e.g. `electron/types/ipc.ts`) |

If you are unsure which process a piece of logic belongs to, ask before writing it. Default to the main process for anything that is not purely UI.

Never import a main-process module from a renderer file. Never import a renderer-only module (React, Tailwind, DOM APIs) from a main-process file.

---

## 4. Security Rules (Non-Negotiable)

Violating any of these is a blocking error. Do not submit code that breaks them.

- **Never** place database (`DATABASE_URL`) or storage (`S3_*`) credentials anywhere outside the `backend` repo. Do not reference them in the `desktop` or `dashboard` repo under any circumstance.
- **Never** generate a presigned screenshot URL in a client (renderer or dashboard page). Presigned URL generation always happens in `backend/src/routes/screenshots.ts`.
- **Never** read `user_id` from a request body, query param, or path param as the basis for ownership checks in Fastify routes. Always use `request.user.sub` from the verified JWT.
- **Never** start `uiohook-napi` listeners, screenshot intervals, idle polling, or the upload queue outside of an active session boundary. These must be gated by the session start event in `electron/services/tracker.ts`.
- **Never** log or transmit keystroke content, clipboard content, or window titles. Only aggregate counts (`keyboard_count`, `mouse_count`) per minute bucket are permitted.

---

## 5. Splitting Work into Smaller Steps

Split a task into multiple steps when any of the following is true:

- The task touches more than two files simultaneously.
- The task requires both a database migration and application code.
- The task crosses a process boundary (e.g., main process + preload + renderer all need changes).
- The task involves a new Fastify route that also requires a new Prisma model/migration.
- The task changes a domain type or a Prisma query helper whose shape must be mirrored across more than one repo.

When splitting, complete and verify each step before starting the next. State the full split plan upfront so the user can review it.

**Example split for "add screenshot capture":**
1. Add `pending_screenshots` table to the SQLite schema in `queue.ts`
2. Implement `screenshot.ts` service (capture → compress → queue write)
3. Add IPC channel + preload exposure
4. Wire interval start/stop into `tracker.ts`
5. Add `POST /screenshots/upload-url` and `POST /screenshots/register` routes to the backend
6. Implement the upload path in `upload.ts`

Do not combine steps 1–6 into a single output.

---

## 6. Handling Missing or Ambiguous Requirements

When a requirement is missing or ambiguous:

- **Stop. Ask one specific question.** Do not make an assumption and proceed. Do not ask multiple questions at once — identify the most blocking ambiguity and ask that one.
- State what you would assume if the user wants you to proceed without answering (so they can approve the assumption explicitly).
- Do not invent UX behaviour, data shapes, or access rules that are not specified. These decisions have downstream consequences.

**Common ambiguities that always require a question, not an assumption:**
- Which Electron process a new capability belongs to, if not obvious
- Whether a new Fastify route requires admin-only access or is accessible to all authenticated users
- The exact idle threshold (seconds) before auto-pause triggers
- Whether a new table's records are team-scoped or user-scoped
- Whether a UI component belongs in the `desktop` or `dashboard` repo

---

## 7. Files That Must Not Be Modified Without Explicit Instruction

Do not touch the following files or directories unless the user explicitly names them as part of the task:

| File / Directory | Reason |
|---|---|
| `desktop/src/renderer/components/ui/*` | shadcn/ui copied components — treated as owned but only modified intentionally |
| `backend/node_modules/.prisma/*`, generated Prisma client | Auto-generated by `prisma generate` — never hand-edit |
| `<repo>/package-lock.json` | Updated automatically by npm — never hand-edit |
| `<repo>/tsconfig.json` (base compiler options) | The strict TypeScript baseline for a repo; only change when explicitly instructed |
| `desktop/electron/preload.ts` | The security boundary between main and renderer; only extend it when a new IPC channel is explicitly scoped |
| Any `.env` file | Never write, read, or suggest values for `.env` files; reference `.env.example` only |
| Any migration file that has already been applied | Migrations are append-only; never modify an existing migration file |

---

## 8. Keeping Documentation in Sync

When you make a change that affects documented behaviour, update the documentation in the same output — not as a follow-up.

| If you change... | Also update... |
|---|---|
| A Fastify route path or request/response shape | `architecture.md` → Backend API section |
| The Prisma schema (new model, new column) | `architecture.md` → Storage Model section |
| The IPC channel API (preload methods) | The relevant section in `architecture.md` and the IPC type definitions in `desktop/electron/types/` |
| In-scope or out-of-scope decisions | `project-overview.md` → In Scope / Out of Scope |
| An invariant (adding, removing, or weakening one) | `architecture.md` → Invariants section |
| A technology choice | `architecture.md` → Stack table |

If updating the documentation would make your output too long, complete the code change first, then produce the documentation update as a second message. Say that explicitly so the user knows it is coming.

---

## 9. Code Conventions Checklist

Apply every item on this list before finalising any code output:

- [ ] TypeScript `strict: true` — no implicit `any`, no non-null assertions without a justifying comment
- [ ] No `any` type without an inline `// justified: <reason>` comment
- [ ] All new IPC channel names are defined in a central const/enum, not as inline strings
- [ ] All new Fastify routes have a Fastify JSON schema for both request and response
- [ ] All new backend database access goes through the Prisma client (`app.prisma`); storage access goes through `app.storage` — not scattered ad hoc
- [ ] All new `electron/services/*` files export a single, focused service — no mixed responsibilities
- [ ] Domain types (`Session`, `ActivityLog`, `Screenshot`, `Profile`) are imported from the repo's `types/` module, not redefined per file
- [ ] No hardcoded strings for paths, bucket names, or table names — use named constants
- [ ] No `console.log` left in production paths — use a structured logger or remove entirely
- [ ] Tailwind and DOM references appear only in `src/renderer/*` — never in `electron/*`

---

## 10. Verification Checklist Before Moving to the Next Unit

Do not declare a unit complete and move on until every item below is true:

- [ ] The implementation matches the stated scope exactly — no extra files created, no unasked-for features added
- [ ] The code compiles without TypeScript errors (`tsc --noEmit` passes for the affected app)
- [ ] All security rules in Section 4 are satisfied by the new code
- [ ] If a new Prisma model was created, a migration was generated and the accessing routes enforce ownership/role checks
- [ ] If a new Fastify route was added, it has JWT verification (via the global auth plugin) and an ownership check where applicable
- [ ] If a new IPC channel was added to the preload, it is typed in `shared-types` or a local IPC types file — no untyped channel strings
- [ ] If the SQLite queue was modified, the pending table has a confirmed-delete path so records do not accumulate indefinitely
- [ ] Documentation has been updated (or a follow-up update is explicitly queued)
- [ ] No files outside the declared scope were modified
- [ ] The change does not introduce a new runtime dependency that was not pre-approved
