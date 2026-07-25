/**
 * Enrich colleges with photos, and the curated flagship set with sourced fees.
 *
 *   npx tsx scripts/enrich-colleges.ts [--dry]
 *
 * What it does (idempotent — safe to re-run):
 *   1. PHOTOS for every college — sets `thumbnail` + a one-image `gallery`:
 *        • a real Wikimedia campus photo where we have one (REAL_PHOTOS), else
 *        • a deterministic generic medical-campus stock photo (STOCK_PHOTOS), chosen by id
 *          so the same college always gets the same cover across re-imports.
 *      It will NOT overwrite a thumbnail a college already has (e.g. hand-curated ones).
 *   2. FEES for the curated flagship colleges — upserts sourced MBBS fee rows into the `fees`
 *      collection (natural key collegeId+course+category+quota, so re-running updates in place)
 *      and sets the college's `annualFees` display string.
 *
 * It writes straight to MongoDB via the same resource model the admin API uses. It never
 * deletes, and it leaves the ~790 non-curated colleges' fees untouched (we don't fabricate fees).
 */
import { connectDatabase, isMongoConnected } from '../server/src/config/database';
import { getSchema } from '../server/src/schema/collections';
import { resource } from '../server/src/models/resource.model';
import { REAL_PHOTOS, STOCK_PHOTOS, STOCK_CAPTION, CURATED_FEES } from './data/college-enrichment';

const DRY = process.argv.includes('--dry');

/** Stable string hash → non-negative int, for deterministic stock-photo assignment. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Run async work over items with limited concurrency (findByIdAndUpdate × 820 otherwise floods). */
async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

async function main() {
  await connectDatabase();
  if (!isMongoConnected()) {
    console.error('\n  MongoDB is not connected — set MONGODB_URI in the repo-root .env and try again.\n');
    process.exit(1);
  }

  const collegesSchema = getSchema('colleges');
  const feesSchema = getSchema('fees');
  if (!collegesSchema || !feesSchema) { console.error('  schema not found'); process.exit(1); }

  const collegesRes = resource(collegesSchema);
  const feesRes = resource(feesSchema);

  const colleges = await collegesRes.all();
  console.log(`\n  ${colleges.length} colleges loaded.${DRY ? '  [DRY RUN — no writes]' : ''}\n`);

  // ── 1. Photos for every college ──
  let real = 0, stock = 0, skipped = 0;
  await pool(colleges, 25, async (c: any) => {
    if (c.thumbnail) { skipped++; return; }          // respect an existing/curated cover
    const realUrl = REAL_PHOTOS[c.id];
    const url = realUrl || STOCK_PHOTOS[hash(c.id) % STOCK_PHOTOS.length];
    const caption = realUrl ? `${c.name} — campus` : STOCK_CAPTION;
    if (realUrl) real++; else stock++;
    if (DRY) return;
    await collegesRes.update(c.id, { thumbnail: url, gallery: [{ url, caption }] });
  });
  console.log(`  Photos:  ${real} real (Wikimedia) · ${stock} stock · ${skipped} skipped (already had one)`);

  // ── 2. Curated fees + annualFees ──
  let feeRows = 0, feeCreated = 0, feeUpdated = 0, curatedApplied = 0, missing = 0;
  const byId = new Map(colleges.map((c: any) => [c.id, c]));

  for (const cur of CURATED_FEES) {
    if (!byId.has(cur.id)) { console.warn(`  [warn] curated id not found: ${cur.name} (${cur.id})`); missing++; continue; }
    curatedApplied++;

    const rows = cur.fees.map((f) => ({
      collegeId: cur.id,
      course: f.course || 'MBBS',
      category: f.category,
      quota: f.quota,
      tuitionFee: f.tuitionFee,
      ...(f.totalFirstYear != null ? { totalFirstYear: f.totalFirstYear } : {}),
      ...(f.hostelFee != null ? { hostelFee: f.hostelFee } : {}),
      ...(f.note ? { scholarships: [] } : {}),   // keep shape stable; note lives in data file only
    }));
    feeRows += rows.length;

    if (DRY) continue;
    const res = await feesRes.importMany(rows, { replace: false });
    feeCreated += res.created; feeUpdated += res.updated;
    await collegesRes.update(cur.id, { annualFees: cur.annualFees, ...(cur.courses ? { coursesOffered: cur.courses } : {}) });
  }
  console.log(`  Fees:    ${curatedApplied} curated colleges · ${feeRows} rows (${feeCreated} created, ${feeUpdated} updated)${missing ? ` · ${missing} missing` : ''}`);

  console.log('\n  Done.\n');
  process.exit(0);   // all writes are awaited above; exiting tears down the Mongo connection
}

main().catch((e) => {
  console.error('\n  Enrichment failed:', e?.message || e, '\n');
  process.exit(1);
});
