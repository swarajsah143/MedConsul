/**
 * Import the Collegedunia MBBS-college rankings snapshot into MongoDB.
 *
 *   npx tsx scripts/import-college-rankings.ts            # DRY RUN — validate/report only, no writes
 *   npx tsx scripts/import-college-rankings.ts --write    # upsert into MongoDB (non-destructive)
 *   npx tsx scripts/import-college-rankings.ts --write --replace   # also delete rows absent from the file
 *
 * This is a focused sibling of scripts/import-seed.ts: it uses the SAME upsert primitive
 * (resource().importMany, which UPSERTS on the schema's naturalKey), so it is idempotent —
 * re-running the same file changes counts by zero. It writes only `collegeRankings`, so it
 * does not touch canonical `colleges` or churn the 222k-row `allotments` collection.
 *
 * Source: data/seed/collegeRankings.json (parsed from the "MBBS Colleges in India: Fees 2026,
 * Rankings…" PDF). Natural key: (source, cdRank).
 */
import fs from 'fs';
import path from 'path';
import { connectDatabase, isMongoConnected } from '../server/src/config/database';
import { getSchema, type CollectionSchema } from '../server/src/schema/collections';
import { resource } from '../server/src/models/resource.model';

const WRITE = process.argv.includes('--write');
const REPLACE = process.argv.includes('--replace');
const FILE = path.resolve(__dirname, '../data/seed/collegeRankings.json');
const COLL = 'collegeRankings';

/** Keep only the fields the schema declares (drops anything stray). */
function cleanToSchema(row: any, schema: CollectionSchema): any {
  const out: Record<string, any> = {};
  for (const f of schema.fields) if (row[f.name] !== undefined) out[f.name] = row[f.name];
  return out;
}

async function main() {
  await connectDatabase();
  if (!isMongoConnected()) {
    console.error('\n  MongoDB not connected — set MONGODB_URI in .env\n');
    process.exit(1);
  }

  const schema = getSchema(COLL);
  if (!schema) { console.error(`\n  No schema registered for "${COLL}" — add it to collections.ts\n`); process.exit(1); }

  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const rows: any[] = Array.isArray(raw) ? raw : raw.items || raw.data || [];

  console.log(`\n  College-rankings import — ${WRITE ? (REPLACE ? 'WRITE + REPLACE' : 'WRITE (upsert)') : 'DRY RUN (validate only)'}`);
  console.log(`  source file: ${FILE}`);
  console.log(`  rows in file: ${rows.length}\n`);

  // --- validate against the schema before writing (required fields + natural key present) ---
  const key = schema.naturalKey ?? [];
  const required = schema.fields.filter((f) => f.required).map((f) => f.name);
  const problems: string[] = [];
  const cleaned = rows.map((row, i) => {
    for (const k of required) {
      if (row[k] === undefined || row[k] === null || row[k] === '')
        problems.push(`row ${i} (cdRank=${row.cdRank}): missing required "${k}"`);
    }
    return cleanToSchema(row, schema);
  });
  // natural-key uniqueness within the file
  const seen = new Set<string>();
  for (const [i, row] of cleaned.entries()) {
    const kv = key.map((k) => row[k]).join('|');
    if (seen.has(kv)) problems.push(`row ${i}: duplicate natural key (${kv})`);
    seen.add(kv);
  }
  if (problems.length) {
    console.error(`  ✗ ${problems.length} problem(s) — nothing written:`);
    for (const p of problems.slice(0, 20)) console.error(`      ${p}`);
    if (problems.length > 20) console.error(`      …and ${problems.length - 20} more`);
    process.exit(1);
  }
  console.log(`  ✓ all ${cleaned.length} rows carry the natural key (${key.join(', ')}) and required fields.`);

  if (!WRITE) {
    const withName = cleaned.filter((r) => r.name).length;
    const withFee = cleaned.filter((r) => r.feeDisplay).length;
    console.log(`  ✓ ${withName} have a name, ${withFee} have a fee. Re-run with --write to upsert.\n`);
    process.exit(0);
  }

  const res = resource(schema);
  const before = await res.count();
  const r = await res.importMany(cleaned, { replace: REPLACE });
  const after = await res.count();
  console.log(`\n  ${COLL}: +${r.created} created / ~${r.updated} updated${REPLACE ? ` / -${r.deleted} deleted` : ''}`);
  console.log(`  collection count: ${before} → ${after}\n  Done. ✓\n`);
  process.exit(0);
}

main().catch((e) => { console.error('\n  Import failed:', e?.message || e, '\n'); process.exit(1); });
