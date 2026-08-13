/**
 * Remove allotment rows whose `allIndiaRank` is actually a NEET ROLL NUMBER, and the derived
 * cutoffs computed from them.
 *
 *   npx tsx scripts/fix-roll-number-ranks.ts             # DRY RUN
 *   npx tsx scripts/fix-roll-number-ranks.ts --confirm
 *
 * FOUND BY: plotting predicted-vs-actual cutoffs. The axis ran to 10 billion, which no rank can be.
 *
 * WHAT HAPPENED: MCC's 2021 round-1/3/4 allotment PDFs lay their columns out differently from the
 * rest, and `data/parse_mcc_allotments.py` read the 10-digit roll number where the rank should be.
 * 16,171 of 22,760 MCC UG 2021 rows (71%) carry a roll number; rounds 2, 5 and 6 are clean. Then
 * `derive-closing-ranks.ts` took max(allIndiaRank) over those groups and produced 254 "cutoffs"
 * in the billions, which the site served as real closing ranks.
 *
 * THE THRESHOLD: 2,500,000 — comfortably above the largest NEET cohort ever (about 24 lakh
 * appeared), and four orders of magnitude below a 10-digit roll number, so there is no grey zone.
 * The clean 2021 rows top out at 921,634, well under it.
 *
 * WHY DELETE RATHER THAN REPAIR: the rank IS the content of an allotment row — a row whose rank is
 * a roll number tells a student nothing true, and it pollutes every rank-range search it appears
 * in. The source PDFs are cached in `data/raw/mcc_pdfs/`, so a corrected re-parse can restore these
 * rows properly; that is the real fix and this is the stop-the-bleeding one.
 */
import { connectDatabase, isMongoConnected, connection } from '../server/src/config/database';

const CONFIRM = process.argv.includes('--confirm');
const CAP = 2_500_000;

async function main() {
  await connectDatabase();
  if (!isMongoConnected()) {
    console.error('\n  MongoDB is not connected — set MONGODB_URI in the repo-root .env.\n');
    process.exit(1);
  }
  const allotments = connection.collection('allotments');
  const ranks = connection.collection('closingRanks');

  const badAllot = await allotments.countDocuments({ allIndiaRank: { $gt: CAP } });
  const badRanks = await ranks.countDocuments({ closingRank: { $gt: CAP } });

  // Everything above the cap must be derived, never published — if a PUBLISHED cutoff is up there,
  // something else is wrong and this script is the wrong tool.
  const publishedBad = await ranks.countDocuments({
    closingRank: { $gt: CAP }, $or: [{ source: null }, { source: '' }, { source: { $exists: false } }],
  });

  console.log(`\n  allotment rows with a roll number as rank : ${badAllot.toLocaleString()}`);
  console.log(`  derived cutoffs computed from them        : ${badRanks}`);
  console.log(`  of those, PUBLISHED (should be 0)         : ${publishedBad}`);

  const byRound = await allotments.aggregate([
    { $match: { allIndiaRank: { $gt: CAP } } },
    { $group: { _id: { c: '$counselling', r: '$round' }, n: { $sum: 1 } } },
    { $sort: { '_id.c': 1, '_id.r': 1 } },
  ]).toArray();
  console.log('\n  affected rounds:');
  byRound.forEach((r) => console.log(`    ${r._id.c} round ${r._id.r}: ${r.n.toLocaleString()}`));

  if (publishedBad > 0) {
    console.error('\n  ABORT: a PUBLISHED cutoff is above the cap. That is not this bug — investigate first.\n');
    process.exit(1);
  }

  if (!CONFIRM) {
    console.log('\n  DRY RUN — nothing written. Re-run with --confirm.\n');
    process.exit(0);
  }

  const r1 = await ranks.deleteMany({ closingRank: { $gt: CAP } });
  const r2 = await allotments.deleteMany({ allIndiaRank: { $gt: CAP } });
  console.log(`\n  deleted ${r1.deletedCount} closingRanks, ${r2.deletedCount} allotments`);
  console.log(`  remaining above the cap: ${
    await ranks.countDocuments({ closingRank: { $gt: CAP } })} ranks, ${
    await allotments.countDocuments({ allIndiaRank: { $gt: CAP } })} allotments`);
  console.log(`  totals now: closingRanks ${await ranks.countDocuments()}, allotments ${await allotments.countDocuments()}\n`);
  process.exit(0);
}

main().catch((e) => { console.error(`\n  ERROR: ${e.message}\n`); process.exit(1); });
