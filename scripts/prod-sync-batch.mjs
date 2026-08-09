#!/usr/bin/env node
/**
 * Sync seatMatrix + announcements to production, and repair the BDS/dental crossings there.
 * **Runs on the prod host** (mongod is localhost-only; MONGODB_URI lives in /opt/medconsul/.env
 * and is read on the machine that owns it, never printed).
 *
 *   ssh … 'cd /opt/medconsul/server && node /tmp/prod-sync-batch.mjs /tmp/prod-batch.json'
 *   ssh … 'cd /opt/medconsul/server && node /tmp/prod-sync-batch.mjs /tmp/prod-batch.json --confirm'
 *
 * THREE OPERATIONS, all idempotent, none destructive beyond the documented unlink:
 *
 * 1. seatMatrix   — upsert on the natural key. New collection on prod, so this is a pure insert,
 *                   but the upsert makes a re-run a no-op. NO collegeId is set: linking institutes
 *                   is a separate reviewed step, and burying a fuzzy match inside a 3,493-row
 *                   import is how a bad link becomes invisible.
 * 2. announcements— upsert on (date, title). Insert-only in effect; never edits an existing notice.
 * 3. dental fix   — unlink BDS allotment rows sitting on a NON-dental college. Prod carries the
 *                   same 509 rows as local, from the same namematch bug. The rows are KEPT (their
 *                   rank/category data is still true); only the wrong collegeId goes. Relinking is
 *                   impossible — none of the four correct dental colleges exists in `colleges`.
 *
 * Never touches users, refreshtokens, passwordresets or submissions.
 */
import { readFileSync } from 'fs';
import path from 'path';

const CONFIRM = process.argv.includes('--confirm');
const PAYLOAD = process.argv[2];
const ENV_PATH = '/opt/medconsul/.env';

const SM_KEY = ['counselling', 'year', 'round', 'instituteCode', 'quota', 'course', 'category', 'pwd', 'seatGender'];
const ANN_KEY = ['date', 'title'];

if (!PAYLOAD || PAYLOAD.startsWith('--')) {
  console.error('\n  usage: node prod-sync-batch.mjs <payload.json> [--confirm]\n');
  process.exit(1);
}

function mongoUri() {
  const line = readFileSync(ENV_PATH, 'utf8').split('\n').find((l) => l.startsWith('MONGODB_URI='));
  if (!line) throw new Error(`MONGODB_URI not found in ${ENV_PATH}`);
  return line.slice('MONGODB_URI='.length).trim().replace(/^["']|["']$/g, '');
}

const isDental = (s) => /dental|dentistry/i.test(s || '');

async function main() {
  const { MongoClient } = await import(
    path.join('/opt/medconsul/server/node_modules/mongodb/lib/index.js')
  ).catch(() => import('mongodb'));

  const payload = JSON.parse(readFileSync(PAYLOAD, 'utf8'));
  const seatMatrix = payload.seatMatrix || [];
  const announcements = payload.announcements || [];

  const client = new MongoClient(mongoUri());
  await client.connect();
  const db = client.db();

  const keyOf = (keys) => (r) => keys.map((k) => String(r[k])).join('|');

  // ── 1. seatMatrix ────────────────────────────────────────────────────
  const smExisting = new Set(
    (await db.collection('seatMatrix').find({}, { projection: Object.fromEntries(SM_KEY.map((k) => [k, 1])) }).toArray())
      .map(keyOf(SM_KEY)),
  );
  const smFresh = seatMatrix.filter((r) => !smExisting.has(keyOf(SM_KEY)(r)));
  const smSeats = seatMatrix.reduce((s, r) => s + (r.totalSeats || 0), 0);

  // ── 2. announcements ─────────────────────────────────────────────────
  const annExisting = new Set(
    (await db.collection('announcements').find({}, { projection: { date: 1, title: 1 } }).toArray())
      .map(keyOf(ANN_KEY)),
  );
  const annFresh = announcements.filter((r) => !annExisting.has(keyOf(ANN_KEY)(r)));

  // ── 3. the dental crossings ──────────────────────────────────────────
  const nameById = new Map();
  for (const c of await db.collection('colleges').find({}, { projection: { name: 1 } }).toArray()) {
    nameById.set(String(c._id), c.name);
  }
  const crossings = (await db.collection('allotments')
    .find({ course: 'BDS', collegeId: { $nin: [null, ''] } }, { projection: { collegeId: 1 } }).toArray())
    .filter((a) => { const n = nameById.get(String(a.collegeId)); return n && !isDental(n); });

  console.log(`\n  seatMatrix    : ${seatMatrix.length} in payload, ${smFresh.length} new  (${smSeats.toLocaleString()} seats)`);
  console.log(`  announcements : ${announcements.length} in payload, ${annFresh.length} new`);
  console.log(`  BDS rows on a non-dental college (to unlink): ${crossings.length}`);
  console.log(`  prod now: seatMatrix ${await db.collection('seatMatrix').countDocuments()}, announcements ${await db.collection('announcements').countDocuments()}`);

  // If this ever reports far more than the known 509, the detector is wrong, not the data.
  if (crossings.length > 5000) {
    console.error(`\n  ABORT: ${crossings.length} crossings is implausible — refusing to mass-unlink.\n`);
    await client.close();
    process.exit(1);
  }

  if (!CONFIRM) {
    console.log('\n  DRY RUN — nothing written. Re-run with --confirm.\n');
    await client.close();
    return;
  }

  if (smFresh.length) {
    const ops = smFresh.map((r) => ({
      updateOne: {
        filter: Object.fromEntries(SM_KEY.map((k) => [k, r[k]])),
        update: { $setOnInsert: { ...r, createdAt: new Date(), updatedAt: new Date() } },
        upsert: true,
      },
    }));
    const res = await db.collection('seatMatrix').bulkWrite(ops, { ordered: false });
    console.log(`\n  seatMatrix upserted: ${res.upsertedCount}`);
  }

  if (annFresh.length) {
    const ops = annFresh.map((r) => ({
      updateOne: {
        filter: Object.fromEntries(ANN_KEY.map((k) => [k, r[k]])),
        update: { $setOnInsert: { ...r, createdAt: new Date(), updatedAt: new Date() } },
        upsert: true,
      },
    }));
    const res = await db.collection('announcements').bulkWrite(ops, { ordered: false });
    console.log(`  announcements upserted: ${res.upsertedCount}`);
  }

  if (crossings.length) {
    const res = await db.collection('allotments').updateMany(
      { _id: { $in: crossings.map((c) => c._id) } },
      { $unset: { collegeId: '' }, $set: { updatedAt: new Date() } },
    );
    console.log(`  allotment rows unlinked: ${res.modifiedCount}`);
  }

  const smAfter = await db.collection('seatMatrix').aggregate([
    { $group: { _id: null, rows: { $sum: 1 }, seats: { $sum: '$totalSeats' } } },
  ]).toArray();
  console.log(`\n  AFTER — seatMatrix ${smAfter[0]?.rows ?? 0} rows / ${(smAfter[0]?.seats ?? 0).toLocaleString()} seats`);
  console.log(`  AFTER — announcements ${await db.collection('announcements').countDocuments()}`);
  const stillBad = (await db.collection('allotments')
    .find({ course: 'BDS', collegeId: { $nin: [null, ''] } }, { projection: { collegeId: 1 } }).toArray())
    .filter((a) => { const n = nameById.get(String(a.collegeId)); return n && !isDental(n); }).length;
  console.log(`  AFTER — BDS rows still on a non-dental college: ${stillBad}`);
  console.log(`  users/submissions untouched: ${await db.collection('users').countDocuments()} / ${await db.collection('submissions').countDocuments()}\n`);
  await client.close();
}

main().catch((e) => { console.error(`\n  ERROR: ${e.message}\n`); process.exit(1); });
