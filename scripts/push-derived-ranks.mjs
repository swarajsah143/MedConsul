#!/usr/bin/env node
/**
 * Push the locally-derived closing ranks (and the colleges they need) to another environment
 * through the ADMIN API — the same path `data/import.mjs` uses.
 *
 *   MEDC_PUSH_PASSWORD=... node scripts/push-derived-ranks.mjs --dry
 *   MEDC_PUSH_PASSWORD=... node scripts/push-derived-ranks.mjs --confirm
 *
 *   API=https://medconsul.earthlingaidtech.com   (default)
 *   MEDC_PUSH_EMAIL=admin@medcounsel.ai          (default)
 *
 * WHY THROUGH THE API AND NOT mongorestore
 * A dump/restore would carry users, refresh tokens and document submissions with it — production
 * holds the ONLY copy of those, and `pull-prod.sh` is one-way for exactly that reason. This writes
 * domain rows only, through the same validation and natural-key upsert the admin panel uses, so it
 * can never touch an account and re-running it is a no-op.
 *
 * WHY ROWS CARRY `collegeName`, NOT `collegeId`
 * Creating a college on the target mints a NEW ObjectId there. A local `collegeId` is meaningless
 * on another environment unless that row already existed with the same id. So colleges go first,
 * their ids are read back, and every rank row is resolved by NAME. A row whose college cannot be
 * resolved is DROPPED and reported — never sent with a dangling ref, which the bulk route would
 * reject for the whole batch anyway.
 */
import { readFileSync } from 'fs';

const API = process.env.API || 'https://medconsul.earthlingaidtech.com';
const EMAIL = process.env.MEDC_PUSH_EMAIL || 'admin@medcounsel.ai';
const PASSWORD = process.env.MEDC_PUSH_PASSWORD;
const CONFIRM = process.argv.includes('--confirm');
const DIR = process.argv[process.argv.indexOf('--dir') + 1] || '.';
const CHUNK = 5000;

if (!PASSWORD) {
  console.error('\n  MEDC_PUSH_PASSWORD is not set. Refusing to guess an admin password.\n');
  process.exit(1);
}

const read = (f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'));

async function login() {
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`login failed (${r.status}): ${d.message || 'unknown'}`);
  return d.data?.accessToken || d.accessToken || d.data?.token;
}

async function bulk(token, collection, rows) {
  let created = 0;
  let updated = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const r = await fetch(`${API}/api/admin/resources/${collection}/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      // replace:false — never delete rows absent from this batch. This is a gap-fill, and a
      // replace here would wipe every published cutoff the batch does not mention.
      body: JSON.stringify({ rows: chunk, replace: false }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${collection} bulk failed (${r.status}): ${JSON.stringify(d).slice(0, 400)}`);
    created += d.data?.created ?? 0;
    updated += d.data?.updated ?? 0;
    process.stdout.write(`    ${collection}: ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`);
  }
  console.log(`    ${collection}: created ${created}, updated ${updated}                `);
  return { created, updated };
}

async function collegeMap(token) {
  const map = new Map();
  for (let page = 1; ; page++) {
    const r = await fetch(`${API}/api/admin/resources/colleges?page=${page}&limit=500`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    const items = d.data?.items || [];
    for (const c of items) map.set(c.name, c.id || c._id);
    if (items.length < 500) break;
  }
  return map;
}

async function main() {
  console.log(`\n  target: ${API}`);
  const rows = read('derived-rows.json');
  const missing = read('missing-colleges.json');
  const collegeDocs = read('missing-college-docs.json');

  console.log(`  derived rows to push : ${rows.length}`);
  console.log(`  colleges to create   : ${collegeDocs.length}  ${missing.length !== collegeDocs.length ? '(MISMATCH!)' : ''}`);

  if (!CONFIRM) {
    console.log('\n  DRY RUN — nothing sent. Re-run with --confirm.\n');
    return;
  }

  const token = await login();
  console.log('  authenticated.');

  if (collegeDocs.length) {
    console.log('\n  [1/2] creating missing colleges');
    await bulk(token, 'colleges', collegeDocs);
  }

  console.log('\n  [2/2] resolving college names -> target ids');
  const map = await collegeMap(token);
  const resolved = [];
  const orphans = new Map();
  for (const { collegeName, ...rest } of rows) {
    const id = map.get(collegeName);
    if (!id) { orphans.set(collegeName, (orphans.get(collegeName) || 0) + 1); continue; }
    resolved.push({ ...rest, collegeId: id });
  }
  if (orphans.size) {
    console.log(`    DROPPED ${[...orphans.values()].reduce((a, b) => a + b, 0)} rows for ${orphans.size} unresolved colleges:`);
    [...orphans].slice(0, 10).forEach(([n, c]) => console.log(`      ${c}  ${n}`));
  }
  console.log(`    resolved: ${resolved.length}/${rows.length}`);
  await bulk(token, 'closingRanks', resolved);
  console.log('\n  done.\n');
}

main().catch((e) => { console.error(`\n  ERROR: ${e.message}\n`); process.exit(1); });
