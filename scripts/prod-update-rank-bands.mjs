#!/usr/bin/env node
/**
 * Replace one year's rank-predictor curve on PRODUCTION. **Runs on the prod host.**
 *
 *   scp … scripts/prod-update-rank-bands.mjs scripts/data/rank-bands-2025.json ec2-user@<host>:/tmp/
 *   ssh … 'cd /opt/medconsul/server && node /tmp/prod-update-rank-bands.mjs /tmp/rank-bands-2025.json'
 *   ssh … 'cd /opt/medconsul/server && node /tmp/prod-update-rank-bands.mjs /tmp/rank-bands-2025.json --confirm'
 *
 * WHY NOT THE ADMIN API's bulk import
 * `replace: true` there means "make the COLLECTION match this file" — it deletes every row absent
 * from the batch, which would wipe the 2023 and 2024 curves along with it. This script is scoped
 * to the single `year` present in the payload and leaves other years alone.
 *
 * The band boundaries themselves move during a recalibration, so the natural key (year, marksMin)
 * changes and a plain upsert would leave the old bands behind as overlapping strays — hence
 * delete-then-insert, but only within the one year.
 *
 * Touches `rankBands` only. Prints the resulting curve so the change is visible in the log.
 */
import { readFileSync } from 'fs';
import path from 'path';

const CONFIRM = process.argv.includes('--confirm');
const PAYLOAD = process.argv[2];
const ENV_PATH = '/opt/medconsul/.env';

if (!PAYLOAD || PAYLOAD.startsWith('--')) {
  console.error('\n  usage: node prod-update-rank-bands.mjs <bands.json> [--confirm]\n');
  process.exit(1);
}

function mongoUri() {
  const line = readFileSync(ENV_PATH, 'utf8').split('\n').find((l) => l.startsWith('MONGODB_URI='));
  if (!line) throw new Error(`MONGODB_URI not found in ${ENV_PATH}`);
  return line.slice('MONGODB_URI='.length).trim().replace(/^["']|["']$/g, '');
}

async function main() {
  const { MongoClient } = await import(
    path.join('/opt/medconsul/server/node_modules/mongodb/lib/index.js')
  ).catch(() => import('mongodb'));

  const bands = JSON.parse(readFileSync(PAYLOAD, 'utf8'));
  const years = [...new Set(bands.map((b) => b.year))];
  if (years.length !== 1) {
    console.error(`\n  ABORT: payload must contain exactly one year, found: ${years.join(', ')}\n`);
    process.exit(1);
  }
  const year = years[0];

  // A curve with a hole or an overlap silently mis-ranks everyone in the gap, and the predictor
  // interpolates without complaining — so check continuity here rather than discover it later.
  const sorted = [...bands].sort((a, b) => a.marksMin - b.marksMin);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].marksMin < sorted[i - 1].marksMax) {
      console.error(`\n  ABORT: bands overlap at ${sorted[i - 1].marksMin}-${sorted[i - 1].marksMax} / ${sorted[i].marksMin}-${sorted[i].marksMax}\n`);
      process.exit(1);
    }
  }
  for (const b of bands) {
    if (b.rankMin > b.rankMax || b.marksMin > b.marksMax) {
      console.error(`\n  ABORT: inverted band ${JSON.stringify(b)}\n`);
      process.exit(1);
    }
  }

  const client = new MongoClient(mongoUri());
  await client.connect();
  const rankBands = client.db().collection('rankBands');

  const existing = await rankBands.countDocuments({ year });
  console.log(`\n  year ${year}: ${existing} bands on prod -> ${bands.length} in payload`);
  console.log(`  other years untouched: ${(await rankBands.distinct('year')).filter((y) => y !== year).join(', ') || '(none)'}`);
  console.log('  continuity + ordering checks: PASS');

  if (!CONFIRM) {
    console.log('\n  DRY RUN — nothing written. Re-run with --confirm.\n');
    await client.close();
    return;
  }

  const del = await rankBands.deleteMany({ year });
  const ins = await rankBands.insertMany(
    bands.map((b) => ({ ...b, createdAt: new Date(), updatedAt: new Date() })),
  );
  console.log(`\n  deleted ${del.deletedCount}, inserted ${ins.insertedCount}`);

  console.log(`\n  resulting ${year} curve:`);
  for (const b of await rankBands.find({ year }).sort({ marksMax: -1 }).toArray()) {
    console.log(`    ${String(b.marksMin).padStart(3)}-${String(b.marksMax).padStart(3)}  ->  ${String(b.rankMin).padStart(8)}-${String(b.rankMax).padStart(8)}`);
  }
  console.log(`\n  rankBands total: ${await rankBands.countDocuments()}\n`);
  await client.close();
}

main().catch((e) => { console.error(`\n  ERROR: ${e.message}\n`); process.exit(1); });
