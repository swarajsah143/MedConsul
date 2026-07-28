# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

MedCounsel AI — a NEET-UG medical counselling assistant. Students analyze closing ranks, compare
college fees, browse college reviews, predict their rank/college shortlist, track a document
checklist, and chat with a RAG assistant. Admins manage all domain data through a generic panel.

It is a three-part repo: a React client, an Express/Mongo server, and a `data/` Python pipeline that
scrapes and stages real counselling data. `scripts/` holds ops (deploy, backup, import, migrations).

## Commands

Run from the repo root unless noted. **Node 18+ (20+ recommended).**

```bash
npm run dev            # client (5173) + server concurrently
npm run dev:server     # server only (tsx watch)
npm run dev:client     # client only (vite)
npm run seed           # seed demo admin + student accounts (needs SEED_ADMIN_PASSWORD in .env)
npm test               # client vitest + full server test suite
```

- **Server build:** `cd server && npm run build` (tsc → `dist/`); start prod with `npm start`.
- **Client build:** `cd client && npm run build` (tsc -b + vite → `dist/`).
- **Client lint:** `cd client && npm run lint` (oxlint). There is no server lint.
- **Client tests:** `cd client && npm test` (vitest, jsdom). Watch: `npm run test:watch`. A single
  file: `npx vitest run src/test/csv.test.tsx`.
- **Server tests are integration tests, not unit tests.** `server/src/test/*` are standalone `tsx`
  scripts that make **real HTTP calls to a running server** (`http://localhost:5050`, override with
  `API_URL`) against a real Mongo with a seeded admin — so `npm run dev` must be up and
  `npm run seed` must have run, or they fail on connect/login. There is no framework: each prints
  `✓`/`✗` per assertion and exits non-zero. Run them one at a time by script name —
  `test:integrity`, `test:documents`, `test:admin-users`, `test:students`, `test:profile`.
  `test:admin-users` and the client's `admin-ui.test.tsx` write to that real Mongo and are not safe
  in parallel; `admin-ui.test.tsx` also drives the real UI against the live server.
- **`server/src/test/predictor.test.ts` is the exception** — pure, no server or DB needed, and
  deliberately **not** in the default `test` script. Run it directly:
  `npx tsx server/src/test/predictor.test.ts`.

### Ops scripts

```bash
npm run open                   # open the app in Playwright Chromium, already signed in as admin
npm run open -- prod student   # ...against production, as the demo student
npm run pull:prod              # one-way mirror of prod Mongo + uploads down to local (also a backup)
./scripts/dump-dev-db.sh       # sanitized shareable dump → dist-db/ (strips users/tokens/submissions)
./scripts/backup.sh            # full disaster-recovery dump (stays on the server; includes PII)
npx tsx scripts/migrate-to-db.ts --dry   # migrate the old static data through the admin API
```

`npm run open` takes credentials from `MEDC_ADMIN_*` / `MEDC_STUDENT_*` env vars — never hardcode
them, the script is committed. There is deliberately **no push-to-prod** counterpart to
`pull:prod`: production holds the only copy of real student accounts and uploaded documents.

### Ports (important)

The dev server runs on **5050**, not 5000 — macOS AirPlay Receiver binds 5000 and 403s every route.
`PORT` lives in the **repo-root `.env`** (one level above both client and server). The client's vite
proxy and `env.ts`/`vite.config.ts` all read it from there.

## Environment

`.env` at the **repo root** (not `server/.env`, despite what the README says). `.env.example` is
partly stale — it lists Postgres/Redis/Twilio/OTP vars that **this stack does not use** (the store
is MongoDB + a JSON file fallback). The vars that actually matter:

- `PORT`, `CLIENT_URL`, `MONGODB_URI`
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — **required**; the server refuses to boot if unset or if they
  start with `fallback-` (see `server/src/config/env.ts`). No silent default.
- `SMTP_*` — outbound mail; no-ops while the placeholder values are present.
- `AI_API_KEY` / `AI_API_BASE_URL` / `AI_MODEL` — OpenAI-compatible chat endpoint for the assistant.
  Leave blank to run the RAG-only structured fallback (no external call).
- `SEED_ADMIN_PASSWORD` / `SEED_STUDENT_PASSWORD` — required by `npm run seed`.

## Architecture

### One schema drives everything (the core idea)

`server/src/schema/collections.ts` is the **single source of truth** for every admin-managed
collection. Each collection is described once as a list of `Field`s, and that description generates:

| Generated artifact | File |
|---|---|
| Mongoose model + indexes | `server/src/models/resource.model.ts` (`resource(schema)`) |
| Validation + type coercion | `server/src/schema/validate.ts` |
| Admin CRUD API | `server/src/routes/admin.resources.routes.ts` (`/api/admin/resources/:c`) |
| Public read API | `server/src/routes/data.routes.ts` (`/api/data/:collection`) |
| Chatbot retrieval sources | `server/src/services/rag/db-sources.ts` |
| Admin table, edit form, CSV import/export | client fetches `/api/admin/schema` and renders it |

**Adding a collection = appending one `CollectionSchema` to `COLLECTIONS`.** It instantly gets a
Mongo collection, CRUD + public endpoints, an admin table/form, CSV import/export, and a card on
`/admin/data`. Do not hand-write per-collection routes, models, or forms — extend the schema instead.
See `ADMIN.md` for the full walkthrough.

Field flags worth knowing: `inList` (admin table column), `filterable` (filter control + public API
filter), `searchable` (free-text search), `pattern`/`patternMessage` (regex validation — load-bearing
for string fields that are *sorted* as data, like dates stored as strings), `publicRead` (exposed via
`/api/data`; `knowledgeBase` is intentionally false — chatbot-only).

### `colleges` is the canonical hub

`closingRanks`, `fees`, and `allotments` reference `colleges` by a real `collegeId` foreign key. The
bulk-import route rejects a whole batch if any ref doesn't resolve. `universities` (Explore) and
`abroadUniversities` are deliberately **separate** concepts, not merged into `colleges`. When
importing or migrating, **colleges must exist first**. Note: the colleges table carries duplicate
clusters (one institution entered several ways); the predictor collapses them by a name key — see the
comment in `server/src/services/predictor.ts`.

### CSV import is an upsert on `naturalKey` — never a delete-then-insert

Every collection declares a `naturalKey` (colleges → `name`; closingRanks →
`collegeId + year + round + course + category + quota`). Import matches on it and updates rows **in
place, preserving `_id`**, so re-running the same CSV is a no-op and imports are idempotent. The
original delete-then-insert implementation minted fresh ObjectIds and orphaned every child rank/fee
row ("Unknown college" across the site); `npm --prefix server run test:integrity` is the regression
test guarding it. Import is also all-or-nothing (one bad row rejects the batch), an unresolvable
`collegeId` is rejected, and deleting a referenced college returns **409** unless `?cascade=true`.
Keep this property when touching import/bulk code. Full detail in `ADMIN.md`.

### Data storage: Mongo required for domain data, JSON fallback for auth

- **Auth** (`user.model.ts`, tokens, chat sessions) dual-branches on `isMongoConnected()` and falls
  back to a JSON file store (`server/src/config/database.ts`, `store.load/save` → `server/data/db.json`).
- **Domain data** (everything schema-driven via `resource.model.ts`) is **Mongo-only** — the JSON
  store rewrites the whole file on every write, fatal for hundreds of thousands of rank/allotment
  rows. Both `data.routes.ts` and `admin.resources.routes.ts` return **503** when Mongo is down
  rather than hanging on Mongoose's buffer timeout.
- The server starts listening **immediately** and connects Mongo in the background; a failed Mongo
  connection does not crash boot (auth degrades to the file store). `serverSelectionTimeoutMS` is
  **30s, not the old 8s** — an Atlas SRV lookup + replica-set discovery + TLS handshake on a
  high-latency link routinely exceeds 8s, and the old ceiling silently dropped a fully-reachable
  cluster to the JSON store. `connected`/`disconnected` listeners keep `isMongoConnected()` honest
  across mongoose's background reconnects.

### Server wiring (`server/src/server.ts`) — order is deliberate

1. SSE chat routes (`/api/chat`) are mounted **before** `compression()` — gzip buffers the response
   and would break token-by-token streaming.
2. `compression()` then gzips the rest of the JSON API (the large `closingRanks`/facet payloads).
3. `apiLimiter` (global abuse ceiling) applied after SSE; a stricter per-endpoint limiter lives in
   `auth.routes.ts`. `trust proxy = 1` so rate limiters key on the real client IP behind nginx.
4. JSON body limit is raised to **25mb** for bulk CSV imports.

Route groups (`server/src/routes/index.ts`): `/auth`, `/chat`, `/admin` (behind `requireAuth` +
`requireAdmin`), `/data` (public read), `/documents` (student uploads + admin verification),
`/profile`, `/predict`.

### Rank predictor is server-side (`services/predictor.ts`)

Score → estimated AIR → percentile/category rank → Safe/Good/Reach/Tough college shortlist. It runs
on the server (not the browser) because the closing-rank set exceeds the public read cap, the chatbot
must return the same numbers, and the curves (`rankBands`/`categoryFactors`) are admin-editable rows,
not constants. `PUBLIC_MAX = 20000` caps the unpaginated public read; the truly large collections use
`/paged` + `/facets`. Some features are Pro-gated (`utils/plan.ts`, `isPro`) — e.g. free users get a
25-row allotment sample.

### Subscription gating is server-enforced and mirrored

`server/src/utils/plan.ts` is the source of truth (`free`/`pro`/`premium`; an expired paid plan
degrades to free via `effectiveTier`). Caps live there as constants — `FREE_ALLOTMENT_ROWS = 25`,
`FREE_PREDICT_MATCHES = 10`, `FREE_AI_PER_DAY = 5`. `client/src/lib/plans.ts` deliberately mirrors
it for UI copy/upgrade prompts; **change both together**, and never gate only on the client.

### Background jobs and uploads

- `server/src/jobs/scheduler.ts` runs in-process `node-cron` (single EC2 box, no multi-node
  double-fire risk): reminders daily at 08:00 IST **plus** a boot catch-up 20s after start so a
  restart never skips a day. `runAllDueReminders()` is idempotent — keep it that way.
- `/documents` handles student identity uploads (multer → `uploads/`, which is gitignored and
  contains real Aadhaar cards/marksheets). It sits **outside the web root** and nginx never serves
  it; stored filenames are randomised. Downloads are **owner-or-admin only**; per-file and per-user
  byte caps + a MIME allowlist live in `server/src/config/uploads.ts`. SVG/HTML are rejected
  (stored-XSS) and PDFs are forced to download rather than render.

### Client (`client/src`)

React 19 + Vite 8 + React Router 7 + Tailwind 3 + Recharts + Radix + framer-motion. `@` aliases
`client/src`. Pages are flat in `pages/`; `components/ui` is the shadcn-style primitive set,
`components/admin` renders the schema-driven admin panel.

- **Auth:** `providers/auth-provider.tsx` — JWT access token (15m, localStorage) + httpOnly refresh
  cookie (7d). `api.ts` transparently retries once on 401 via `/auth/refresh`; the provider restores
  a session on mount by trying the access token then the refresh cookie (this is what makes
  "remember me" survive a reload). Routes gate through `ProtectedRoute`/`PublicRoute`/`AdminRoute`.
- **Every page is lazy-loaded/code-split** (`routes/index.tsx`) — the audience is on Indian mobile
  data, so the login screen must not pull Recharts/framer-motion. Vite 8 uses the **rolldown**
  bundler; heavy libs are split into named chunks via `rolldownOptions` in `vite.config.ts`.
- Data fetching is plain `fetch` through hooks in `lib/data-api.ts` — no TanStack Query or axios,
  whatever older docs claim.
- **Domain record types (`College`, `ClosingRank`, `FeeEntry`, …) are hand-mirrored** from the
  server schema into `client/src/lib/data-api.ts` — add a field to `collections.ts` and you must
  update them here too.

## Data pipeline (`data/`)

Python scripts scrape/build real counselling data (NMC college list, MCC allotments, state fee
matrices) into `data/out/*.json`, then `data/import.mjs` pushes it into Mongo **through the admin
API** (it logs in as `admin@medcounsel.ai`, needs `SEED_ADMIN_PASSWORD`). Import order matters
(colleges first, then children rewrite `collegeName` → `collegeId`); everything upserts on each
collection's `naturalKey`, so re-running is idempotent. `node data/import.mjs --dry [only,collections]`
previews. There is a live undocumented NMC public JSON API used by the scrapers — see the
`medconsul-data-pipeline` and `medconsul-data-gaps` memories for the matching traps that caused real
bugs.

## Deploy

Production is a single EC2 host: nginx serves the client, systemd unit `medconsul` runs the server,
HTTPS. **Deploy is manual rsync** via `scripts/deploy.sh`:

```bash
./scripts/deploy.sh              # build + DRY-RUN (changes nothing)
CONFIRM=1 ./scripts/deploy.sh    # build, back up remote, rsync, restart, health-check, auto-rollback
```

It ships the **currently checked-out** code (prints branch@sha first), auto-discovers the prod
server dir and nginx root, never touches the prod `.env`/`node_modules`, and rolls back if
`/api/health` doesn't return 200. See `PRODUCTION_READINESS.md` for go-live blockers and
`scripts/backup.sh` for the automated Mongo backup.

## Stale docs — don't trust these

`README.md` predates most of the current architecture: it claims port 5000, a `server/.env`, and
lists only the auth endpoints. `.env.example` lists Postgres/Redis/Twilio vars this stack never
used. `ADMIN.md` row counts are from the original migration and are long superseded by the `data/`
pipeline. Prefer this file and the code; when they conflict, the code wins.

## Local AI backend (optional)

`opencode-shim/` translates opencode's session/event protocol into the OpenAI-compatible
`/chat/completions` + SSE that `services/ai.service.ts` speaks, so the assistant can run against a
local model with **no app code changes** — point `AI_API_BASE_URL` at the shim (`:8787/v1`).
`opencode serve` must run with `opencode-shim/` as cwd or its `medcounsel` agent won't exist.
