#!/usr/bin/env node
/**
 * Imports the fetched data into MedConsul via the admin API.
 *
 * Order is load-bearing: `colleges` must exist before anything that references it,
 * because closingRanks/fees/allotments carry a real `collegeId` foreign key and the
 * bulk route rejects the whole batch if a ref does not resolve. So we import colleges,
 * read their ids back, then rewrite `collegeName` -> `collegeId` on the child rows.
 *
 * Everything upserts on each collection's naturalKey, so re-running this is idempotent
 * and does NOT mint new ObjectIds (which would orphan every child row).
 *
 * Usage: node import.mjs [--dry] [only,these,collections]
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const API = process.env.API || 'http://localhost:5050';
const OUT = path.join(import.meta.dirname, 'out');
const DRY = process.argv.includes('--dry');
// argv[0] is the node binary and argv[1] is this script — a bare `.find()` over the whole
// array matches the node PATH first, which made ONLY = ['/usr/local/bin/node'] and turned
// want() false for EVERY collection. The importer then silently imported nothing and still
// exited 0. Only the user's own args (argv[2:]) are ever a collection filter.
const ONLY = process.argv.slice(2).find((a) => !a.startsWith('--'))?.split(',');

const read = (f) => (existsSync(path.join(OUT, f)) ? JSON.parse(readFileSync(path.join(OUT, f), 'utf8')) : null);

async function login() {
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@medcounsel.ai', password: '***REDACTED***' }),
  });
  const j = await r.json();
  if (!j.success) throw new Error(`login failed: ${j.message}`);
  return j.data.accessToken || j.data.token;
}

/**
 * Collections whose entire real contents are staged in out/, so the file is the whole
 * truth and anything else in the table is the shipped demo content. `replace` upserts
 * the file and then deletes every row whose natural key is not in it.
 *
 * Deliberately NOT listed: colleges/closingRanks/allotments — replace would delete any row
 * missing from the file, orphaning FK children (and allotments is chunked, so a replace could
 * only ever see one chunk of it anyway).
 *
 * fees and blogs joined this list once real data existed for them. Both REPLACE rather than
 * top up on purpose: the rows already in those tables are the shipped demo content, and their
 * natural keys do not collide with the real rows, so an upsert would leave fabricated and
 * sourced rows sitting side by side with no way to tell them apart.
 */
const REPLACE = new Set([
  'announcements', 'checklistDocs', 'stateDocs', 'counsellingQuotas',
  'counsellingSections', 'universities', 'abroadUniversities', 'knowledgeBase',
  'fees', 'blogs',
]);

// The bulk route hard-caps a batch at 20k rows, and express.json caps the body at 25mb.
// allotments is 162k rows / 49mb, so it must go up in chunks. 5k keeps every body ~2mb.
const CHUNK = 5000;

async function post(token, collection, rows, replace) {
  const r = await fetch(`${API}/api/admin/resources/${collection}/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ rows, replace }),
  });
  const j = await r.json();
  if (!j.success) {
    console.error(`\n  ✗ ${collection}: ${j.message}`);
    (j.errors || []).slice(0, 8).forEach((e) => console.error(`      row ${e.row} · ${e.field}: ${e.message}`));
    if (j.totalErrors > 8) console.error(`      ... and ${j.totalErrors - 8} more`);
    return null;
  }
  return j.data;
}

async function bulk(token, collection, rows) {
  // `replace` deletes whatever is not in the batch, so it may only ride on a SINGLE
  // batch that holds the whole collection. Sending it with each chunk would make every
  // chunk delete the one before it.
  const replace = REPLACE.has(collection);
  if (replace && rows.length > CHUNK) throw new Error(`${collection}: replace cannot be chunked`);

  const total = { inserted: 0, updated: 0, deleted: 0 };
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const d = await post(token, collection, chunk, replace);
    if (!d) return null;
    total.inserted += d.inserted || 0;
    total.updated += d.updated || 0;
    total.deleted += d.deleted || 0;
    if (rows.length > CHUNK) {
      process.stdout.write(`\r  · ${collection.padEnd(20)} ${Math.min(i + CHUNK, rows.length)}/${rows.length} rows`);
    }
  }
  if (rows.length > CHUNK) process.stdout.write('\r\x1b[K');
  const purged = total.deleted ? `, ${total.deleted} demo rows purged` : '';
  console.log(`  ✓ ${collection.padEnd(20)} ${String(rows.length).padStart(6)} rows  (${total.inserted} new, ${total.updated} updated${purged})`);
  return total;
}

/** Paginate the admin list endpoint (hard-capped at 500/page) to map name -> _id. */
async function collegeIdMap(token) {
  const map = new Map();
  for (let page = 1; ; page++) {
    const r = await fetch(`${API}/api/admin/resources/colleges?page=${page}&limit=500`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    if (!j.success) throw new Error(`could not list colleges: ${j.message}`);
    for (const c of j.data.items) map.set(c.name, c.id);
    if (page >= j.data.pages) break;
  }
  return map;
}

/** Rewrite the `collegeName` placeholder into a real `collegeId` ref. */
function resolveRefs(rows, map, label) {
  const out = [];
  const orphans = new Map();
  for (const row of rows) {
    const { collegeName, ...rest } = row;
    const id = map.get(collegeName);
    if (!id) {
      orphans.set(collegeName, (orphans.get(collegeName) || 0) + 1);
      continue;
    }
    out.push({ ...rest, collegeId: id });
  }
  if (orphans.size) {
    console.warn(`  ! ${label}: ${orphans.size} college(s) not in the colleges table, ${[...orphans.values()].reduce((a, b) => a + b, 0)} rows dropped`);
    [...orphans.entries()].slice(0, 5).forEach(([n, c]) => console.warn(`      "${n}" (${c} rows)`));
  }
  return out;
}

const want = (c) => !ONLY || ONLY.includes(c);

async function main() {
  const token = await login();
  console.log(`\n  ${DRY ? 'DRY RUN — nothing will be written' : `importing into ${API}`}\n`);

  // 1. colleges first — everything below references them.
  const colleges = read('colleges.json');
  if (colleges && want('colleges')) {
    if (DRY) console.log(`  · colleges           ${String(colleges.length).padStart(6)} rows (dry)`);
    else if (!(await bulk(token, 'colleges', colleges))) return;
  }

  // 2. build the name -> id map from what is actually in the DB now.
  const map = await collegeIdMap(token);
  console.log(`  · resolved ${map.size} college ids\n`);

  // 3. children that carry a collegeId ref.
  for (const c of ['closingRanks', 'fees', 'allotments']) {
    const rows = read(`${c}.json`);
    if (!rows?.length || !want(c)) continue;
    const resolved = c === 'allotments'
      ? rows.map((r) => { const { collegeName, ...rest } = r; const id = map.get(collegeName); return id ? { ...rest, collegeId: id } : rest; })
      : resolveRefs(rows, map, c);
    if (DRY) console.log(`  · ${c.padEnd(20)} ${String(resolved.length).padStart(6)} rows (dry)`);
    else await bulk(token, c, resolved);
  }

  // 4. standalone collections — no refs, order does not matter.
  for (const c of ['rankBands', 'categoryFactors', 'announcements', 'checklistDocs', 'stateDocs',
                   'counsellingQuotas', 'counsellingSections', 'universities', 'blogs',
                   'abroadUniversities', 'knowledgeBase']) {
    const rows = read(`${c}.json`);
    if (!rows?.length || !want(c)) continue;
    if (DRY) console.log(`  · ${c.padEnd(20)} ${String(rows.length).padStart(6)} rows (dry)`);
    else await bulk(token, c, rows);
  }
  console.log();
}

main().catch((e) => { console.error(e); process.exit(1); });
