/**
 * Apply the hand-verified allotment → college links in `scripts/data/allotment-relink.ts`.
 *
 *   npx tsx scripts/relink-allotments.ts              # DRY RUN (default)
 *   npx tsx scripts/relink-allotments.ts --confirm    # write collegeId onto the matched rows
 *
 * Only rows that are currently UNLINKED are touched — an existing collegeId is never rewritten,
 * so this can never move rows off a link the automated matcher already made. Match is on the
 * exact `instituteName` string; no fuzzy scoring happens here, that judgement was made by hand.
 *
 * Re-run `scripts/derive-closing-ranks.ts --confirm` afterwards: newly-linked rows can push a
 * group over the evidence threshold and yield cutoffs that were not derivable before.
 */
import { connectDatabase, isMongoConnected, connection } from '../server/src/config/database';
import { RELINK } from './data/allotment-relink';

const CONFIRM = process.argv.includes('--confirm');

async function main() {
  await connectDatabase();
  if (!isMongoConnected()) {
    console.error('\n  MongoDB is not connected.\n');
    process.exit(1);
  }
  const allotments = connection.collection('allotments');
  const colleges = connection.collection('colleges');

  const validIds = new Set(
    (await colleges.find({}, { projection: { _id: 1 } }).toArray()).map((c) => String(c._id)),
  );

  const unlinked = { $or: [{ collegeId: null }, { collegeId: { $exists: false } }, { collegeId: '' }] };
  let total = 0;
  const plan: { name: string; id: string; n: number }[] = [];

  for (const pair of RELINK) {
    if (!validIds.has(pair.collegeId)) {
      console.error(`  ABORT: collegeId ${pair.collegeId} ("${pair.instituteName}") is not a real college.`);
      process.exit(1);
    }
    const n = await allotments.countDocuments({ instituteName: pair.instituteName, ...unlinked });
    plan.push({ name: pair.instituteName, id: pair.collegeId, n });
    total += n;
  }

  console.log(`\n  hand-verified pairs: ${RELINK.length}`);
  plan.forEach((p) => console.log(`    ${String(p.n).padStart(5)}  ${p.name}`));
  console.log(`\n  unlinked rows that would be linked: ${total}`);

  if (!CONFIRM) {
    console.log('\n  DRY RUN — nothing written. Re-run with --confirm.\n');
    process.exit(0);
  }

  let linked = 0;
  for (const pair of RELINK) {
    const r = await allotments.updateMany(
      { instituteName: pair.instituteName, ...unlinked },
      { $set: { collegeId: pair.collegeId } },
    );
    linked += r.modifiedCount;
  }

  const stillUnlinked = await allotments.countDocuments(unlinked);
  console.log(`\n  linked: ${linked}`);
  console.log(`  allotment rows still unlinked: ${stillUnlinked}`);
  console.log(`  colleges with allotments: ${(await allotments.distinct('collegeId', { collegeId: { $nin: [null, ''] } })).length}\n`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
