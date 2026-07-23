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
- **Server tests:** individually via the named scripts in `server/package.json` — e.g.
  `cd server && npm run test:predictor` or `npm run test:profile`. These are `tsx` scripts, not a
  framework, so run them one at a time by script name. `test:admin-users` and `admin-ui.test.tsx`
  **write to a real Mongo** — they need `MONGODB_URI` set and are not safe to run in parallel.

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

### Data storage: Mongo required for domain data, JSON fallback for auth

- **Auth** (`user.model.ts`, tokens, chat sessions) dual-branches on `isMongoConnected()` and falls
  back to a JSON file store (`server/src/config/database.ts`, `store.load/save` → `server/data/db.json`).
- **Domain data** (everything schema-driven via `resource.model.ts`) is **Mongo-only** — the JSON
  store rewrites the whole file on every write, fatal for hundreds of thousands of rank/allotment
  rows. Both `data.routes.ts` and `admin.resources.routes.ts` return **503** when Mongo is down
  rather than hanging on Mongoose's buffer timeout.
- The server starts listening **immediately** and connects Mongo in the background; a failed Mongo
  connection does not crash boot (auth degrades to the file store).

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

### Client (`client/src`)

React 19 + Vite 8 + React Router 7 + Tailwind 3 + Recharts + Radix + framer-motion. `@` aliases
`client/src`. Auth lives in `providers/auth-provider.tsx` (JWT access token + httpOnly refresh
cookie). Pages are flat in `pages/`; `components/ui` is the shadcn-style primitive set,
`components/admin` renders the schema-driven admin panel. The vite build manually chunks
react/charts/motion/icons so the login screen doesn't pull Recharts.

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
