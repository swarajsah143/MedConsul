/**
 * Derive closing ranks from the MCC allotment data we already hold.
 *
 *   npx tsx scripts/derive-closing-ranks.ts                 # DRY RUN (default — writes nothing)
 *   npx tsx scripts/derive-closing-ranks.ts --confirm       # actually insert
 *   npx tsx scripts/derive-closing-ranks.ts --min-rows 5    # loosen the evidence threshold
 *
 * WHY THIS EXISTS
 * `closingRanks` covers 834 of 1,114 colleges and only 2023-2025, with 2023 nearly empty (93
 * rows) — so the year-over-year trend charts have two real points. `allotments` holds 222,716
 * rows spanning MCC UG 2019-2025, rounds 1-7. A closing rank IS the last rank admitted to a
 * group, so max(allIndiaRank) over a (college, year, round, course, category, quota) group
 * reconstructs it.
 *
 * WHY IT IS DELIBERATELY CONSERVATIVE
 * Validated against the 2,317 groups where a derived value can be compared with a cutoff we
 * already hold: 1,686 (73%) match exactly. Where they disagree the derived number is usually
 * OPTIMISTIC — our allotment set for that group is incomplete, so the last rank we can see is
 * better than the real last rank admitted (median 1.46x, p90 3.38x, worst 19x). A student
 * reading an optimistic cutoff concludes they are safe when they are not. Hence:
 *
 *   1. INSERT-ONLY. A group that already has a row is skipped, never overwritten. Published
 *      cutoffs always win over derived ones. (Same rule as the careers360 fee gap-fill.)
 *   2. EVIDENCE THRESHOLD. Only groups backed by >= MIN_ROWS allotment records qualify.
 *      At the default 10 that is ~2,189 rows; dropping to 1 would admit 6,038 rows resting on
 *      a single record, which is noise dressed as data.
 *   3. LABELLED. Every inserted row carries source='derived: MCC allotments' so the admin panel,
 *      the API and the chatbot can tell it from a published cutoff.
 *   4. seatType='Private' is EXCLUDED. Its quota mapping is unverified — all 6 comparable
 *      groups disagreed with the stored cutoff, so we do not guess at what quota it means.
 *   5. category='PwD' is EXCLUDED. `closingRanks` holds no PwD rows today, so there is nothing
 *      to validate a derived PwD cutoff against.
 *
 * Idempotent: re-running inserts nothing new (every group it would write now exists).
 */
import { connectDatabase, isMongoConnected, connection } from '../server/src/config/database';
import { getSchema } from '../server/src/schema/collections';
import { resource } from '../server/src/models/resource.model';

const CONFIRM = process.argv.includes('--confirm');
const MIN_ROWS = Number(
  process.argv.includes('--min-rows') ? process.argv[process.argv.indexOf('--min-rows') + 1] : 10,
);

const SOURCE = 'derived: MCC allotments';

/** MCC counsels the All India Quota in government seats and 100% of deemed seats. */
const QUOTA_BY_SEAT_TYPE: Record<string, string> = {
  Government: 'All India Quota (AIQ)',
  Deemed: 'Deemed Quota',
};

const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS'];

type Group = {
  _id: {
    collegeId: string;
    year: number;
    round: number;
    course: string;
    category: string;
    seatType: string;
  };
  closingRank: number;
  n: number;
};

async function main() {
  await connectDatabase();
  if (!isMongoConnected()) {
    console.error('\n  MongoDB is not connected — set MONGODB_URI in the repo-root .env and try again.\n');
    process.exit(1);
  }

  const ClosingRank = resource(getSchema('closingRanks')!);
  // The resource() wrapper deliberately exposes no aggregate(); these are read-only rollups over
  // 222k rows, so go through the driver collection directly and write back through the wrapper.
  const allotments = connection.collection('allotments');
  const closingRanks = connection.collection('closingRanks');

  console.log(`\n  Deriving closing ranks from allotments (min ${MIN_ROWS} allotment rows per group)\n`);

  // The last rank allotted in a group is that group's closing rank. `counselling` reads
  // "MCC UG 2025" — the year is the trailing 4 chars.
  const pipeline = [
    {
      $match: {
        collegeId: { $nin: [null, ''] },
        category: { $in: CATEGORIES },
        seatType: { $in: Object.keys(QUOTA_BY_SEAT_TYPE) },
        allIndiaRank: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: {
          collegeId: '$collegeId',
          year: { $toInt: { $substr: ['$counselling', 7, 4] } },
          round: '$round',
          course: '$course',
          category: '$category',
          seatType: '$seatType',
        },
        closingRank: { $max: '$allIndiaRank' },
        n: { $sum: 1 },
      },
    },
    { $match: { n: { $gte: MIN_ROWS } } },
  ];

  const groups = (await allotments
    .aggregate(pipeline, { allowDiskUse: true })
    .toArray()) as unknown as Group[];

  console.log(`  groups meeting the evidence threshold: ${groups.length}`);

  // Insert-only: anything we already hold a cutoff for is left exactly as it is.
  const existing = new Set<string>(
    (
      await closingRanks
        .find({}, { projection: { collegeId: 1, year: 1, round: 1, course: 1, category: 1, quota: 1 } })
        .toArray()
    ).map((r) => [r.collegeId, r.year, r.round, r.course, r.category, r.quota].join('|')),
  );

  const fresh = groups
    .map((g) => ({
      collegeId: String(g._id.collegeId),
      year: g._id.year,
      round: g._id.round,
      course: g._id.course,
      category: g._id.category,
      quota: QUOTA_BY_SEAT_TYPE[g._id.seatType],
      closingRank: g.closingRank,
      source: SOURCE,
      _backing: g.n,
    }))
    .filter(
      (r) =>
        !existing.has([r.collegeId, r.year, r.round, r.course, r.category, r.quota].join('|')),
    );

  const skipped = groups.length - fresh.length;
  console.log(`  already have a published cutoff (skipped): ${skipped}`);
  console.log(`  NEW rows to insert: ${fresh.length}\n`);

  const byYear: Record<number, number> = {};
  const collegesGained = new Set<string>();
  const haveRanks = new Set((await closingRanks.distinct('collegeId')).map(String));
  for (const r of fresh) {
    byYear[r.year] = (byYear[r.year] || 0) + 1;
    if (!haveRanks.has(r.collegeId)) collegesGained.add(r.collegeId);
  }
  console.log('  by year:');
  for (const y of Object.keys(byYear).sort()) console.log(`    ${y}: ${byYear[Number(y)]}`);
  console.log(`\n  colleges gaining their first-ever closing rank: ${collegesGained.size}`);

  if (!CONFIRM) {
    console.log('\n  DRY RUN — nothing written. Re-run with --confirm to insert.\n');
    process.exit(0);
  }

  // Strip the diagnostic field, then write through the same importMany the admin bulk import
  // uses — it upserts on the natural key, so a concurrent insert can never duplicate a row.
  // (Nothing here can collide anyway: `fresh` excludes every key already present.)
  const docs = fresh.map(({ _backing, ...doc }) => doc);
  const res = await ClosingRank.importMany(docs);

  console.log(`\n  inserted: ${res.created}   updated: ${res.updated}`);
  console.log(`  closingRanks total now: ${await closingRanks.countDocuments()}`);
  console.log(`  colleges with closing ranks: ${(await closingRanks.distinct('collegeId')).length}\n`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
