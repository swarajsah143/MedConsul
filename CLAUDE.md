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
- **Client tests:** `npm --prefix client run test` (vitest, jsdom). Watch: `npm run test:watch`. A
  single file: `cd client && npx vitest run src/test/csv.test.tsx`. Run it from `client/` — a bare
  `npx vitest run` at the **repo root** also picks up `server/src/test/*` and fails, since those are
  not vitest files.
- **Server tests are integration tests, not unit tests.** `server/src/test/*` are standalone `tsx`
  scripts that make **real HTTP calls to a running server** (`http://localhost:5050`, override with
  `API_URL`) against a real Mongo with seeded accounts — so `npm run dev` must be up, or they fail
  on connect/login. There is no framework: each prints `✓`/`✗` per assertion and exits non-zero.
  Run one at a time by script name: `test:integrity`, `test:documents`, `test:admin-users`,
  `test:students`, `test:profile`. **`predictor.test.ts` also hits the API** (`predictor.test.ts:16`)
  — it is *not* pure despite what its name suggests; it is simply not in the default `test` script.
  Run it with `npx tsx server/src/test/predictor.test.ts`.
- **Test credentials are the reason these suites often "can't run".** `integrity.test.ts` reads
  `ADMIN_PASSWORD` from the env, but `documents`/`students`/`profile` **hardcode the demo passwords
  as literals in committed source** (`documents.test.ts:63-65`, `students.test.ts:68-69`). Those
  literals — not `CREDENTIALS.md` — are the authoritative local passwords. **`CREDENTIALS.md` is
  committed and WRONG**: every password it documents fails against a seeded DB. If a suite 401s,
  reconcile the DB against the test literals rather than trusting that file.
- `test:admin-users` and the client's `admin-ui.test.tsx` write to that real Mongo and are not safe
  in parallel; `admin-ui.test.tsx` also drives the real UI against the live server.

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
- `GOOGLE_CLIENT_ID` — optional, follows the SMTP pattern: blank makes `POST /auth/google` return
  **503** rather than failing boot (it isn't security-critical).
- **The client has its own env file** (`client/.env`, Vite-loaded, `VITE_`-prefixed) — only
  `VITE_GOOGLE_CLIENT_ID` today. It's a public identifier (usually the same value as the server's
  `GOOGLE_CLIENT_ID`); blank hides the Google button entirely
  (`components/auth/google-auth-button.tsx` exports `isGoogleAuthEnabled`).

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

**Staff bypass all gating.** "Staff" = `isStaff(role)` = **admin OR counsellor**. `hasFullData` and `hasUnlimitedAi` short-circuit on `isStaff`, returning true for any staff member regardless of `plan` — there is no plan system for staff at all, only for the students they serve (so `admin-students.tsx` hides plan controls on staff rows; setting one is a no-op). Gate on role-then-plan (pass the whole principal to these helpers), not `isPro(plan)`/`isPremium(plan)` alone, or staff get incorrectly gated.

### Auth flow
JWT access token (15m, `localStorage`) + httpOnly refresh cookie (7d). The client `api.ts` transparently retries once on 401 by hitting `/auth/refresh`; `auth-provider.tsx` restores sessions on mount by trying the access token then falling back to the refresh cookie (this is what makes "remember me" work across reloads). Routes are gated by `ProtectedRoute` / `PublicRoute` / `AdminRoute` in `client/src/routes/index.tsx`. **Google Sign-In** is an alternate entry: the client posts a Google ID token to `POST /auth/google`, which `google-auth-library` verifies server-side and then either logs in or auto-provisions the user (`authProvider: 'google'`), issuing the same JWT + refresh cookie as password login.

**Three roles: `student`, `admin`, `counsellor`.** Each lands on its own home via `homeFor(role)` (student → `/dashboard`, admin → `/admin`, counsellor → `/counsellor`) so the destinations can't drift. Client route gates mirror server middleware: `AdminRoute`↔`requireAdmin` (admin only), `CounsellorRoute` (counsellor-only dashboard), and `StaffRoute`↔`requireCounsellor` (admin **or** counsellor — for shared tools like Counsellor Lookup at `/counsellor-lookup`). Counsellors get `counsellor-dashboard.tsx` + `counsellor-lookup.tsx`; they are staff (see gating above), not admins — they don't get the admin CRUD surface.

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

Route groups (`server/src/routes/index.ts`): `/health`, `/auth`, `/chat`, `/admin` (behind
`requireAuth` + `requireAdmin`), `/data` (public read), `/documents` (student uploads + admin
verification), `/profile`, `/predict`. There is no `/counsellor` server group — counsellors use the
same APIs behind `requireCounsellor`, and `/counsellor*` exists only as client routes.

Other one-off scripts in `scripts/`: `import-neet.ts`, `migrate-counselling.ts`, `import-seed.ts`
(legacy imports); `enrich-colleges.ts` / `enrich-abroad.ts` (photos, websites, metadata);
`derive-closing-ranks.ts` (cutoffs from allotment data — see the `source` field on `closingRanks`);
`prod-import-domain.mjs` / `prod-fix-blank-quota.mjs` / `prod-reset-admin-password.mjs` (run **on**
the prod host, dry-run by default).

### Rank predictor is server-side (`services/predictor.ts`)

Score → estimated AIR → percentile/category rank → Safe/Good/Reach/Tough college shortlist. It runs
on the server (not the browser) because the closing-rank set exceeds the public read cap, the chatbot
must return the same numbers, and the curves (`rankBands`/`categoryFactors`) are admin-editable rows,
not constants. `PUBLIC_MAX = 20000` caps the unpaginated public read; the truly large collections use
`/paged` + `/facets`. Some features are gated (`utils/plan.ts`) — e.g. free users get a 25-row
allotment sample and a 10-college shortlist. Gate with `hasFullData(user)` / `hasUnlimitedAi(user)`,
never bare `isPro(plan)`, or staff get wrongly capped (see the staff-bypass note above).

### `closingRanks.source` — published cutoffs vs derived ones

A blank `source` is a **published** cutoff. `source: 'derived: MCC allotments'` was computed by
`scripts/derive-closing-ranks.ts` as `max(allIndiaRank)` over our allotment rows for that group, so
it is only as complete as that data — where it disagrees with a published cutoff it reads
**optimistic** (median 1.46x, p90 3.38x better than truth, measured over 2,317 overlapping groups).
2,154 of ~8,600 rows are derived. Anything that shows a student a cutoff should keep the two
distinguishable; the derive script is insert-only and never overwrites a published row.

### Domicile-gated seats (`utils/quota.ts`, mirrored to `client/src/lib/quota.ts`)

A fee belongs to a **seat**, not a student, and most state seats require that state's domicile: in
Karnataka a domiciled student takes a private college seat at the KEA "Government (G)" rate (~₹1.4L)
while a student from another state pays the Private (P) rate (~₹12L) for the same seat.
`quotaAccess(quota, collegeState)` derives this from the quota string — no schema field, no
migration. Two rules carry the weight:

- `Government Quota (G)` is the **Karnataka state quota**, not a national government seat. It is the
  most misread label in the dataset.
- `Private Quota (P)`, `Other Quota (Q)`, `NRI Quota (N)` return `unknown` **on purpose** and must
  render nothing. `data/fetch_kea_fees.py` refuses to translate KEA's letters ("OTHER (Q) is not the
  same thing as a COMEDK seat"), so classifying them would invent eligibility advice. Silence is
  safe; a wrong badge is not.

Consumed by `fee-matrix.tsx`, `fee-detail.tsx`, `counsellor-lookup.tsx` and the chatbot's fee source
(which also drops ineligible seats before the "cheapest college" sort — otherwise it ranked
unreachable seats first). `server/src/test/quota.test.ts` is pure and covers every live quota string.

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

- **Auth** lives in `providers/auth-provider.tsx` — see the Auth flow section above; the token is in
  `localStorage` under `accessToken`. A hook that needs the signed-in user but may run on a page
  mounted standalone (tests, or any page rendered outside the provider) should read that key
  directly rather than call `useAuth()`, which **throws** without an `AuthProvider` ancestor.
- **Hooks must sit above a component's early returns.** Several pages `return` on
  loading/error/not-found before the render body; a hook added after those changes hook order
  between renders and React throws. This has bitten `fee-detail.tsx` specifically.
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

**A new server dependency must be installed on prod BEFORE you deploy.** The rsync ships only
`server/dist` + `client/dist` — never `node_modules` — so new code importing a package prod doesn't
have crashes the service on restart and auto-rolls-back. This already happened once with
`google-auth-library` (imported at the top of `auth.service.ts`, which loads at boot). Check with
`git diff <last-deployed-sha>..HEAD -- server/package.json`, then
`ssh … 'cd /opt/medconsul/server && npm install <pkg> --omit=dev'` first.

**nginx must 404 a missing asset, not fall through to the SPA.** `rsync --delete` removes the
previous build's content-hashed chunks, so a browser holding a cached `index.html` requests a chunk
that no longer exists. With a single catch-all `try_files $uri $uri/ /index.html` that returned
`index.html` as `text/html` with **HTTP 200**, which the browser reports as "Expected a
JavaScript-or-Wasm module script" and renders a blank page — after *every* deploy. The vhost now has
`location /assets/ { try_files $uri =404; }` (plus a 1-year immutable cache, safe because the
filenames are content-hashed) and `location = /index.html { Cache-Control: no-cache }`. Re-apply with
`scripts/prod-patch-nginx-assets.py` if the config is ever rebuilt; verify with
`curl -o /dev/null -w '%{http_code}' https://…/assets/does-not-exist.js` → must be 404.

### Pushing domain data to prod

There is no push-to-prod for *user* data, but domain rows can be moved with
`scripts/prod-import-domain.mjs`, which runs **on the EC2 host** (mongod is localhost-only there and
`MONGODB_URI` lives in `/opt/medconsul/.env`, so the connection string never crosses the wire). Do
**not** create colleges through the admin API for this: it mints new ObjectIds, which orphan any
child rows referencing the ids they were derived against. Writing directly lets new colleges keep
their `_id` so every child row resolves. Dry-run by default, `$setOnInsert` only, natural-key
upserts, and it aborts if any FK would dangle. `mongodump` the affected collections first.

## Stale docs — don't trust these

`README.md` predates most of the current architecture: it claims port 5000, a `server/.env`, and
lists only the auth endpoints. `.env.example` lists Postgres/Redis/Twilio vars this stack never
used. `ADMIN.md` row counts are from the original migration and are long superseded by the `data/`
pipeline. **`CREDENTIALS.md` is committed and its passwords do not work** — the real local values
are hardcoded in the server test files. Prefer this file and the code; when they conflict, the code
wins.

**Row counts anywhere in docs or tests age badly.** The dataset has grown from 29 colleges to
~1,114, which silently broke a test that assumed a specific college was on page 1 of the admin
table (it is now on page 15). Assert on shape, not on a named row.

## Local AI backend (optional)

`opencode-shim/` translates opencode's session/event protocol into the OpenAI-compatible
`/chat/completions` + SSE that `services/ai.service.ts` speaks, so the assistant can run against a
local model with **no app code changes** — point `AI_API_BASE_URL` at the shim (`:8787/v1`).
`opencode serve` must run with `opencode-shim/` as cwd or its `medcounsel` agent won't exist.
