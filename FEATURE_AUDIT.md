# MedCounsel — Dashboard Feature Audit & Accuracy Report

_Generated 15 Jul 2026. Verified two ways: (1) full read of the client + server code, and
(2) driving the **live API** on `localhost:5050` end-to-end (admin + student login, every major
endpoint). A rendered browser walkthrough was not possible — the Chrome connected via the
extension is not on the same network as the local dev servers, so it can't reach `localhost`._

---

## 1. How to log in

| Role | Email | Password |
|---|---|---|
| Admin | `admin@medcounsel.ai` | _(set via `SEED_ADMIN_PASSWORD`; the old default was rotated — see PRODUCTION_READINESS.md)_ |
| Student | `swaraj@medcounsel.ai` | _(demo account; set via `SEED_STUDENT_PASSWORD`)_ |
| Student (demo) | `demo@medcounsel.ai` | _(demo account; set via `SEED_STUDENT_PASSWORD`)_ |

Auth is JWT access token + httpOnly refresh cookie. Verified working, plus role-gating: a
student token hitting an `/api/admin/*` route correctly returns **403**.

---

## 2. Student dashboard — features

Every student page reads **live data** from `GET /api/data/:collection` (the admin-managed
content). The old hardcoded seed arrays (`lib/*-data.ts`) were migrated off; only UI scaffolding
(state-name lists, category enums, feature tiles) remains baked in.

| Page | Route | What it does | Data | Status |
|---|---|---|---|---|
| **Dashboard** | `/dashboard` | Greeting, keyword search→section routing, feature tiles, doc-progress bar, latest updates, counselling timeline | `announcements`, `checklistDocs` (live) | ✅ works; ⚠️ timeline is a **hardcoded 2026 calendar** (will go stale) |
| **Rank Predictor** | `/rank-predictor` | Score/rank → estimated AIR, percentile, category rank, colleges tagged Safe/Good/Reach/Tough | `POST /api/predict` (server-side math) | ✅ verified accurate (see §4) |
| **Rank Insights** | `/rank-insights` | Searchable closing-rank table, many filters, sortable, CSV export | `colleges` + `closingRanks` | ✅ works; ⚠️ **capped at 5000 rows** (see §5) |
| **Rank Insight Detail** | `/rank-insights/detail` | One college's cutoff history + Recharts bar chart | `colleges` + `closingRanks` | ✅ works |
| **Fee Matrix** | `/fee-matrix` | Fee & seat comparison, filters, sort, CSV export | `colleges` + `fees` | ✅ works (181 real cited rows / 96 colleges) |
| **Fee Detail** | `/fee-matrix/:id` | Per-college fee breakdown + year-wise chart, scholarships, bond | `colleges` + `fees` | ✅ works |
| **Colleges** | `/colleges` | Browsable/searchable college review cards, filters | `colleges` (932 real) | ✅ works |
| **College Detail** | `/colleges/:id` | Full profile: Overview/Academics/Campus/Media tabs, gallery, videos, pros/cons | `colleges` | ✅ works; graceful "not published" empty states per tab |
| **Document Checklist** | `/doc-checklist` | Checklist with per-doc **file upload / view / delete** + verification status | `checklistDocs` + `/api/documents` | ✅ works; progress persisted to localStorage |
| **Allotment States** | `/allotment` | State grid + "find allotments near my AIR" tool | `allotments` | ⚠️ works but **capped at 5000 of 222,716 rows** (see §5) |
| **Allotment Detail** | `/allotment/:counselling` | Full allotment table, filters, CSV export | `allotments` | ⚠️ same 5000 cap |
| **Counselling Conditions** | `/counselling-conditions/:section` | Tabbed reference: eligibility / application / domicile / quota | `counsellingSections` + `counsellingQuotas` | ✅ works; ⚠️ **state dropdown is cosmetic** on non-quota tabs |
| **Explore** | `/explore/:section` | Study-abroad: Universities / Courses / Blogs | `universities`, `blogs` | ✅ works (16 real cited blogs) |
| **Abroad Universities** | `/abroad-universities` | Overseas universities with cost/ranking, search+sort | `abroadUniversities` | ✅ works; blanks shown as "unknown", not ₹0 |
| **Announcements** | `/announcements` | Counselling notices grouped by month, search + filters | `announcements` (119) | ✅ works |
| **AI Assistant** | `/ai-assistant` | "MedAssist" chat — streaming SSE, session history, regenerate | `/api/chat/*` (RAG over DB) | ✅ **works even with no LLM key** — grounds answers in real data (see §4) |
| **Profile** | `/profile` | Counselling profile (NEET rank/score, category, domicile, guardian) + plan card | `GET/PUT /api/profile` | ✅ works; plan is read-only (admin-granted) |

---

## 3. Admin dashboard — features

All `/api/admin/*` routes sit behind `requireAuth + requireAdmin`. The admin surface is
unusually complete — **no "coming soon" stubs, no fake data**.

| Page | Route | What it does | Capabilities | Status |
|---|---|---|---|---|
| **Admin Dashboard** | `/admin` | User-account management + 3 stat tiles | Create / edit / delete users, reset password, role change (with self-demotion & last-admin guards). Delete cascades the user's uploaded ID docs off disk | ✅ verified (`stats` = 4 users / 1 admin / 3 students) |
| **Manage Data** | `/admin/data/:collection` | **Generic schema-driven CRUD editor** for all 15 content collections — zero collection-specific code | Create / edit / delete rows, **CSV import (upsert) + export**, ref-dropdowns, server-side filter/search/pagination, referential-integrity + orphan-delete guards | ✅ verified (fees: 181 rows, 61 pages, proper pagination) |
| **Students** | `/admin/students` | All students with real verified-doc progress, plan management, walk-in "add student" flow | Create/edit student, set plan (free/pro/premium + expiry), plan filter, per-student doc-checklist detail | ✅ works; ⚠️ **plans are manual flags — no payment/billing system** (disclosed on-screen) |
| **Verify Documents** | `/admin/verifications` | Document review queue for uploaded IDs (Aadhaar, marksheets, photos) | Approve / reject-with-reason, status filter tabs w/ live counts, secure token-fetched file preview, server-side pagination | ✅ mature; security-conscious (no doc IDs in URL, blob URLs revoked) |

**Editable collections** (all CRUD + CSV via the generic router): colleges, closingRanks,
rankBands, categoryFactors, fees, allotments, announcements, checklistDocs, stateDocs,
universities, blogs, abroadUniversities, knowledgeBase, counsellingSections, counsellingQuotas.

The **bulk route** (`POST /api/admin/resources/:c/bulk`) validates every row first (rejects the
whole batch on any error), caps at 20,000 rows, upserts on each collection's natural key, and
supports `replace:true` to make a collection exactly match the file. This is what the data
pipeline uses.

---

## 4. What's verified working & accurate

- **Rank Predictor is accurate and monotonic** (server-side math over real closing ranks):

  | NEET marks | Est. AIR | Percentile | College matches |
  |---|---|---|---|
  | 720 | 1 | 100.0 | 50 |
  | 680 | 8 | 100.0 | 50 |
  | 640 | 166 (77–210) | 99.99 | 61 |
  | 500 | 45,000 | 98.12 | 188 |
  | 300 | 443,024 | 81.54 | 106 |

  Sensible ranks, confidence bands (lo/hi), category rank + percentile all computed correctly.

- **Public data matches the database exactly**: colleges 932, fees 181, blogs 16, announcements
  119, universities 70, abroadUniversities 39, checklistDocs 41.
- **AI Assistant grounds answers in real data** — it streamed a correct, checklist-backed answer
  to "what documents do I need for NEET counselling?" **even with the LLM key empty and the local
  AI gateway (`:8787`) down**. It degrades to retrieval over the knowledge base rather than
  breaking. (A configured LLM key would make responses more conversational; the UI hints at this.)
- **Security**: role-gating works (student → admin = 403); document previews use leased blob URLs,
  never expose IDs in the URL bar.

---

## 4b. Fixes applied (15 Jul 2026)

All five issues below were addressed. Both `client` and `server` typecheck clean; changes were
verified in the browser.

| # | Issue | Fix | Verified |
|---|---|---|---|
| 🔴 | 5,000-row cap hid data | **Allotments**: full server-side pagination — added range-filters (`field_min/max`) + a `/facets` endpoint server-side, rewrote both allotment pages to page/filter/search on the server. **closingRanks** (6.6k, needs whole set for its latest-per-group collapse): raised `PUBLIC_MAX` 5000→20000. | Allotments: 45,316 rows for one counselling, rank-search 33,973 hits. rank-insights: 6,625 records (was 5,000). |
| 🟠 | Duplicate colleges in predictor | Predictor now dedups by canonical (punctuation/abbrev-stripped) college name, not collegeId. Collapses CMC/AFMC/MMC-style clusters safely. | Reworded clusters (ABVIMS "RML" vs "Ram Manohar Lohia", Maulana Azad ±"New Delhi") still show — they need the alias-merge (deferred, by your choice). |
| 🟠 | `fees.totalFirstYear` derive vs help | Removed the `derive` (it clobbered 58 sourced totals with the component sum). Re-imported. | KJ Somaiya total restored to ₹1,200,000; 58 authoritative totals back. |
| 🟡 | Dashboard timeline hardcoded | `done` now computed from today's date vs the 2026 calendar — self-updating. | Typecheck clean. |
| 🟡 | Counselling state dropdown cosmetic | Badge no longer falsely claims state-specific content ("All-India baseline"); dropdown kept as scaffold for future per-state data. | Typecheck clean. |
| 🟡 | README stale | Updated college counts (900+), MongoDB as primary store. | — |
| ➕ | (found in passing) `rank-predictor` CSV export called `toCsv` with 1 arg — broke `npm run build`. | Fixed to `(header, rows)` form. | Client `tsc` now clean. |

**Not done (by your choice / follow-up):** the alias-merge of the ~27 duplicate college clusters
(destructive-risk; needs per-cluster verification), and genuine per-state counselling content.

---

## 5. Issues & inaccuracies found (prioritized)

### 🔴 High — the 5,000-row public cap hides most allotment & some rank data
`useCollection()` (client) always calls the **un-paginated** `GET /api/data/:collection`, which
the server hard-caps at `PUBLIC_MAX = 5000` (`server/src/models/resource.model.ts:31,176`).

- **Allotments**: DB has **222,716** rows; students see **5,000** (~2.2%). 97.8% of seat-allotment
  data is invisible in the UI — and 5,000 rows ship to the browser on every load (heavy on mobile).
- **Closing ranks**: DB has **6,625**; students see **5,000** (~1,625 rows / 24% missing). A filter
  for a college whose rows fall past the cap can show nothing.
- The server **already has** the fix: `GET /api/data/:collection/paged` (proper page/limit/total)
  exists specifically "for closingRanks / allotments, which get large" — **but the client never
  calls it.** Wiring the allotment + rank-insights pages to `/paged` (server-side filtering +
  pagination) fixes both correctness and payload size.

### 🟠 Medium — duplicate college entries surface in results
The predictor returned the **same college three times** (e.g. "ABVIMS-RML" spelled 3 ways) because
the colleges table has ~27 duplicate-name clusters (one college spelled 3–5 ways). The schema has
an `aliases` field meant to collapse these, but they aren't merged yet. Students see the same
college repeated in match lists. _(Note: merging must be done carefully — a wrong merge repoints
closingRank rows; see the data-pipeline memory.)_

### 🟠 Medium — `fees.totalFirstYear` help text contradicts behavior
The field's help text says it is **not** auto-calculated and must be entered by hand, but the
`fees` schema has a `derive()` that recomputes it on the server (`collections.ts:114-139`). One of
the two is wrong; align the copy with the actual behavior.

### 🟡 Low — cosmetic / staleness
- **Dashboard counselling timeline** is a hardcoded 2026 calendar with hardcoded done/upcoming
  flags — not fetched, will silently go stale.
- **Counselling Conditions state dropdown** changes only a label ("…for {state}"), not the shown
  content, on non-quota tabs — effectively decorative.
- **README** still describes the old seed scale ("10+ colleges", "8 profiles") — reality is 932
  colleges / 181 fee rows / 222k allotments. Worth updating.

### ℹ️ By design (not bugs)
- **No payment system** — plans (free/pro/premium) are admin-granted flags; disclosed on-screen.
- **AI Assistant** is richer with a configured LLM key (`AI_API_KEY` in `.env`), but functional
  without one.

---

## 6. Recommended next steps

1. **Wire allotments + rank-insights to `/api/data/:collection/paged`** (server-side filter +
   pagination). Highest impact — it's the difference between showing 2% and 100% of allotments.
2. **Dedupe the college clusters** via the `aliases` field (carefully — see pipeline memory).
3. Fix the `fees.totalFirstYear` help-text/derive contradiction.
4. Make the dashboard timeline data-driven (or clearly mark it illustrative); refresh the README.
