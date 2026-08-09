/**
 * Unlink allotment rows whose BDS seats were filed onto a MEDICAL college.
 *
 *   npx tsx scripts/fix-dental-crossings.ts             # DRY RUN (default)
 *   npx tsx scripts/fix-dental-crossings.ts --confirm
 *
 * WHAT WENT WRONG
 * `data/namematch.py` stripped parentheticals in `norm()` BEFORE `discipline_clash()` could read
 * them, and its DISCIPLINE set held only whole words. So MCC's abbreviated dental spellings were
 * invisible to the medical/dental veto and matched their medical namesake:
 *
 *   'NORTH BENGAL DENT.COLL, ...'            -> North Bengal Medical College
 *   'S.C.B. MEDICAL COLL(DENTAL), CUTTACK'   -> SCB Medical College
 *   'Sri Siddhartha DentalCollege, Tumkur'   -> Sri Siddhartha Medical College
 *   'M.G.D.C. & HOSPITAL, PUDUCHERRY'        -> Pondicherry Institute of Medical Sciences
 *
 * The parser then overwrote `instituteName` with the MATCHED college's name, which destroyed the
 * evidence — the rows now read as self-consistent ("North Bengal Medical College" linked to North
 * Bengal Medical College) and a name-vs-name audit finds nothing. That is why this went unnoticed.
 *
 * THE RELIABLE DETECTOR is the course, which survived: a BDS row linked to a college that is not a
 * dental institution. That is 509 rows across 4 colleges.
 *
 * WHY UNLINK RATHER THAN RELINK
 * None of the four correct dental colleges exists in our `colleges` table (checked: 38 dental
 * colleges held, none of them these). We cannot point the rows anywhere true, and leaving BDS seats
 * attributed to a medical college corrupts that college's BDS cutoffs. An unlinked row is merely
 * incomplete and joins the ~50k already unlinked; a wrongly-linked one is a false statement a
 * student plans around. Unlink, and let a future re-parse with the fixed matcher relink them.
 *
 * The row is KEPT (its rank/category/course data is still true) and its instituteName is left as-is
 * — it is the only trace of the row's provenance we still hold.
 */
import { connectDatabase, isMongoConnected, connection } from '../server/src/config/database';

const CONFIRM = process.argv.includes('--confirm');

/** A college is dental if its NAME says so — the only signal we have post-overwrite. */
const isDental = (s?: string | null) => /dental|dentistry/i.test(s || '');

async function main() {
  await connectDatabase();
  if (!isMongoConnected()) {
    console.error('\n  MongoDB is not connected — set MONGODB_URI in the repo-root .env.\n');
    process.exit(1);
  }
  const allotments = connection.collection('allotments');
  const colleges = connection.collection('colleges');

  const nameById = new Map<string, string>();
  for (const c of await colleges.find({}, { projection: { name: 1 } }).toArray()) {
    nameById.set(String(c._id), c.name as string);
  }

  const suspect = await allotments
    .find({ course: 'BDS', collegeId: { $nin: [null, ''] } }, { projection: { collegeId: 1 } })
    .toArray();

  const byCollege = new Map<string, number>();
  const ids: unknown[] = [];
  for (const a of suspect) {
    const name = nameById.get(String(a.collegeId));
    if (!name || isDental(name)) continue;      // correctly linked to a dental college
    byCollege.set(name, (byCollege.get(name) || 0) + 1);
    ids.push(a._id);
  }

  console.log(`\n  BDS allotment rows linked to a NON-dental college: ${ids.length}`);
  for (const [name, n] of [...byCollege].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(5)}  ${name}`);
  }

  // Sanity floor: if this ever reports a huge number, the detector is wrong, not the data.
  if (ids.length > 5000) {
    console.error(`\n  ABORT: ${ids.length} rows is far more than the known 509 — refusing to mass-unlink.\n`);
    process.exit(1);
  }

  if (!CONFIRM) {
    console.log('\n  DRY RUN — nothing written. Re-run with --confirm to unlink these rows.\n');
    process.exit(0);
  }

  const res = await allotments.updateMany(
    { _id: { $in: ids as never[] } },
    { $unset: { collegeId: '' }, $set: { updatedAt: new Date() } },
  );
  console.log(`\n  unlinked: ${res.modifiedCount}`);
  console.log(`  BDS rows still on a non-dental college: ${
    (await allotments.find({ course: 'BDS', collegeId: { $nin: [null, ''] } }, { projection: { collegeId: 1 } }).toArray())
      .filter((a) => { const n = nameById.get(String(a.collegeId)); return n && !isDental(n); }).length
  }`);
  console.log(`  total unlinked allotment rows now: ${
    await allotments.countDocuments({ $or: [{ collegeId: null }, { collegeId: { $exists: false } }, { collegeId: '' }] })
  }\n`);
  process.exit(0);
}

main().catch((e) => { console.error(`\n  ERROR: ${e.message}\n`); process.exit(1); });
