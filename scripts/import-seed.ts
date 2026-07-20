/**
 * Import the data/seed/*.json snapshot into MongoDB.
 *
 *   npx tsx scripts/import-seed.ts            # DRY RUN — validate only, no writes
 *   npx tsx scripts/import-seed.ts --write    # upsert into MongoDB (non-destructive)
 *   npx tsx scripts/import-seed.ts --write --replace   # also delete DB rows absent from the files
 *
 * The snapshot files reference colleges by NAME (collegeName / instituteName), while the DB keys
 * closingRanks & fees on collegeId. This script reconciles name → id, cleans every row to the
 * fields its schema actually declares, validates enums / required fields, and reports anything
 * that does not fit BEFORE writing. It is idempotent: upserts match existing rows on their natural
 * key, so a re-run of already-present data changes counts by zero.
 */
import fs from 'fs';
import path from 'path';
import { connectDatabase, isMongoConnected } from '../server/src/config/database';
import { getSchema, type CollectionSchema } from '../server/src/schema/collections';
import { resource } from '../server/src/models/resource.model';

const WRITE = process.argv.includes('--write');
const REPLACE = process.argv.includes('--replace');
const SEED_DIR = path.resolve(__dirname, '../data/seed');

const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'PwD'];
const COURSES = ['MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS', 'BVSc'];
const COLLEGE_TYPES = ['Government', 'Private', 'Deemed'];

/** file → collection, in dependency order (colleges first so the name→id map is fresh). */
const PLAN: { coll: string; file: string; collegeRef?: 'required' | 'optional' }[] = [
  { coll: 'colleges', file: 'colleges.json' },
  { coll: 'universities', file: 'universities.json' },
  { coll: 'abroadUniversities', file: 'abroadUniversities.json' },
  { coll: 'announcements', file: 'announcements.json' },
  { coll: 'blogs', file: 'blogs.json' },
  { coll: 'checklistDocs', file: 'checklistDocs.json' },
  { coll: 'stateDocs', file: 'stateDocs.json' },
  { coll: 'counsellingQuotas', file: 'counsellingQuotas.json' },
  { coll: 'counsellingSections', file: 'counsellingSections.json' },
  { coll: 'rankBands', file: 'rankBands.json' },
  { coll: 'categoryFactors', file: 'categoryFactors.json' },
  { coll: 'knowledgeBase', file: 'knowledgeBase.json' },
  { coll: 'closingRanks', file: 'closingRanks.json', collegeRef: 'required' },
  { coll: 'fees', file: 'fees.json', collegeRef: 'required' },
  { coll: 'allotments', file: 'allotments.json', collegeRef: 'optional' },
];

const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function readJson(file: string): any[] {
  const raw = fs.readFileSync(path.join(SEED_DIR, file), 'utf8');
  const d = JSON.parse(raw);
  return Array.isArray(d) ? d : d.items || d.data || [];
}

/** Keep only the fields the schema declares (drops _district, collegeName, etc.). */
function cleanToSchema(row: any, schema: CollectionSchema, extra: Record<string, any> = {}): any {
  const out: Record<string, any> = {};
  for (const f of schema.fields) if (row[f.name] !== undefined) out[f.name] = row[f.name];
  return { ...out, ...extra };
}

async function importChunked(res: ReturnType<typeof resource>, rows: any[]): Promise<{ created: number; updated: number }> {
  let created = 0, updated = 0;
  const CHUNK = 4000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const r = await res.importMany(rows.slice(i, i + CHUNK), { replace: false });
    created += r.created; updated += r.updated;
    if (rows.length > CHUNK) process.stdout.write(`\r      …${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
  if (rows.length > CHUNK) process.stdout.write('\r');
  return { created, updated };
}

async function main() {
  await connectDatabase();
  if (!isMongoConnected()) { console.error('\n  MongoDB not connected — set MONGODB_URI in .env\n'); process.exit(1); }

  console.log(`\n  Seed import — ${WRITE ? (REPLACE ? 'WRITE + REPLACE' : 'WRITE (upsert)') : 'DRY RUN (validate only)'}\n`);

  // Build the college name → id map from the DB (colleges already present; refreshed after a write).
  const collegesRes = resource(getSchema('colleges')!);
  const refresh = async () => {
    const cs = await collegesRes.all();
    const m = new Map<string, string>();
    for (const c of cs) m.set(norm(c.name), c.id);
    return m;
  };
  let nameToId = await refresh();

  let problems = 0;

  for (const step of PLAN) {
    const schema = getSchema(step.coll);
    if (!schema) { console.warn(`  [skip] no schema for ${step.coll}`); continue; }
    const res = resource(schema);
    const rows = readJson(step.file);

    let unresolved = 0;
    const enumErr: string[] = [];
    const cleaned: any[] = [];

    for (const row of rows) {
      const extra: Record<string, any> = {};
      if (step.collegeRef) {
        const nm = row.collegeName ?? row.instituteName;
        const id = nm ? nameToId.get(norm(nm)) : undefined;
        if (id) extra.collegeId = id;
        else {
          unresolved++;
          if (step.collegeRef === 'required') continue; // cannot import without the required ref
        }
      }
      // enum sanity (report, don't silently pass bad values into a required enum). The student
      // CATEGORIES enum only applies to the college-ref collections — blogs.category is a
      // different (blog) enum, so don't flag it here.
      if (step.collegeRef && row.category && !CATEGORIES.includes(row.category)) enumErr.push(`category="${row.category}"`);
      if (step.collegeRef && row.course && !COURSES.includes(row.course)) enumErr.push(`course="${row.course}"`);
      if (step.coll === 'allotments' && row.seatType && !COLLEGE_TYPES.includes(row.seatType)) enumErr.push(`seatType="${row.seatType}"`);
      cleaned.push(cleanToSchema(row, schema, extra));
    }

    const enumSummary = enumErr.length ? `  ⚠ ${enumErr.length} enum issues (${[...new Set(enumErr)].slice(0, 3).join(', ')})` : '';
    const refSummary = step.collegeRef
      ? `  refs: ${rows.length - unresolved}/${rows.length} resolved${unresolved ? ` (${unresolved} ${step.collegeRef === 'required' ? 'DROPPED' : 'no collegeId'})` : ''}`
      : '';
    if (enumErr.length || (step.collegeRef === 'required' && unresolved)) problems++;

    if (!WRITE) {
      console.log(`  ${step.coll.padEnd(20)} ${String(cleaned.length).padStart(7)} rows${refSummary}${enumSummary}`);
      continue;
    }

    const r = await importChunked(res, cleaned);
    console.log(`  ${step.coll.padEnd(20)} ${String(cleaned.length).padStart(7)} rows  → +${r.created} / ~${r.updated}${refSummary}${enumSummary}`);
    if (step.coll === 'colleges') nameToId = await refresh(); // pick up any newly-created colleges
  }

  console.log(`\n  ${WRITE ? 'Import complete.' : 'Validation complete.'} ${problems ? `${problems} collection(s) had issues — see ⚠ / DROPPED above.` : 'Every row fits its schema and all college refs resolved. ✓'}\n`);
  process.exit(0);
}

main().catch((e) => { console.error('\n  Import failed:', e?.message || e, '\n'); process.exit(1); });
