# MedConsul — Production Readiness Checklist

_Live NEET-counselling app · real students · real identity documents (Aadhaar/marksheets)_
_Audit date: 2026-07-16 · Repo: `/Users/avin/projects/clients/MedConsul` · Prod: https://medconsul.earthlingaidtech.com (single AWS EC2, systemd `medconsul.service` → `node dist/server.js:5050`, nginx+HTTPS, MongoDB `localhost:27017/medcounsel`)_

> ⚠️ This document names known weaknesses. It belongs in a **private** repo — making the GitHub repo private is Blocker #1. Live secret values are redacted here.

---

## Context

MedConsul is a **live** product with **real users** (4 accounts, 7 document submissions including uploaded Aadhaar cards and marksheets sitting in `/opt/medconsul/uploads`). The app is feature-broad: rank predictor, cutoff insights, fee matrix, seat allotments, document checklist, AI assistant, admin console. The underlying data is genuinely mined and citation-backed for most collections — this is a real product, not a demo. HTTPS was just switched on and the login page is now internet-facing.

The problem is that **the security, compliance, and operational posture has not caught up to the fact that real student PII is now on the line.** Several issues are not theoretical: the default admin password works on the live site right now, a live full-access email API key is committed to a **public** GitHub repo, and the only copy of every student's identity document has no automated backup.

## Production-readiness verdict

**NOT safe for real students in its current state.** The core app _functions_ — data is real, pages render, degradations are mostly graceful — but there are **active, zero-skill exploitation paths against real user PII** and **at least one credential that must be assumed already compromised.** This is a small, fixable set of blockers, not a rewrite. The critical items are almost all **S-effort** (rotate a password, revoke a key, fix a `.gitignore` typo, add rate limiting) plus two **M-effort** compliance items (purge git history, publish a privacy policy).

**Hard blockers before real students should use it (all fixable in ~1–2 focused days):**
1. Live default admin password works on production and is written down in the repo.
2. Live full-access Resend API key committed to a **public** repo — assume compromised, revoke now.
3. Real user data (bcrypt hashes + **live, still-valid** JWT refresh tokens) pushed to a public GitHub remote via a `.gitignore` typo.
4. No rate limiting on `/api/auth/*` — the default-credential admin login is brute-forceable at full speed.
5. No privacy policy / terms / upload consent while collecting Aadhaar — a DPDP Act 2023 compliance gap.
6. No automated/offsite backup — the single EC2 box holds the only copy of all student identity documents.

Once the 🔴 Blockers are cleared, the product is _defensible_ for a small, supervised real-user cohort. The data-completeness and feature gaps below are about **product value and honesty**, not safety, and can follow.

---

## 🔴 Blockers — fix before real students use it

Ordered most-severe first. Every one of these has been verified against the live system or repo.

- [ ] **Rotate the production admin password NOW and force it out of code** `[critical · S]` — `admin@medcounsel.ai` / the seeded default returns HTTP 200 `role:"admin"` on live prod (verified; wrong password = 401). Change it to a unique strong secret in the DB immediately. Make `seed.ts` read the password from an env var with **no default** and refuse to seed a known-weak password when `NODE_ENV=production`. → `server/src/seed.ts:14`, `data/import.mjs:33`
- [ ] **Revoke the live Resend API key** `[critical · S]` — `.env.example:36` `AI_API_KEY=re_…(redacted)` is a **full-access** Resend key (verified: `GET /domains` and `GET /api-keys` both return 200 → can send email, manage domains, and create/delete keys). It is committed to a **public** repo and trivially found by secret-scanning bots. Revoke in the Resend dashboard, then replace the value in `.env.example` with an obvious placeholder (`re_xxx`). → `.env.example:36-37`
- [ ] **Fix the `.gitignore` typo that leaks the DB backup** `[critical · S]` — `.gitignore:34` ignores `backups/` (plural) but the real dir is `data/backup/` (singular), so 41 dump files are tracked (`git check-ignore` confirms NOT ignored). Add `data/backup/`, `*.bson`, `*.pyc`, `__pycache__/`. → `.gitignore:31,34`
- [ ] **Rotate `JWT_SECRET` and `JWT_REFRESH_SECRET` on prod** `[critical · S]` — `data/backup/.../refreshtokens.bson` (committed, public) holds **71 real refresh tokens, some still valid** (exp 2026-07-18). Rotating the refresh secret invalidates every leaked token; this is an active session/account-takeover vector. → prod `.env`; `data/backup/pre-import-20260714-122214/medcounsel/refreshtokens.bson`
- [ ] **Add rate limiting to `/api/auth/*`** `[high · S]` — no `express-rate-limit`/`helmet` anywhere; the money-costing AI chat route IS throttled but the account-takeover login is not (inverted priority). Add a strict limiter on `/login`, `/forgot-password`, `/reset-password` (5–10/min/IP + per-account backoff) and a global `/api` limiter. Add `helmet` for baseline headers. → `server/src/routes/auth.routes.ts`, `server/src/server.ts:15-36`
- [ ] **Purge the default password and demo creds from tracked files + git history** `[critical · S]` — the literal appears in **14 tracked files** including `CREDENTIALS.md:12` and `FEATURE_AUDIT.md:14`. Delete `CREDENTIALS.md`, scrub the creds from `FEATURE_AUDIT.md`, and purge from history (BFG/`git-filter-repo`) so the leak isn't permanent. → `git grep -n "Admin@..."`
- [ ] **Purge `data/backup/**` from git history and force-push** `[critical · M]` — `users.bson` (real emails + bcrypt hashes), `submissions.bson`, `refreshtokens.bson` are on the public remote `github.com/swarajsah143/MedConsul`. (Verified: no Aadhaar images are in git — those live only in `/opt/medconsul/uploads`; but emails/hashes/tokens are.) Run BFG/`git-filter-repo`, force-push, have all clones re-clone. This also fixes the 106M `.git` bloat. → `data/backup/pre-import-20260714-122214/medcounsel/*.bson`
- [ ] **Make the GitHub repo private / move it to a client-owned org** `[critical · S]` — verified **public**. Even after history purge, a personal-account public repo is the wrong home for a PII-handling product. → `github.com/swarajsah143/MedConsul`
- [ ] **Publish a Privacy Policy + Terms and add a consent checkbox at signup** `[critical · M]` — collecting Aadhaar-linked identity documents with **zero** notice, consent, or stated retention/erasure policy is a DPDP Act 2023 gap. Add static `/privacy` + `/terms` routes, a required "I agree" checkbox that blocks signup, and a one-line data-handling notice on the doc-upload screen. → `client/src/pages/signup.tsx`, `client/src/pages/doc-checklist.tsx`
- [ ] **Stand up an automated, offsite, rotated backup** `[critical · M]` — prod is the ONLY copy of all real users + uploaded Aadhaar/marksheets; the sole mechanism is a manual laptop-pull that last ran 3 days ago. Add a nightly EC2 cron: `mongodump --gzip --archive` + `tar` of `/opt/medconsul/uploads` → private encrypted S3 (SSE + versioning + Object Lock + lifecycle 7d/4w/6m). Add a weekly restore-test. → `scripts/pull-prod.sh`; EC2 `:27017` + `/opt/medconsul/uploads`
- [ ] **Force a password reset for all real users after credential rotation** `[high · S]` — prod ran plain HTTP before the recent TLS cutover, and bcrypt hashes are now public; treat existing passwords as exposed. → post-rotation ops step
- [ ] **Set `COOKIE_SECURE=true` on the now-TLS host and confirm HTTPS is enforced** `[medium · S]` — _(already done during the HTTPS cutover — verify it stuck)_: nginx does `301 http→https`; `COOKIE_SECURE=true` is set in prod `.env`. Add HSTS via helmet. → `server/src/controllers/auth.controller.ts:11-23`
- [ ] **Confirm the EC2 Elastic IP is allocated (not a dynamic IP)** `[high · S]` — a dynamic public IP will change on stop/start and silently break the domain. UNCONFIRMED — verify before any reboot. → EC2 console
- [ ] **Confirm certbot auto-renewal is actually running** `[medium · S]` — HTTPS was just hand-configured; LE certs expire in 90 days and there's no monitoring to catch a failed renewal. Run `systemctl list-timers | grep certbot` and `certbot renew --dry-run`, confirm the deploy-hook reloads nginx. → EC2 `certbot.timer`

---

## Data status

Prod DB and repo were measured directly. "REAL" = genuinely mined and citation-backed; the gap column is the honest caveat a student would hit.

| Collection | Status | Count | Gap / caveat |
|---|---|---|---|
| **colleges** | REAL | 932 | 27 unmerged duplicate-name clusters (some spelled 3–5 ways); only 113 have aliases; state strings not normalised (`Chhattisgarh`/`Chattisgarh`, `Jammu & Kashmir`/`Jammu and Kashmir`) split filters |
| **closingRanks** | REAL | 6,625 | 98 colleges have **zero** closing ranks; 82 colleges have neither ranks nor fees → searchable but empty profiles |
| **fees** | REAL-BUT-INCOMPLETE | 182 rows / **96 of 932 colleges (10.3%)** | Covers **only Karnataka + Maharashtra** (4 source URLs). UP, TN, Telangana, Gujarat, AP, Rajasthan, Kerala, Delhi, etc. have **zero** fee data. Plus **213 real sourced fee rows quarantined** in `raw/fees.unresolved.json` (never reach users) |
| **allotments** | REAL-BUT-INCOMPLETE | 222,716 rows | **66,670 (29.9%) have NO collegeId** — unjoinable. Only 414/932 colleges have any linked allotment → **518 colleges show no seat-allotment history at all**. Unlinked set dominated by deemed/duplicate clusters (DY Patil Pune 1084, Raja Rajeswari 1037, SBKS Sumandeep 1032, Sri Ramachandra 1006) + generic cells |
| **stateDocs** | REAL-BUT-INCOMPLETE | 31 rows / **16 of 36 states** | Missing UP, Rajasthan, Assam, J&K, Himachal, Uttarakhand, Jharkhand + ~18 more. This is the data-side cause of the dead per-state counselling dropdown |
| **counsellingQuotas** | REAL | 14 | National-level only (AIQ/deemed), not per-state |
| **counsellingSections** | REAL | 4 | National-level only |
| **announcements** | REAL | 119 | Citations point at portal **homepages** (e.g. wbmcc root ×22), not the specific notice PDF — weak provenance, link-rot risk |
| **universities** | REAL | 70 | 42/70 rows cite one generic NMC list page + 15 cite a single UGC PDF → citation doesn't substantiate per-row facts |
| **abroadUniversities** | REAL | 39 | Strongly cited (39 distinct WDOMS URLs) — good |
| **checklistDocs** | REAL | 41 | — |
| **knowledgeBase** | REAL | 44 | Duplicated by a frozen ~14-row hardcoded snapshot in `retriever.ts` (drift risk) |
| **blogs** | REAL | 16 | Mined, no separate sources file |
| **rankBands** | REAL (derived) | 60 | **Uncited heuristic** — no sources file; drives the predictor students act on |
| **categoryFactors** | REAL (derived) | 5 | **Uncited heuristic** — unlabelled multipliers; may not generalise if from one year's CSV |
| **out/*.json pipeline files** | STALE | colleges 820 / ranks 5,425 | **Do not match the DB (932 / 6,625).** Re-running `build_base + import.mjs` would NOT delete data (colleges/ranks are non-destructive upserts) but the pipeline is not reproducible-to-current |
| **client mock files** | DEAD CODE | ~4,000 lines | `lib/{insights,college,checklist,explore,announcements,abroad,allotment,fee-matrix}-data.ts` — pages use live data (VERIFIED), these are un-imported. A future edit could re-wire a page to frozen mocks |

### Data actions

- [ ] **Ingest fees for the remaining ~28 states** `[high · L]` — prioritise top-enrolment states (UP 92, TN 90, Telangana 67 colleges). Sources: NMC fee disclosures, MCC deemed/central sheets, each state CET fee notification. → `data/build_fees.py`, `data/fetch_*_fees.py`
- [ ] **Work the 213 quarantined fee rows** `[high · M]` — most are name-match misses; re-resolve against the current **932**-college DB (not stale 820 `out/colleges.json`). → `data/raw/fees.unresolved.json`
- [ ] **Resolve the top unlinked allotment clusters** `[high · L]` — the top 15 names alone ≈ 13k rows. Add printed variants to each target college's `aliases[]`, have the link step read aliases as exact-match keys, re-run link only (no 2h PDF re-parse). → `data/raw/allotments.unlinked.json` (634 names / 66,670 rows)
- [ ] **Surface an explicit "fee/allotment data not yet available" state in the UI** `[high · S]` — distinguish "no data yet" from "not applicable"; show coverage ("fees for 96 of 932 colleges"). Don't render blank cards that look like bugs. → `client/src/pages/fee-matrix.tsx`, college-detail, allotment pages
- [ ] **Normalise `colleges.state` strings** `[medium · S]` — map `Chattisgarh→Chhattisgarh`, unify J&K spellings. Safe in-place update, no FK impact. → DB `colleges.state`
- [ ] **Canonicalise the 27 duplicate clusters via aliases (do NOT auto-merge)** `[medium · M]` — pick one canonical row per cluster, fold other spellings into `aliases[]`; resolver treats aliases as exact keys. Auto-merge would repoint rank FKs onto a wrong survivor. → `data/raw/base_duplicates.json`
- [ ] **Regenerate `out/colleges.json` + `out/closingRanks.json` from the live 932-college DB** `[medium · M]` — make the committed files the source of truth again; verify `import.mjs --dry` reports 0 net change; add an `out/` vs DB row-count drift check. → `data/out/*.json`
- [ ] **Backfill closing ranks for the 98 empty colleges** `[medium · M]` — partly parsed already in `raw/mcc_pdfs`; flag genuine no-source colleges as "limited data". → DB colleges vs closingRanks
- [ ] **Populate stateDocs / per-state counselling for the 20 missing states, or scope the UI to the 16 that have content** `[medium · M]` → `data/out/stateDocs.json`
- [ ] **Deep-link announcement + university citations to the specific PDF/record** `[medium · M]` — use the NMC per-college JSON provenance instead of shared list pages. → `data/out/{announcements,universities}.sources.json`
- [ ] **Document how `categoryFactors`/`rankBands` were derived + add a methodology note in the predictor UI** `[low · S]` → `data/out/{categoryFactors,rankBands}.json`
- [ ] **Delete the ~4,000 lines of dead mock files** `[low · S]` — extract `formatINR`/`formatINRFull` to `lib/format.ts` and `AllotmentEntry` type to `data-api.ts` first, then delete the mock arrays + stale comments. → `client/src/lib/*-data.ts`

---

## Security & compliance

Blocker-level security items are in 🔴 above. These are the remaining hardening items.

- [ ] **Remove JWT fallback secrets and fail startup on missing/placeholder values** `[medium · S]` — `env.ts:7-8` falls back to `'fallback-secret'`/`'fallback-refresh'` and never fails startup; a bad deploy that doesn't load `.env` would silently sign forgeable admin tokens. Throw on missing secrets and on the known placeholder strings. → `server/src/config/env.ts:7-8`
- [ ] **Enable MongoDB authentication** `[medium · S]` — `mongodb://localhost:27017/medcounsel` runs with auth disabled; any local RCE/SSRF or a mis-set `bindIp`/SG rule = full unauthenticated read/write to all PII. Create a least-privilege app user, set `security.authorization: enabled`, confirm `bindIp=127.0.0.1` and SG does not expose 27017. → prod `.env` `MONGODB_URI`, mongod config
- [ ] **Add `helmet` (HSTS, frameguard/deny, CSP, Referrer-Policy)** `[medium · S]` — no app-level security headers; login is clickjackable. The document-download route already does headers right (`documents.routes.ts:164-170`) — make it the norm. → `server/src/server.ts:15-36`
- [ ] **Keep the SSE CORS origin in sync with the main CORS origin** `[low · S]` — `chat.sse.ts:66` hand-writes `Access-Control-Allow-Origin` from `CLIENT_URL`, a second easily-desynced place. → `server/src/routes/chat.sse.ts:66`
- [ ] **Expire outstanding password-reset tokens** `[medium · S]` — confirm `passwordresets` is cleared after JWT rotation. → `data/backup/.../passwordresets.bson`
- [ ] **Fix mislabeled auth error logging + bound email length** `[low · S]` — every auth catch logs `'LOGIN ERROR:'` (incl. register/forgot/reset), writing full error objects to disk unrotated. Cap email length in `validateEmail`; lower the 25mb JSON body limit off the auth routes (only the admin bulk-import needs it). → `server/src/controllers/auth.controller.ts:41,59,108,122,134`, `utils/validate.ts`, `server.ts:24`
- [ ] **Whitelist the `sort` query param on the public paged endpoint** `[low · S]` — `resource.model.ts:186,207` passes `query.sort` straight to `.sort()` unvalidated; `sort=<unindexedField>` on the 222k-row allotments collection forces an in-memory sort past the 32MB limit → unauthenticated 500 DoS. Validate against `schema.fields`, require indexed for large collections. → `server/src/models/resource.model.ts:186,207`, `data.routes.ts:44`

---

## Incomplete / missing features

### Public landing page (explicitly requested — does not exist)

- [ ] **Build a public `/` landing route outside `ProtectedRoute`** `[high · M]` — today `/` → `ProtectedRoute` → `/login` and catch-all `*` → `/login`; a first-time visitor lands cold on a "Welcome back / Sign in" form with zero product explanation before being asked for their NEET rank and Aadhaar. Send authenticated users on to `/dashboard`; change the `*` fallback to a NotFound (authed) / landing (unauthed) page. → `client/src/routes/index.tsx:60,89-96,125`, `login.tsx`, `auth-layout.tsx`

  **Proposed structure** (mobile-first, single self-contained scroll so it works on 3G):
  1. **Hero** — logo + one-line value prop ("Plan your NEET-UG counselling with real cutoff data, not guesswork"), primary CTA "Create free account" → `/signup`, secondary "Sign in" → `/login`.
  2. **Live proof strip** — reuse the existing `PlatformStats` fetch (932 colleges, 6,625 cutoff records, universities) so numbers are real, not invented.
  3. **What you get** — 6 feature cards mirroring the dashboard `FEATURES` array: Rank Predictor, Rank Insights/cutoffs, Fee & Seats, College Reviews, Doc Checklist, Seat Allotment — one line each.
  4. **How it works** — 3 steps: Create account → Add your NEET rank & category → Get a realistic college shortlist.
  5. **Who it's for / coverage** — AIQ + state, MBBS/BDS/AYUSH.
  6. **Trust row** — "Your documents are private", links to **Privacy Policy + Terms** (the compliance blocker), a real contact (email/phone), "Run by Earthling Aid Tech".
  7. **Footer** — same legal links, contact, copyright. Set proper `<title>`/meta for SEO.

  The `auth-layout.tsx` left panel already has good marketing copy ("Navigate Your Medical Career with Confidence") to lift.

### Broken / misleading features

- [ ] **Configure SMTP in prod** `[high · S]` — `mailService.isConfigured()` is false, so password reset, reminders, and admin broadcasts all silently no-op. Populating `env.smtp.*` fixes three features at once (no code change). → prod `.env`
- [ ] **Stop the forgot-password UI from falsely claiming an email was sent** `[high · S]` — `forgot-password.tsx` shows "you will receive a reset link shortly" while nothing sends; a real user is locked out (admin-mediated reset exists as fallback). Either configure SMTP (above) or change the copy. → `client/src/pages/forgot-password.tsx:51-53`, `server/src/services/auth.service.ts:104-124`
- [ ] **Don't report success on the >50-recipient broadcast path when SMTP is off** `[medium · M]` — the background path returns `{accepted:true}` with no `sent` field so the UI shows "Sending in the background…" even though every message is skipped. Gate the UI on an `isConfigured()` endpoint. → `server/src/controllers/broadcast.controller.ts:56-70`, `client/src/pages/admin-students.tsx:721-731`
- [ ] **Add email verification (or a confirm-email field) at signup** `[medium · M]` — no verification exists; a typo'd email + broken reset = permanent unrecoverable lockout, and lets anyone seed junk accounts. → `client/src/pages/signup.tsx`, `server/src/services/auth.service.ts`
- [ ] **Fix or remove the cosmetic per-state counselling dropdown** `[medium · M]` — `counselling-conditions.tsx` offers 36 states but `selectedState` only changes a button label; all states show identical All-India content (there is no per-state content in the DB). Either wire real per-state content or remove the picker on non-quota tabs. → `client/src/pages/counselling-conditions.tsx:32-42,300-334`
- [ ] **Make the dashboard timeline data-driven / admin-editable** `[medium · M]` — `TIMELINE_STEPS` + `CAL_YEAR=2026` are hardcoded in the bundle; on 1 Jan 2027 `stepDone()` returns true for all 8 steps and every "NEET UG 2026" label is wrong. Back it with a `counsellingTimeline` collection; derive year strings from data. → `client/src/pages/dashboard.tsx:104-126,198,364`, `fee-matrix.tsx:265`

### Product / monetization gaps

- [ ] **Decide tiering strategy, then implement plan-gating, then add checkout** `[medium · L]` — plans (free/pro/premium) are manual admin flags that gate **zero** student features (no `requirePlan`, no premium route); free and premium users get byte-identical access. No payment/billing code exists. Decide which features are premium, gate them (server middleware + client), then add Razorpay/Stripe. → `server/src/models/user.model.ts:70`, `client/src/pages/profile.tsx:494-524`
- [ ] **Set the AI LLM key in prod, or label the assistant "limited mode"** `[medium · S]` — no `AI_API_KEY`, so the assistant degrades to canned RAG snippets while the UI presents full streaming conversation. Set `AI_API_KEY`/`AI_API_BASE_URL`/`AI_MODEL` (AI Gateway per house guidance) or show an "offline/limited knowledge" indicator. → `server/src/services/ai.service.ts:170-183`

### UX / trust

- [ ] **Route new signups to `/dashboard` (or a 3-field rank/category/domicile step), not `/rank-insights`** `[medium · M]` — signup and login both dump the user on a dense cutoff table with no nudge toward the profile the app depends on. At minimum show a dismissible "Complete your profile" banner when `isProfileEmpty`. → `client/src/pages/signup.tsx:52`, `login.tsx:32`, `dashboard.tsx`
- [ ] **Add a persistent "estimate, not a guarantee" disclaimer to the predictor + cutoff/fee tables** `[medium · S]` — students make real admission decisions on these; the AI assistant already does this right (`ai-assistant.tsx:692`). → `client/src/pages/rank-predictor.tsx:306-318`, `rank-insights.tsx`, `fee-matrix.tsx`
- [ ] **Add a contact / support surface** `[medium · S]` — no contact page, email, phone, or help link anywhere; with manual plan grants and broken reset email, a stuck student has no in-app way to reach anyone. Add to the dashboard footer, user dropdown, auth screens, and landing footer. → `client/src/components/layout/{dashboard,auth}-layout.tsx`
- [ ] **Add a real NotFound page instead of bouncing everyone to `/login`** `[medium · S]` → `client/src/routes/index.tsx:125`
- [ ] **Reconcile the product name** `[low · S]` — UI says "MedCounsel AI", assistant "MedAssist", domain "MedConsul", DB "medcounsel"; `index.html` `<title>` is still the Vite default "client". Pick one canonical spelling, align domain/repo/DB, fix the tab title. → `client/index.html`, `auth-layout.tsx`, `dashboard-layout.tsx`
- [ ] **Fix minor a11y gaps** `[low · S]` — add a skip-to-content link; remove `tabIndex={-1}` from the password-visibility toggles; run an axe pass on the new landing + auth screens at 360px. → `login.tsx:92`, `signup.tsx:119`

---

## Infra & ops

Backup + Elastic-IP + cert items are in 🔴 above. These are the remaining maturity items.

- [ ] **Add uptime monitoring + alerting** `[high · M]` — zero observability: no Sentry/pino/winston/APM, only a trivial `GET /api/health` nobody polls, and `connectDatabase()` **silently falls back to a JSON file DB** on Mongo failure (serves degraded data with no alert). Add: (a) external uptime monitor on `/api/health` with alert + TLS-expiry check; (b) Sentry/GlitchTip for backend exceptions; (c) disk >85% and `systemd failed` alarms; (d) make `connectDatabase()` failure loud. → `server/src/config/database.ts`, `routes/index.ts`
- [ ] **Add an Express error-handling middleware + request logging** `[medium · S]` — `server.ts` has only a 404 handler; unhandled errors get default handling with no capture. → `server/src/server.ts`
- [ ] **Write a committed `deploy.sh` with release dirs + one-command rollback** `[high · M]` — deploy is a manual rsync of locally-built `dist/` (no git on prod, no CI, no record of the live commit, no rollback, no test gate). Build → stamp git SHA into `/api/health` → rsync to a timestamped release dir → symlink `current` → `systemctl restart` with a health-check gate → keep last N releases. → repo root
- [ ] **Add a minimal GitHub Actions workflow (build + tsc + tests on push)** `[medium · M]` — no `.github/` exists. → `.github/workflows/`
- [ ] **Write a PROD runbook and fix the README** `[medium · S]` — README documents `PORT=5000` + a `server/.env`, but prod runs `PORT=5050` with a **repo-root** `.env` (`load-env.ts` resolves `../../../.env`). Document real ports, env location, service name, restart, cert renewal, backup. → `README.md`, `server/src/config/load-env.ts`
- [ ] **Add a `data/README.md` + single orchestrator for the pipeline** `[medium · L]` — 18 scripts, no README/Makefile; correct run order lives only in private memory. Add a `Makefile`/`build.mjs` that runs fetch→match→merge→reconcile→stage→import and fails loudly on missing input. → `data/`
- [ ] **Move reminder dedup markers into MongoDB + set `Restart=always`** `[medium · M]` — the in-process node-cron scheduler writes plan-expiry idempotency markers to local `db.json` (not Mongo), outside the backup; a redeploy can cause duplicate/dropped "plan expiring" emails. Add a `sentReminders` collection. → `server/src/jobs/scheduler.ts`, `services/reminders.service.ts:39-48`
- [ ] **Add EBS snapshot schedule + rebuild-from-snapshot runbook** `[medium · M]` — single EC2 co-locates nginx + node + Mongo + files + scheduler (SPOF). Daily EBS snapshots + a documented rebuild bound recovery time. → EC2
- [ ] **Guard the test suite so it can't run against prod** `[medium · M]` — `npm test` logs in as the admin default against `API_URL||localhost:5050` and create/promote/delete users with no disposable-DB guard; repointing `API_URL` at prod mutates live data. Require an explicit `TEST_API_URL`/`TEST_DB`, hard-fail if it resolves to prod; ideally `mongodb-memory-server`. → `server/src/test/*.test.ts`

---

## Code quality / tech debt

0 TODO/FIXME in the tree — the debt is structural, not scattered.

- [ ] **Move chat sessions from the flat-file JSON store into Mongo** `[medium · M]` — every `addMessage()`/stream completion rewrites the **entire** `db.json` (which also holds user records) — O(total-data) I/O per message and a crash mid-write can truncate the user store. → `server/src/services/ai.service.ts:262-271,316,367`
- [ ] **Compute RAG context once per chat message** `[medium · S]` — in no-API-key mode, every message runs the full `buildContextPrompt()` twice and discards half. → `server/src/services/ai.service.ts:358,59,177`
- [ ] **Fix or remove the frozen hardcoded RAG snapshot** `[medium · M]` — `retriever.ts` embeds ~18 colleges + a 14-row knowledgeBase used when Mongo is down; a 2025 snapshot that silently drifts from the live DB. → `server/src/services/rag/retriever.ts:50-364`
- [ ] **Emit structured RAG chunks instead of pipe-delimited string parsing** `[low · M]` → `server/src/services/ai.service.ts:122-132,242-254`, `retriever.ts:177`
- [ ] **Log the `useFacets` fetch failure** `[low · S]` — a facet-endpoint failure yields a permanently empty dropdown with no error surfaced. → `client/src/lib/data-api.ts:129-133`
- [ ] **Untrack the 3 committed `.pyc` files + add `__pycache__/` to `.gitignore`** `[low · S]` — `git rm -r --cached data/__pycache__`. → `.gitignore`, `data/__pycache__/`

---

## Suggested order of work

**Phase 0 — stop the bleeding (hours, do today, before anything else):**
1. Rotate the prod admin password (the default is live). `[S]`
2. Revoke the Resend API key in the dashboard — assume compromised. `[S]`
3. Rotate `JWT_SECRET` + `JWT_REFRESH_SECRET` (invalidates the leaked, still-valid refresh tokens). `[S]`
4. Make the GitHub repo private. `[S]`
5. Add rate limiting + `helmet` on `/api/auth/*`. `[S]`

**Phase 1 — close the compliance + data-loss window (1–2 days):**
6. Fix `.gitignore`, then purge `data/backup/**` + the default password + the Resend key from git history; force-push; delete `CREDENTIALS.md`. `[M]`
7. Stand up the nightly offsite S3 backup + weekly restore-test. `[M]`
8. Publish Privacy Policy + Terms + signup consent checkbox + upload notice. `[M]`
9. Force a password reset for the 4 real users; confirm HTTPS-enforce, Elastic IP, and certbot renewal. `[S]`
10. Configure SMTP (fixes reset email + reminders + broadcasts in one shot) and stop the false "email sent" message. `[S]`
11. Enable MongoDB auth; remove JWT fallback secrets (fail-fast). `[S]`
12. Guard the test suite against prod. `[M]`

**Phase 2 — make it observable and deployable (2–3 days):**
13. Uptime monitor + Sentry + disk/service alarms; make DB-connect failure loud. `[M]`
14. Committed `deploy.sh` with release dirs + rollback; minimal CI; PROD runbook + README fix. `[M]`
15. EBS snapshots + rebuild runbook. `[M]`

**Phase 3 — product honesty (the landing page + trust, ~1 week):**
16. Build the public landing page (structure above), NotFound page, contact surface. `[M]`
17. Predictor/cutoff disclaimers; onboarding redirect; fix/remove the cosmetic state dropdown and the hardcoded 2026 timeline. `[M]`
18. Surface "data not yet available" states for uncovered fees/allotments. `[S]`

**Phase 4 — data completeness (ongoing, highest product value):**
19. Regenerate `out/*.json` from the live DB; normalise states; canonicalise duplicate clusters via aliases. `[M]`
20. Work the 213 quarantined fees + top unlinked allotment clusters; then ingest fees for the top-enrolment states. `[L]`
21. Delete dead mock files; move chat sessions to Mongo; de-dup the RAG snapshot; document the pipeline. `[M]`

**Phase 5 — monetization (only after the above):**
22. Decide tiering, implement plan-gating, then add a payment flow. `[L]`
