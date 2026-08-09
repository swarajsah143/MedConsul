/**
 * Import a parsed MCC seat matrix into the `seatMatrix` collection.
 *
 *   npx tsx scripts/import-seat-matrix.ts                                  # DRY RUN
 *   npx tsx scripts/import-seat-matrix.ts --confirm
 *   npx tsx scripts/import-seat-matrix.ts --file <json> --year 2026 --round 1
 *
 * Input is the output of `data/parse_mcc_seat_matrix.py`, which reconciles its own total against
 * the figure printed in the PDF (31,728 for 2026 Round 1) and refuses to emit otherwise.
 *
 * THE PARSER DELIBERATELY DOES NOT KNOW ITS OWN PROVENANCE.
 * It reads one PDF and emits rows; `counselling`, `year` and `round` describe WHICH document that
 * was, and are supplied here. They are three of the nine natural-key components, so getting them
 * wrong would not error — it would silently overwrite a different round's numbers. Hence they are
 * explicit CLI inputs with a confirmation echo, never inferred from a filename.
 *
 * MATCHING: none. Rows land with `collegeId` unset and `instituteCode` carrying MCC's own id.
 * Linking colleges is `backfill-mcc-codes.ts`'s job, reviewed separately — mixing an import with a
 * fuzzy match is how a bad match becomes invisible inside a big green "imported 3,493 rows".
 */
import { readFileSync } from 'fs';
import { connectDatabase, isMongoConnected, connection } from '../server/src/config/database';
import { getSchema } from '../server/src/schema/collections';
import { resource } from '../server/src/models/resource.model';

const arg = (flag: string, dflt?: string) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : dflt;
};

const CONFIRM = process.argv.includes('--confirm');
const FILE = arg('--file', 'data/raw/seat_matrix.2026.json')!;
const YEAR = Number(arg('--year', '2026'));
const ROUND = Number(arg('--round', '1'));
const COUNSELLING = arg('--counselling', 'MCC AIQ UG')!;
const SOURCE = arg('--source', 'MCC Seat Matrix Round 1 NEET UG 2026 (mcc.nic.in, 07.08.2026)')!;

/** The PDF prints 'B.Sc. Nursing'; our COURSES enum spells it without dots, like every sibling. */
const COURSE_MAP: Record<string, string> = {
  'B.Sc. Nursing': 'BSc Nursing',
  'B.Sc Nursing': 'BSc Nursing',
};

async function main() {
  await connectDatabase();
  if (!isMongoConnected()) {
    console.error('\n  MongoDB is not connected — set MONGODB_URI in the repo-root .env.\n');
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(FILE, 'utf8'));
  const parsed: Record<string, unknown>[] = Array.isArray(raw) ? raw : (raw.rows ?? raw.data ?? []);
  if (!parsed.length) {
    console.error(`\n  ${FILE} contained no rows.\n`);
    process.exit(1);
  }

  const schema = getSchema('seatMatrix')!;
  const COURSES = schema.fields.find((f) => f.name === 'course')!.options!;
  const CATEGORIES = schema.fields.find((f) => f.name === 'category')!.options!;

  const rows = parsed.map((r) => ({
    counselling: COUNSELLING,
    year: YEAR,
    round: ROUND,
    instituteCode: String(r.instituteCode ?? '').trim(),
    instituteName: String(r.instituteName ?? '').trim(),
    state: String(r.state ?? '').trim(),
    instituteType: String(r.instituteType ?? '').trim(),
    quota: String(r.quota ?? '').trim(),
    course: COURSE_MAP[String(r.course)] ?? String(r.course),
    category: String(r.category ?? '').trim(),
    pwd: Boolean(r.pwd),
    seatGender: String(r.seatGender ?? '').trim(),
    totalSeats: Number(r.totalSeats),
    source: SOURCE,
  }));

  // Validate BEFORE writing. Import is all-or-nothing, so a single unmapped enum value would
  // reject the whole batch — better to name the offending value than to read a bulk error.
  const badCourse = [...new Set(rows.map((r) => r.course).filter((c) => !COURSES.includes(c)))];
  const badCategory = [...new Set(rows.map((r) => r.category).filter((c) => !CATEGORIES.includes(c)))];
  const badSeats = rows.filter((r) => !Number.isFinite(r.totalSeats) || r.totalSeats <= 0).length;
  const badCode = rows.filter((r) => !/^\d{6}$/.test(r.instituteCode)).length;

  const total = rows.reduce((s, r) => s + r.totalSeats, 0);
  console.log(`\n  ${FILE}`);
  console.log(`  ${COUNSELLING} — year ${YEAR}, round ${ROUND}`);
  console.log(`  rows: ${rows.length.toLocaleString()}   seats: ${total.toLocaleString()}   institutes: ${new Set(rows.map((r) => r.instituteCode)).size}`);
  console.log(`  courses: ${JSON.stringify(countBy(rows, 'course'))}`);

  const problems: string[] = [];
  if (badCourse.length) problems.push(`course values not in the enum: ${JSON.stringify(badCourse)}`);
  if (badCategory.length) problems.push(`category values not in the enum: ${JSON.stringify(badCategory)}`);
  if (badSeats) problems.push(`${badSeats} rows with a non-positive totalSeats`);
  if (badCode) problems.push(`${badCode} rows whose instituteCode is not 6 digits`);

  // A duplicate natural key inside the batch would silently collapse two real seat pools into one.
  const keys = new Set<string>();
  let dupes = 0;
  for (const r of rows) {
    const k = [r.counselling, r.year, r.round, r.instituteCode, r.quota, r.course, r.category, r.pwd, r.seatGender].join('|');
    if (keys.has(k)) dupes++;
    keys.add(k);
  }
  if (dupes) problems.push(`${dupes} duplicate natural keys WITHIN the batch`);

  if (problems.length) {
    console.error('\n  ABORT — fix these before importing:');
    problems.forEach((p) => console.error(`    - ${p}`));
    process.exit(1);
  }
  console.log('  validation: PASS (enums, seats, codes, no duplicate keys)');

  const existing = await connection.collection('seatMatrix')
    .countDocuments({ counselling: COUNSELLING, year: YEAR, round: ROUND });
  console.log(`  already in DB for this counselling/year/round: ${existing}`);

  if (!CONFIRM) {
    console.log('\n  DRY RUN — nothing written. Re-run with --confirm.\n');
    process.exit(0);
  }

  // importMany upserts on the natural key, so re-running is a no-op rather than a duplicate set.
  const res = await resource(schema).importMany(rows);
  console.log(`\n  created: ${res.created}   updated: ${res.updated}`);

  const col = connection.collection('seatMatrix');
  const stored = await col.aggregate([
    { $match: { counselling: COUNSELLING, year: YEAR, round: ROUND } },
    { $group: { _id: null, rows: { $sum: 1 }, seats: { $sum: '$totalSeats' } } },
  ]).toArray();
  console.log(`  in DB now: ${stored[0]?.rows ?? 0} rows, ${(stored[0]?.seats ?? 0).toLocaleString()} seats`);
  console.log(`  reconciles to the source total: ${stored[0]?.seats === total ? 'YES' : 'NO — investigate'}\n`);
  process.exit(0);
}

function countBy(rows: Record<string, unknown>[], field: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[String(r[field])] = (out[String(r[field])] || 0) + 1;
  return out;
}

main().catch((e) => { console.error(`\n  ERROR: ${e.message}\n`); process.exit(1); });
