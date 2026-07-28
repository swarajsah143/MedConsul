#!/usr/bin/env node
/**
 * Remove the malformed `" State Quota"` closing-rank rows from PRODUCTION. **Runs on the prod host.**
 *
 *   scp -i <key> scripts/prod-fix-blank-quota.mjs ec2-user@<host>:/tmp/
 *   ssh  -i <key> ec2-user@<host> 'cd /opt/medconsul/server && node /tmp/prod-fix-blank-quota.mjs'
 *   ssh  -i <key> ec2-user@<host> 'cd /opt/medconsul/server && node /tmp/prod-fix-blank-quota.mjs --confirm'
 *
 * WHAT IS WRONG
 * 174 rows carry the quota `" State Quota"` — leading space, state prefix lost by the parser.
 * They belong to Gujarat and Andhra Pradesh colleges that already hold correctly-labelled
 * `<State> State Quota` rows. Students filtering by state quota never see them.
 *
 * WHY DELETE RATHER THAN REPAIR THE LABEL
 * Renaming is impossible: every one collides with its correctly-labelled twin on the natural key
 * (collegeId+year+round+course+category+quota), which is a UNIQUE index. And it would be pointless
 * — the twin already carries identical data. These are redundant rows with a broken label, not
 * lost data. This was verified row-by-row on the local mirror before being run here.
 *
 * SAFETY
 *   - dry run by default; --confirm required to delete
 *   - a row is deleted ONLY if its properly-labelled twin exists AND every data field matches
 *   - anything unexpected is reported and KEPT — a surprise means the assumption changed, and the
 *     safe response is to skip, not to guess
 *   - touches `closingRanks` only; never reads or writes users/submissions/tokens
 */
import { readFileSync } from 'fs';
import path from 'path';

const CONFIRM = process.argv.includes('--confirm');
const ENV_PATH = '/opt/medconsul/.env';
const BAD_QUOTA = ' State Quota';
const DATA_FIELDS = ['collegeId', 'year', 'round', 'course', 'category', 'closingRank', 'closingScore'];

function mongoUri() {
  const line = readFileSync(ENV_PATH, 'utf8').split('\n').find((l) => l.startsWith('MONGODB_URI='));
  if (!line) throw new Error(`MONGODB_URI not found in ${ENV_PATH}`);
  return line.slice('MONGODB_URI='.length).trim().replace(/^["']|["']$/g, '');
}

async function main() {
  const { MongoClient } = await import(
    path.join('/opt/medconsul/server/node_modules/mongodb/lib/index.js')
  ).catch(() => import('mongodb'));

  const client = new MongoClient(mongoUri());
  await client.connect();
  const db = client.db();
  const ranks = db.collection('closingRanks');

  const before = await ranks.countDocuments();
  const bad = await ranks.find({ quota: BAD_QUOTA }).toArray();
  console.log(`\n  closingRanks total: ${before}`);
  console.log(`  rows with quota "${BAD_QUOTA}": ${bad.length}`);
  if (!bad.length) {
    console.log('  nothing to do.\n');
    await client.close();
    return;
  }

  // collegeId is stored as a STRING on closingRanks while colleges._id is an ObjectId — an $in of
  // raw string ids matches nothing and returns empty rather than erroring, which would read as
  // "no colleges found" and silently keep all 174. Key the map by string and compare in JS.
  const stateById = new Map();
  for (const c of await db.collection('colleges').find({}, { projection: { state: 1 } }).toArray()) {
    stateById.set(String(c._id), c.state);
  }

  const deletable = [];
  const kept = [];

  for (const row of bad) {
    const state = stateById.get(String(row.collegeId));
    if (!state) { kept.push(`${row._id}: college not found — cannot verify`); continue; }

    const twin = await ranks.findOne({
      collegeId: row.collegeId,
      year: row.year,
      round: row.round,
      course: row.course,
      category: row.category,
      quota: `${state} State Quota`,
    });
    if (!twin) { kept.push(`${row._id}: no "${state} State Quota" twin — this is the ONLY copy, keeping`); continue; }

    const differing = DATA_FIELDS.filter(
      (f) => JSON.stringify(row[f] ?? null) !== JSON.stringify(twin[f] ?? null),
    );
    if (differing.length) { kept.push(`${row._id}: twin differs on ${differing.join(', ')} — keeping`); continue; }

    deletable.push(row._id);
  }

  console.log(`  verified exact duplicates (safe to delete): ${deletable.length}`);
  console.log(`  kept for review: ${kept.length}`);
  kept.slice(0, 10).forEach((k) => console.log(`    ${k}`));

  if (!CONFIRM) {
    console.log('\n  DRY RUN — nothing written. Re-run with --confirm.\n');
    await client.close();
    return;
  }

  const res = await ranks.deleteMany({ _id: { $in: deletable } });
  console.log(`\n  deleted: ${res.deletedCount}`);
  console.log(`  remaining malformed-quota rows: ${await ranks.countDocuments({ quota: /^\s|^$/ })}`);
  console.log(`  closingRanks total now: ${await ranks.countDocuments()}\n`);
  await client.close();
}

main().catch((e) => { console.error(`\n  ERROR: ${e.message}\n`); process.exit(1); });
