/**
 * Remove the malformed `" State Quota"` closing-rank rows.
 *
 *   npx tsx scripts/fix-blank-quota-dupes.ts              # DRY RUN (default — writes nothing)
 *   npx tsx scripts/fix-blank-quota-dupes.ts --confirm    # actually delete
 *
 * WHAT IS WRONG
 * 174 `closingRanks` rows carry the quota `" State Quota"` — leading space, state name missing.
 * The parser dropped the state prefix. They belong to Gujarat (23 colleges) and Andhra Pradesh
 * (17), both of which already have correctly-labelled `<State> State Quota` rows.
 *
 * WHY DELETE AND NOT RENAME
 * The first instinct is to repair the label from the college's own `state`. That is impossible:
 * every one of the 174 collides with an existing correctly-labelled row on the natural key
 * (collegeId+year+round+course+category+quota), which is a UNIQUE index — the rename would throw
 * on all 174. And it would be pointless anyway: each dupe was verified field-by-field against its
 * correctly-labelled twin and carries NO information the twin lacks (same closingRank, same
 * closingScore, no extra fields). They are redundant rows with a broken label, not lost data.
 *
 * The check is re-run here per row rather than trusted from that audit: a row is deleted ONLY if
 * its properly-labelled twin exists AND every data field matches. Anything else is reported and
 * left alone — a surprise here means the assumption changed, and the safe response is to skip.
 */
import { connectDatabase, isMongoConnected, connection } from '../server/src/config/database';
import { getSchema } from '../server/src/schema/collections';
import { resource } from '../server/src/models/resource.model';

const CONFIRM = process.argv.includes('--confirm');
const BAD_QUOTA = ' State Quota';

/** Fields that carry actual data — _id/quota/timestamps are expected to differ. */
const DATA_FIELDS = ['collegeId', 'year', 'round', 'course', 'category', 'closingRank', 'closingScore'];

async function main() {
  await connectDatabase();
  if (!isMongoConnected()) {
    console.error('\n  MongoDB is not connected — set MONGODB_URI in the repo-root .env and try again.\n');
    process.exit(1);
  }

  const ClosingRank = resource(getSchema('closingRanks')!);
  const closingRanks = connection.collection('closingRanks');
  const colleges = connection.collection('colleges');

  const bad = await closingRanks.find({ quota: BAD_QUOTA }).toArray();
  console.log(`\n  rows with quota "${BAD_QUOTA}": ${bad.length}`);
  if (!bad.length) {
    console.log('  nothing to do.\n');
    process.exit(0);
  }

  // Read every college's state into a map keyed by the STRING id. `closingRanks.collegeId` is
  // stored as a string while `colleges._id` is an ObjectId, so an `$in` of raw string ids matches
  // nothing at all — it returns empty rather than erroring, which reads as "no colleges found"
  // and would silently keep all 174. Compare as strings on this side instead.
  const stateById = new Map<string, string>();
  for (const c of await colleges.find({}, { projection: { state: 1 } }).toArray()) {
    stateById.set(String(c._id), c.state as string);
  }

  const deletable: string[] = [];
  const kept: string[] = [];

  for (const row of bad) {
    const state = stateById.get(String(row.collegeId));
    if (!state) {
      kept.push(`${row._id}: college not found — cannot verify`);
      continue;
    }
    const twin = await closingRanks.findOne({
      collegeId: row.collegeId,
      year: row.year,
      round: row.round,
      course: row.course,
      category: row.category,
      quota: `${state} State Quota`,
    });
    if (!twin) {
      kept.push(`${row._id}: no "${state} State Quota" twin — this row is the ONLY copy, keeping it`);
      continue;
    }
    const differing = DATA_FIELDS.filter(
      (f) => JSON.stringify(row[f] ?? null) !== JSON.stringify(twin[f] ?? null),
    );
    if (differing.length) {
      kept.push(`${row._id}: twin differs on ${differing.join(', ')} — keeping, needs a human`);
      continue;
    }
    deletable.push(String(row._id));
  }

  console.log(`  verified exact duplicates (safe to delete): ${deletable.length}`);
  console.log(`  kept for review: ${kept.length}`);
  kept.slice(0, 10).forEach((k) => console.log(`    ${k}`));

  if (!CONFIRM) {
    console.log('\n  DRY RUN — nothing written. Re-run with --confirm to delete.\n');
    process.exit(0);
  }

  let removed = 0;
  for (const id of deletable) if (await ClosingRank.remove(id)) removed++;

  console.log(`\n  deleted: ${removed}`);
  console.log(`  remaining malformed-quota rows: ${await closingRanks.countDocuments({ quota: /^\s|^$/ })}`);
  console.log(`  closingRanks total now: ${await closingRanks.countDocuments()}\n`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
