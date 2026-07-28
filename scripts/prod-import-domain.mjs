#!/usr/bin/env node
/**
 * Import staged DOMAIN data into the production MongoDB. **Runs ON the prod host**, not locally.
 *
 *   scp -i <key> scripts/prod-import-domain.mjs payload.json ec2-user@<host>:/tmp/
 *   ssh  -i <key> ec2-user@<host> 'cd /opt/medconsul/server && node /tmp/prod-import-domain.mjs /tmp/payload.json'
 *   ssh  -i <key> ec2-user@<host> 'cd /opt/medconsul/server && node /tmp/prod-import-domain.mjs /tmp/payload.json --confirm'
 *
 * WHY IT RUNS ON THE BOX
 * Prod's mongod listens on localhost only and `MONGODB_URI` lives in /opt/medconsul/.env. Running
 * here means the connection string is read on the machine that owns it and never crosses the wire,
 * appears in a shell history, or lands in a transcript. It is never printed.
 *
 * WHY NOT THE ADMIN API
 * The API path needs an admin password, and creating colleges through it MINTS NEW ObjectIds —
 * which would orphan the rank rows that reference the ids they were derived against. Writing here
 * lets the 11 new colleges keep their original `_id`, so every rank row resolves with no
 * name-remapping step and no chance of a mismatched join.
 *
 * WHAT IT TOUCHES
 * `colleges` and `closingRanks` ONLY. It never reads or writes users, refreshtokens,
 * passwordresets or submissions — production holds the only copy of those.
 *
 * SAFETY
 *   - dry run by default; --confirm required to write
 *   - colleges: $setOnInsert only, so an existing prod college is NEVER modified
 *   - closingRanks: upsert on the natural key, so re-running is a no-op and a published cutoff
 *     already present is left exactly as it is (we only add what is missing)
 *   - aborts if any rank row references a collegeId that will not exist after the college step
 */
import { readFileSync } from 'fs';
import path from 'path';

const CONFIRM = process.argv.includes('--confirm');
const PAYLOAD = process.argv[2];
const ENV_PATH = '/opt/medconsul/.env';
const NAT_KEY = ['collegeId', 'year', 'round', 'course', 'category', 'quota'];

if (!PAYLOAD || PAYLOAD.startsWith('--')) {
  console.error('\n  usage: node prod-import-domain.mjs <payload.json> [--confirm]\n');
  process.exit(1);
}

function mongoUri() {
  const line = readFileSync(ENV_PATH, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('MONGODB_URI='));
  if (!line) throw new Error(`MONGODB_URI not found in ${ENV_PATH}`);
  return line.slice('MONGODB_URI='.length).trim().replace(/^["']|["']$/g, '');
}

async function main() {
  // Resolve the driver out of the server's own node_modules — this script is dropped in /tmp and
  // has no package.json of its own.
  const { MongoClient } = await import(
    path.join('/opt/medconsul/server/node_modules/mongodb/lib/index.js')
  ).catch(() => import('mongodb'));

  const payload = JSON.parse(readFileSync(PAYLOAD, 'utf8'));
  const colleges = payload.colleges || [];
  const ranks = payload.closingRanks || [];

  console.log(`\n  payload: ${colleges.length} colleges, ${ranks.length} closing ranks`);

  const client = new MongoClient(mongoUri());
  await client.connect();
  const db = client.db();

  const before = {
    colleges: await db.collection('colleges').countDocuments(),
    ranks: await db.collection('closingRanks').countDocuments(),
  };
  console.log(`  prod now: colleges ${before.colleges}, closingRanks ${before.ranks}`);

  // Which of the payload colleges are genuinely new?
  const names = colleges.map((c) => c.name);
  const existingByName = await db
    .collection('colleges')
    .find({ name: { $in: names } }, { projection: { name: 1 } })
    .toArray();
  console.log(`  colleges already present: ${existingByName.length} / ${colleges.length}`);

  // Every rank row must resolve against prod ids ∪ the ids we are about to insert.
  const prodIds = new Set((await db.collection('colleges').distinct('_id')).map(String));
  const incomingIds = new Set(colleges.map((c) => String(c._id)));
  const unresolved = ranks.filter(
    (r) => !prodIds.has(String(r.collegeId)) && !incomingIds.has(String(r.collegeId)),
  );
  if (unresolved.length) {
    console.error(`\n  ABORT: ${unresolved.length} rank rows reference a college that will not exist.`);
    console.error(`  distinct missing collegeIds: ${new Set(unresolved.map((r) => String(r.collegeId))).size}`);
    await client.close();
    process.exit(1);
  }
  console.log('  FK check: every rank row resolves.');

  // How many ranks are genuinely new (natural-key miss)?
  const keyOf = (r) => NAT_KEY.map((k) => String(r[k])).join('|');
  const existingKeys = new Set(
    (
      await db
        .collection('closingRanks')
        .find({}, { projection: Object.fromEntries(NAT_KEY.map((k) => [k, 1])) })
        .toArray()
    ).map(keyOf),
  );
  const freshRanks = ranks.filter((r) => !existingKeys.has(keyOf(r)));
  console.log(`  closing ranks already present: ${ranks.length - freshRanks.length}`);
  console.log(`  NEW closing ranks to insert  : ${freshRanks.length}`);

  if (!CONFIRM) {
    console.log('\n  DRY RUN — nothing written. Re-run with --confirm.\n');
    await client.close();
    return;
  }

  const { ObjectId } = await import(
    path.join('/opt/medconsul/server/node_modules/mongodb/lib/index.js')
  ).catch(() => import('mongodb'));

  if (colleges.length) {
    const ops = colleges.map((c) => {
      const { _id, ...rest } = c;
      return {
        updateOne: {
          filter: { _id: new ObjectId(_id) },
          // $setOnInsert only: an existing prod college is never overwritten by this import.
          update: { $setOnInsert: { ...rest, createdAt: new Date(), updatedAt: new Date() } },
          upsert: true,
        },
      };
    });
    const r = await db.collection('colleges').bulkWrite(ops, { ordered: false });
    console.log(`\n  colleges upserted: ${r.upsertedCount} new, ${r.matchedCount} already there`);
  }

  if (freshRanks.length) {
    const ops = freshRanks.map((r) => ({
      updateOne: {
        filter: Object.fromEntries(NAT_KEY.map((k) => [k, r[k]])),
        update: { $setOnInsert: { ...r, createdAt: new Date(), updatedAt: new Date() } },
        upsert: true,
      },
    }));
    const res = await db.collection('closingRanks').bulkWrite(ops, { ordered: false });
    console.log(`  closingRanks upserted: ${res.upsertedCount} new`);
  }

  console.log(`\n  prod after: colleges ${await db.collection('colleges').countDocuments()}, closingRanks ${await db.collection('closingRanks').countDocuments()}`);
  await client.close();
  console.log('  done.\n');
}

main().catch((e) => { console.error(`\n  ERROR: ${e.message}\n`); process.exit(1); });
