# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

MedCounsel AI (`medcounsel-ai`) — a NEET-UG medical counselling assistant for Indian students: closing-rank insights, fee & seat matrix, college reviews, seat-allotment mapping, a rank predictor, a document checklist, and a RAG chatbot. Monorepo with a React SPA (`client/`) and an Express/TypeScript API (`server/`), tied together by root scripts.

## Commands

Run everything from the repo root unless noted. `npm --prefix client` / `npm --prefix server` targets a package without `cd`.

```bash
npm run dev            # client (5173) + server concurrently
npm run dev:client     # Vite dev server only
npm run dev:server     # tsx watch on the API only
npm run seed           # seed demo accounts (requires SEED_ADMIN_PASSWORD in env; Mongo must be up)
npm test               # client vitest + server integration suite

# Client
npm --prefix client run build        # tsc -b && vite build
npm --prefix client run lint         # oxlint (NOT eslint)
npm --prefix client run test         # vitest run (jsdom + testing-library)
cd client && npx vitest run src/test/csv.test.tsx   # single client test file

# Server
npm --prefix server run build        # tsc -> dist/
npm --prefix server run test         # runs integrity/documents/admin-users/students/profile in sequence
npx tsx server/src/test/predictor.test.ts           # single server test file
```

### Server tests are integration tests, not unit tests
The suites in `server/src/test/*` are standalone `tsx` scripts that make **real HTTP calls to a running server** (`http://localhost:5050` by default, override `API_URL`) and require MongoDB plus a seeded admin. Start `npm run dev` and seed first, or they fail on connection. `predictor.test.ts` is the exception (pure) and is not in the default `test` script. Each file exits non-zero on failure and prints `✓`/`✗` per assertion — there is no test runner/framework.

## Environment & ports

- The real env file is **`.env` at the repo root** (loaded by `server/src/config/load-env.ts` from `../../../.env`), not `server/.env`. Both `server.ts` and `env.ts` import `load-env` first so `process.env` is populated before any module reads it.
- **`.env.example` is stale/aspirational** — it lists PostgreSQL, Redis, Twilio, and OTP vars that the code does **not** use. The actual stack is MongoDB + an OpenAI-compatible AI endpoint. Trust the code (`config/env.ts`, `config/database.ts`), not `.env.example`.
- Required secrets: `JWT_SECRET`, `JWT_REFRESH_SECRET` — the server **refuses to boot** if unset or left as a `fallback-` value (see `env.ts`). `MONGODB_URI` enables domain data (see below). `AI_API_KEY` is optional (blank → RAG fallback). SMTP vars are optional (unset/placeholder → mail no-ops). `GOOGLE_CLIENT_ID` is optional and follows the SMTP pattern — blank makes `POST /auth/google` respond **503** instead of failing fast (it isn't security-critical).
- **The client has its own env file** (`client/.env`, Vite-loaded, `VITE_`-prefixed). Only `VITE_GOOGLE_CLIENT_ID` today — it's a public identifier (usually the same value as the server's `GOOGLE_CLIENT_ID`); a blank value hides the Google button entirely (`components/auth/google-auth-button.tsx` exports `isGoogleAuthEnabled`).
- Server port comes from root `.env` `PORT` (code default 5000). The Vite dev server (5173) proxies `/api` to that port, falling back to 5050 — so the client only ever calls `/api/...` (see `client/vite.config.ts`).

## Architecture

### Two databases, one abstraction, deliberate split
`server/src/config/database.ts` connects to MongoDB if `MONGODB_URI` is set, and **falls back to a JSON file store** (`server/data/db.json`, rewritten in full on every write) otherwise.

- **Auth data** (users, refresh tokens, password resets) and **chat sessions** dual-branch on `isMongoConnected()` and work with either store.
- **All domain data is Mongo-only.** `resource.model.ts` is deliberately not dual-branched — the JSON store rewrites the whole file per write, which is fine for a few users but fatal for ~222k allotment rows. When Mongo is down, `/api/data/*` and `/api/admin/resources/*` return **503** rather than hanging on Mongoose's buffer timeout, and the chatbot serves a frozen snapshot.

### Schema-driven collections (the core pattern — read `ADMIN.md`)
`server/src/schema/collections.ts` is the **single source of truth** for every admin-managed collection. One `CollectionSchema` (fields, `naturalKey`, `publicRead`, indexes) drives all of:

| Generated artifact | File |
|---|---|
| Mongoose model + auto-indexes | `server/src/models/resource.model.ts` |
| Validation + type coercion | `server/src/schema/validate.ts` |
| Admin CRUD API (`/api/admin/resources/*`) | `server/src/routes/admin.resources.routes.ts` |
| Public read API (`/api/data/*`) | `server/src/routes/data.routes.ts` |
| Chatbot RAG retrieval | `server/src/services/rag/db-sources.ts` |
| Admin table / form / CSV import UI | client fetches `/api/admin/schema` and renders from it |

**To add an admin-managed collection: append one `CollectionSchema` to `COLLECTIONS` in `collections.ts`.** It instantly gets a Mongo collection, CRUD + public endpoints, an admin table with filters/search/pagination, an edit form, CSV import/export, and a card on `/admin/data`. No client change needed.

Key invariants baked into this layer:
- **`colleges` is canonical.** `closingRanks`, `fees`, and `allotments` reference it by `collegeId` (a real FK). Deleting a referenced college returns **409** with dependent counts unless `?cascade=true`.
- **Bulk import is an UPSERT on `naturalKey`, never delete-then-insert** — this preserves `_id`s so foreign keys survive re-imports. Re-running the same CSV is idempotent. A regression test (`test:integrity`) guards this; the delete-then-insert bug orphaned every rank/fee row historically.
- CSV import is **all-or-nothing**: one invalid row rejects the whole file with `row N, column X: message`.

### Public read API shape (`/api/data/:collection`)
- `GET /:collection` — unpaginated, capped at `PUBLIC_MAX` (20000); pages filter client-side on small sets (`useCollection` in `client/src/lib/data-api.ts`).
- `GET /:collection/paged` — server-side pagination + filtering for large collections (`allotments`, `closingRanks`). Supports `page/limit/sort/q`, exact-match filters, and `<numberField>_min`/`_max` range bounds (`usePaged`).
- `GET /:collection/facets?fields=a,b` — distinct values for building filter dropdowns without downloading the collection (`useFacets`).

### Subscription gating (free / pro / premium)
`server/src/utils/plan.ts` is the server source of truth (mirrored client-side in `client/src/lib/plans.ts` + `use-plan.ts`). Gating is **server-enforced**, not just UI: e.g. `allotments/paged` returns only `FREE_ALLOTMENT_ROWS` (25) with `gated: true` for non-pro users (which also blocks CSV export). An expired `planExpiresAt` silently downgrades to free (`effectiveTier`).

**Staff bypass all gating.** "Staff" = `isStaff(role)` = **admin OR counsellor**. `hasFullData` and `hasUnlimitedAi` short-circuit on `isStaff`, returning true for any staff member regardless of `plan` — there is no plan system for staff at all, only for the students they serve (so `admin-students.tsx` hides plan controls on staff rows; setting one is a no-op). Gate on role-then-plan (pass the whole principal to these helpers), not `isPro(plan)`/`isPremium(plan)` alone, or staff get incorrectly gated.

### Auth flow
JWT access token (15m, `localStorage`) + httpOnly refresh cookie (7d). The client `api.ts` transparently retries once on 401 by hitting `/auth/refresh`; `auth-provider.tsx` restores sessions on mount by trying the access token then falling back to the refresh cookie (this is what makes "remember me" work across reloads). Routes are gated by `ProtectedRoute` / `PublicRoute` / `AdminRoute` in `client/src/routes/index.tsx`. **Google Sign-In** is an alternate entry: the client posts a Google ID token to `POST /auth/google`, which `google-auth-library` verifies server-side and then either logs in or auto-provisions the user (`authProvider: 'google'`), issuing the same JWT + refresh cookie as password login.

**Three roles: `student`, `admin`, `counsellor`.** Each lands on its own home via `homeFor(role)` (student → `/dashboard`, admin → `/admin`, counsellor → `/counsellor`) so the destinations can't drift. Client route gates mirror server middleware: `AdminRoute`↔`requireAdmin` (admin only), `CounsellorRoute` (counsellor-only dashboard), and `StaffRoute`↔`requireCounsellor` (admin **or** counsellor — for shared tools like Counsellor Lookup at `/counsellor-lookup`). Counsellors get `counsellor-dashboard.tsx` + `counsellor-lookup.tsx`; they are staff (see gating above), not admins — they don't get the admin CRUD surface.

### AI chatbot (RAG + SSE)
`server/src/services/ai.service.ts` runs a pipeline: query → intent classification → data retrieval (`services/rag/`) → context building → provider call. It targets any **OpenAI-compatible** endpoint (`AI_API_KEY`/`AI_API_BASE_URL`/`AI_MODEL`). With no key, or when the provider errors/is unreachable, it **degrades to a formatted RAG answer built directly from DB data** rather than failing the chat. Streaming uses **SSE** (`routes/chat.sse.ts`), mounted in `server.ts` **before** `compression()` on purpose — gzip would buffer and break the token-by-token stream.

### Document uploads
Student identity docs (Aadhaar, marksheets, etc.) are stored **outside the web root** in `uploads/` (never served by nginx), with random stored filenames and per-file/per-user size caps. Every download goes through an authenticated, ownership-checked route. SVG/HTML are rejected (stored-XSS); PDFs force download. See `config/uploads.ts`.

### Client conventions
- Every page is **lazy-loaded / code-split** (`routes/index.tsx`) — the audience is on Indian mobile data, so the login screen must not pull in Recharts/framer-motion. Vite 8 uses the **rolldown** bundler; heavy libs are split into named chunks in `vite.config.ts` (`rolldownOptions`).
- Path alias `@/` → `client/src/`.
- UI is shadcn-style primitives in `components/ui/`. Data fetching is plain `fetch` via hooks in `lib/data-api.ts` (no TanStack Query / axios despite what older docs say).
- Domain record types (`College`, `ClosingRank`, `FeeEntry`, …) are hand-mirrored from the server schema in `client/src/lib/data-api.ts` — keep them in sync with `collections.ts`.

### Scheduled jobs
`server/src/jobs/scheduler.ts` (node-cron) runs daily + boot-catchup announcement reminders; idempotent and no-ops when SMTP/Mongo aren't configured. Started from `server.ts`.

## Route map (server)
Mounted under `/api` in `server/src/routes/index.ts`: `/auth`, `/chat` (+ SSE), `/admin` (requires admin), `/data` (public read), `/documents` (student uploads + admin verification), `/profile`, `/predict` (public score→AIR→colleges), `/health`.

## Operational scripts (`scripts/`)
- `migrate-to-db.ts` — migrate legacy static data into Mongo via the real admin HTTP API (`--dry`, `--replace`). Prints a college-reconciliation report.
- `import-neet.ts`, `migrate-counselling.ts`, `import-seed.ts` — one-off data imports.
- `enrich-colleges.ts`, `enrich-abroad.ts` — backfill/augment college & abroad-university records (photos, websites, metadata).
- `backup.sh`, `pull-prod.sh` (`npm run pull:prod`) — DB backup / pull production data.

## Reference docs in this repo
`ADMIN.md` (the schema-driven data system — read before touching collections), `README.md` (feature/API overview), `CREDENTIALS.md` (demo accounts), `FEATURE_AUDIT.md`, `PRODUCTION_READINESS.md`.
