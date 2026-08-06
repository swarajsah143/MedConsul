#!/usr/bin/env node
/**
 * Import the two downloaded fee sheets into `fees`.
 *
 *   node scripts/import-fee-sheets.mjs                 # DRY RUN (default)
 *   node scripts/import-fee-sheets.mjs --confirm
 *   node scripts/import-fee-sheets.mjs --govt <path> --course <path>
 *
 * TWO SHEETS, TWO DIFFERENT QUANTITIES — do not merge them.
 *
 * 1. govt_mbbs_fees_2026.json — annual-ish government fees, carries `state`.
 *    Measured against the 181 rows we sourced from statutory orders (Kerala FRC, KEA, FRA, state
 *    GOs), it agrees on only 5 of 86 overlapping colleges: median 1.56x, p75 2.79x, p90 4.11x.
 *    That is not a unit conversion, it is a different and less reliable number. So it is
 *    **GAP-FILL ONLY**: a row is written only when the college has NO fee row at all, and it is
 *    stamped as aggregator data. A statutory figure is never overwritten.
 *
 * 2. mbbs_colleges_tuition_fees.json — WHOLE-COURSE cost ("42.5 Lakhs", "1.22 Crore"; its own
 *    fee_type column says "Total Fees", and its AIIMS rows carry the well-known ~5,856 course
 *    total). This is NOT annual tuition — loading it into `tuitionFee` would overstate a family's
 *    first year by roughly 4.5x. It goes into the dedicated `totalCourseFee` field, and only onto
 *    colleges we can match; it never invents a `tuitionFee`.
 *
 * MATCHING follows the traps documented in the medconsul-data-gaps memory:
 *   - gate on STATE where the sheet provides one (sheet 1 does, sheet 2 does not)
 *   - never match a MEDICAL college to a DENTAL one, or vice versa
 *   - a college whose name reduces to a single token (a bare city) may match ONLY by exact
 *     fingerprint, never fuzzily — this is the BGS/BMCRI bug that put private fees on a
 *     government college
 *   - decline on a tie rather than guess; unresolved rows are reported, not forced
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { connectDatabase, isMongoConnected, connection } from '../server/src/config/database';

const CONFIRM = process.argv.includes('--confirm');
const arg = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const GOVT = arg('--govt', `${process.env.HOME}/Downloads/govt_mbbs_fees_2026.json`);
const COURSE = arg('--course', `${process.env.HOME}/Downloads/mbbs_colleges_tuition_fees.json`);

const GOVT_SOURCE = 'govt-mbbs-fees-2026 (aggregator)';
const COURSE_SOURCE = 'mbbs-tuition-sheet (aggregator, whole-course)';

const STOP = new Set([
  'college', 'medical', 'sciences', 'science', 'institute', 'inst', 'of', 'and', 'the', 'hospital',
  'res', 'research', 'centre', 'center', 'university', 'univ', 'academy', 'new', 'dr', 'shri',
  'sri', 'govt', 'government', 'deemed', 'uni', 'med', 'foundation', 'for',
]);

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s) => norm(s).split(' ').filter((t) => t && !STOP.has(t));
/** DENTAL is never stopworded — it is the only token separating siblings on one campus. */
const kindOf = (s) => (/dental|dentistry|\bbds\b/i.test(s || '') ? 'dental' : 'medical');
const fingerprint = (s) => tokens(s).slice().sort().join(' ');

/** Coverage of the shorter token set — sheet names abbreviate differently from ours. */
function score(a, b) {
  if (!a.length || !b.length) return 0;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  let hit = 0;
  for (const t of short) {
    if (long.includes(t)) { hit++; continue; }
    if (long.some((u) => u.length > 3 && t.length > 3 && (u.startsWith(t.slice(0, 4)) || t.startsWith(u.slice(0, 4))))) hit += 0.85;
  }
  return hit / short.length;
}

/** "42.5 Lakhs" | "1.22 Crore" | "5,856" -> rupees. Returns null when not confidently parseable. */
function parseFee(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const num = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(num) || num <= 0) return null;
  if (/crore/i.test(s)) return Math.round(num * 10_000_000);
  if (/lakh/i.test(s)) return Math.round(num * 100_000);
  const plain = Number(s.replace(/[^0-9]/g, ''));
  return Number.isFinite(plain) && plain > 0 ? plain : null;
}

async function main() {
  await connectDatabase();
  if (!isMongoConnected()) {
    console.error('\n  MongoDB is not connected — set MONGODB_URI in the repo-root .env.\n');
    process.exit(1);
  }
  const colleges = connection.collection('colleges');
  const fees = connection.collection('fees');

  const all = await colleges.find({}, { projection: { name: 1, state: 1, city: 1, type: 1 } }).toArray();
  const haveFee = new Set((await fees.distinct('collegeId')).map(String));

  // `fees` has a UNIQUE index on the natural key. Two sheet rows can resolve to the same college
  // (duplicate clusters fan out, and the two sheets overlap), so stage against a key set instead
  // of discovering the collision as an E11000 mid-insert — which aborts the rest of the batch.
  // Seeding it from the DB is also what makes a re-run a no-op.
  const NAT = ['collegeId', 'course', 'category', 'quota'];
  const keyOf = (r) => NAT.map((k) => String(r[k])).join('|');
  const takenKeys = new Set(
    (await fees.find({}, { projection: Object.fromEntries(NAT.map((k) => [k, 1])) }).toArray()).map(keyOf),
  );
  /** Claim a natural key; false means it is already taken (in the DB or earlier in this run). */
  const claim = (row) => {
    const k = keyOf(row);
    if (takenKeys.has(k)) return false;
    takenKeys.add(k);
    return true;
  };

  const byState = new Map();
  const byFingerprint = new Map();
  for (const c of all) {
    const k = norm(c.state);
    if (!byState.has(k)) byState.set(k, []);
    byState.get(k).push(c);
    const fp = fingerprint(c.name);
    if (!byFingerprint.has(fp)) byFingerprint.set(fp, []);
    byFingerprint.get(fp).push(c);
  }

  /**
   * Resolve a sheet row to the college(s) it means. Returns an ARRAY, because the colleges table
   * carries ~27 duplicate clusters (one institution spelled several ways — "Lady Hardinge Medical
   * College (LHMC)" / "... (LHMC), New Delhi" / "... for Women, New Delhi"). Writing the fee to
   * only one of them leaves the other spelling's page showing no fee at all, so a tie between
   * docs that are plainly the SAME institution fans out to all of them. A tie between genuinely
   * different institutions still declines.
   *
   * `state` gates when the sheet provides one; `city` disambiguates when it does not — the course
   * sheet lists ~15 AIIMS campuses under the identical name "All India Institute of Medical
   * Sciences - [AIIMS]", where the city is the only thing telling Patna from Bathinda.
   */
  function resolve(name, state, city, requireCity = false) {
    const nt = tokens(name);
    const kind = kindOf(name);

    // Narrow by state when the sheet gives one; never by city — our `city` is blank or spelled
    // differently often enough that filtering on it LOSES more matches than it disambiguates
    // (it cost 32 net matches when tried). City is used only to break ties, below.
    let pool = state ? (byState.get(norm(state)) || []) : all;
    pool = pool.filter((c) => kindOf(c.name) === kind);

    const inCity = (c) => city && (norm(c.city) === norm(city) || norm(c.name).includes(norm(city)));

    // When the sheet has no STATE to gate on, a generic name is dangerous: "DY Patil University"
    // exists in Navi Mumbai, Kolhapur AND Pune, and fuzzy score alone put the Navi Mumbai row's
    // 5.51 Crore onto the Pune college. Requiring the city to agree is the only gate available.
    if (requireCity) {
      if (!city) return [];
      pool = pool.filter(inCity);
      if (!pool.length) return [];
    }

    const fp = fingerprint(name);
    const exact = pool.filter((c) => fingerprint(c.name) === fp);
    if (exact.length) {
      // Identical names across campuses (the ~15 "All India Institute of Medical Sciences -
      // [AIIMS]" rows) are separated only by city.
      const cityHits = exact.filter(inCity);
      return cityHits.length ? cityHits : exact;
    }

    // Bare-city names (one token after stopwords) may match ONLY by exact fingerprint above —
    // this is the BGS/BMCRI bug, where "Bangalore" scored 1.0 against any Bangalore college.
    if (nt.length <= 1) return [];

    const ranked = pool
      .map((c) => ({ c, s: score(nt, tokens(c.name)) }))
      .filter((r) => r.s >= 0.8)
      .sort((a, b) => b.s - a.s);
    if (!ranked.length) return [];

    let top = ranked.filter((r) => r.s === ranked[0].s).map((r) => r.c);
    if (top.length === 1) return top;

    // Tie-break on city first — this is what separates same-named campuses.
    const cityHits = top.filter(inCity);
    if (cityHits.length) top = cityHits;
    if (top.length === 1) return top;

    // Still tied: same institution spelled differently, or different institutions? Same state +
    // same city + same kind means the former — fan out so every spelling's page shows the fee.
    // Anything else is a real ambiguity: decline rather than guess.
    const sameState = new Set(top.map((c) => norm(c.state))).size === 1;
    const sameCity = new Set(top.map((c) => norm(c.city))).size === 1;
    return sameState && sameCity ? top : [];
  }

  // ── sheet 1: government fees, GAP-FILL ONLY ───────────────────────────────
  const govt = JSON.parse(readFileSync(GOVT, 'utf8'));
  const govtRows = [];
  const govtSkipped = { noFee: 0, alreadyHasFee: 0, unresolved: [] };
  for (const r of govt) {
    const fee = parseFee(r.fee);
    if (!fee) { govtSkipped.noFee++; continue; }
    const matches = resolve(r.college, r.state, null);
    if (!matches.length) { govtSkipped.unresolved.push(r.college); continue; }
    for (const c of matches) {
      if (haveFee.has(String(c._id))) { govtSkipped.alreadyHasFee++; continue; }
      const row = {
        collegeId: String(c._id), course: 'MBBS', category: 'General',
        quota: 'All India Quota (AIQ)', tuitionFee: fee, source: GOVT_SOURCE,
      };
      if (claim(row)) govtRows.push(row);
    }
  }

  // ── sheet 2: whole-course cost -> totalCourseFee ──────────────────────────
  const course = JSON.parse(readFileSync(COURSE, 'utf8'));
  const courseUpdates = [];
  const courseInserts = [];
  const courseSkipped = { noFee: 0, contradicts: 0, unresolved: [] };
  for (const r of course) {
    const fee = parseFee(r.tuition_fee);
    if (!fee) { courseSkipped.noFee++; continue; }
    // No state on this sheet, so the city is the ONLY gate — required, not just a tie-break.
    const matches = resolve(r.college_name, null, r.city, true);
    if (!matches.length) { courseSkipped.unresolved.push(`${r.college_name} | ${r.city}`); continue; }
    for (const c of matches) {
      // Prefer attaching the course total to a row that already exists for this college — the
      // whole-course figure belongs alongside the annual one, not on a parallel stub row.
      const existing = await fees.findOne({ collegeId: String(c._id), course: 'MBBS' }, { projection: { _id: 1, tuitionFee: 1 } });
      if (existing) {
        // A whole-course total below one year's tuition is impossible. When the sheet contradicts
        // a fee we already hold, the sheet is the weaker source — drop its value rather than
        // publish a self-contradictory pair.
        if (existing.tuitionFee > 0 && fee < existing.tuitionFee) { courseSkipped.contradicts++; continue; }
        courseUpdates.push({ _id: existing._id, totalCourseFee: fee });
        continue;
      }
      const row = {
        collegeId: String(c._id), course: 'MBBS', category: 'General',
        quota: 'All India Quota (AIQ)', tuitionFee: 0, totalCourseFee: fee, source: COURSE_SOURCE,
      };
      if (claim(row)) courseInserts.push(row);
    }
  }

  console.log(`\n  ── govt_mbbs_fees_2026 (${govt.length} rows) — GAP-FILL ONLY ──`);
  console.log(`     new fee rows for colleges with none : ${govtRows.length}`);
  console.log(`     skipped, college already has a fee  : ${govtSkipped.alreadyHasFee}  (statutory data protected)`);
  console.log(`     skipped, unparseable fee            : ${govtSkipped.noFee}`);
  console.log(`     could not resolve to a college      : ${govtSkipped.unresolved.length}`);

  console.log(`\n  ── mbbs_colleges_tuition_fees (${course.length} rows) — WHOLE-COURSE ──`);
  console.log(`     totalCourseFee set on existing rows : ${courseUpdates.length}`);
  console.log(`     new rows (no fee row existed)       : ${courseInserts.length}`);
  console.log(`     skipped, unparseable fee            : ${courseSkipped.noFee}`);
  console.log(`     dropped, contradicts a held fee     : ${courseSkipped.contradicts}`);
  console.log(`     could not resolve to a college      : ${courseSkipped.unresolved.length}`);

  const unresolvedPath = path.resolve(import.meta.dirname, '../dist-db/fee-sheets-unresolved.json');
  writeFileSync(unresolvedPath, JSON.stringify({ govt: govtSkipped.unresolved, course: courseSkipped.unresolved }, null, 2));
  console.log(`\n  unresolved names written to ${unresolvedPath} (quarantined, not guessed)`);

  if (!CONFIRM) {
    console.log('\n  DRY RUN — nothing written. Re-run with --confirm.\n');
    process.exit(0);
  }

  let inserted = 0, updated = 0;
  if (govtRows.length) {
    const r = await fees.insertMany(govtRows.map((x) => ({ ...x, createdAt: new Date(), updatedAt: new Date() })), { ordered: false });
    inserted += r.insertedCount;
  }
  if (courseInserts.length) {
    const r = await fees.insertMany(courseInserts.map((x) => ({ ...x, createdAt: new Date(), updatedAt: new Date() })), { ordered: false });
    inserted += r.insertedCount;
  }
  for (const u of courseUpdates) {
    const r = await fees.updateOne({ _id: u._id }, { $set: { totalCourseFee: u.totalCourseFee, updatedAt: new Date() } });
    updated += r.modifiedCount;
  }

  console.log(`\n  inserted: ${inserted}   updated: ${updated}`);
  console.log(`  fees rows now: ${await fees.countDocuments()}`);
  console.log(`  colleges with a fee: ${(await fees.distinct('collegeId')).length} / ${await colleges.countDocuments()}\n`);
  process.exit(0);
}

main().catch((e) => { console.error(`\n  ERROR: ${e.message}\n`); process.exit(1); });
