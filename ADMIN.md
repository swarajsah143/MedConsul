# Admin-managed data

Every piece of domain data in MedCounsel is now stored in MongoDB and editable by an
admin at **`/admin/data`**. The app and the chatbot both read from it, so an edit shows
up in both.

Before this, the data lived in three disconnected places: hardcoded arrays in the
client bundle, a *second* hardcoded copy inside the RAG retriever, and — for
allotments — a random number generator that invented rows at runtime.

## How it works

There is **one source of truth**: `server/src/schema/collections.ts`. Each collection is
described once as a list of fields, and that single description drives:

| | generated from the schema |
|---|---|
| Mongoose model + indexes | `server/src/models/resource.model.ts` |
| Validation + type coercion | `server/src/schema/validate.ts` |
| Admin CRUD API | `server/src/routes/admin.resources.routes.ts` |
| Public read API | `server/src/routes/data.routes.ts` |
| Chatbot retrieval | `server/src/services/rag/db-sources.ts` |
| Admin table, form, CSV import | the client fetches `/api/admin/schema` and renders from it |

**Adding a new admin-managed collection is one edit**: append a `CollectionSchema` to
`COLLECTIONS` in `collections.ts`. It immediately gets a Mongo collection, CRUD
endpoints, a public read endpoint, an admin table with filters/search/pagination, an
edit form, CSV import/export, and a card on `/admin/data`. No client change.

## Collections

| Collection | Rows migrated | Notes |
|---|---|---|
| `colleges` | 29 | **Canonical.** Ranks, fees and allotments reference it by `collegeId`. |
| `closingRanks` | 279 | |
| `fees` | 65 | |
| `allotments` | **0** | Deliberately empty — see below. |
| `announcements` | 94 | |
| `checklistDocs` | 32 | |
| `stateDocs` | 14 | |
| `universities` | 53 | Explore tab |
| `blogs` | 12 | Every one had `url: '#'`; stored as empty, needs real links |
| `abroadUniversities` | 18 | |
| `knowledgeBase` | 14 | Chatbot-only prose. Not public. Had no admin surface at all before. |

## Two things worth knowing

**Colleges are now canonical.** They used to exist in five files under five unrelated id
schemes (`college-1`, `col-aiims`, `fee-1`, `u1`, a bare int), joined only by display
names that didn't match each other — `"AIIMS, New Delhi"` vs `"All India Institute of
Medical Sciences (AIIMS), New Delhi"`. Renaming a college silently orphaned its fee rows.
The migration fuzzy-matched them into one table and recorded the old names as `aliases`.
It also found a genuine duplicate in the source data (`college-18` and `college-26` were
both "Government Medical College, Thiruvananthapuram") and collapsed it.

**Allotments are empty on purpose.** The old `allotment-data.ts` did not contain data — it
was a seeded PRNG (`seededRandom`, `generateAllotments`) that fabricated ranks, scores and
institute assignments at page load. Students would have read those as real published
results. The generator is deleted. Load real rows via CSV at
`/admin/data/allotments`; until then the page says so honestly.

## Running it

MongoDB is **required** for domain data (auth still falls back to the JSON store):

```bash
MONGODB_URI=mongodb://localhost:27017/medcounsel   # in the repo-root .env
npm run dev
```

Without Mongo, `/api/admin/resources/*` and `/api/data/*` return **503** rather than
hanging for Mongoose's 10s buffer timeout, and the chatbot falls back to its frozen
hardcoded snapshot.

### Migrating the old static data

```bash
npx tsx scripts/migrate-to-db.ts            # dry run first: --dry
npx tsx scripts/migrate-to-db.ts --replace  # wipe + reimport
```

It pushes through the real admin HTTP API, so every row passes the same validation the
admin form uses. It prints the full college-reconciliation report — every alias match with
its confidence score, and every college it had to create — so the joins can be eyeballed
rather than trusted blindly.

## CSV import

`/admin/data/<collection>` → **Import CSV**. Headers may be either the field `name` or its
`label`. `string[]` / `enum[]` columns split on `|`; `object[]` columns take JSON. Download
a template from the same screen.

Import is **all-or-nothing**: if any row fails validation, nothing is written and you get
`row N, column X: message` for each failure. A half-imported CSV is worse than a rejected one.
