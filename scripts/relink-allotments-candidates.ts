/**
 * Propose college matches for the highest-volume UNLINKED allotment institute names.
 *
 *   npx tsx scripts/relink-allotments-candidates.ts [--min-rows 200]
 *
 * Read-only. It prints candidates for a human to accept; it never writes. The accepted pairs go
 * into `scripts/data/allotment-relink.ts` as an explicit reviewed table, which
 * `scripts/relink-allotments.ts` then applies.
 *
 * Why a proposal step at all: the 57k rows still unlinked are the residue the automated matcher
 * already declined, i.e. exactly the cases where fuzzy scoring is unsafe (abbreviated deemed
 * names, duplicate college clusters, medical/dental sibling pairs on one campus). A wrong link
 * files one college's cutoffs under another and silently corrupts what students plan around, so
 * these get eyeballed rather than thresholded.
 */
import { connectDatabase, isMongoConnected, connection } from '../server/src/config/database';

const MIN_ROWS = Number(
  process.argv.includes('--min-rows') ? process.argv[process.argv.indexOf('--min-rows') + 1] : 200,
);

const STOP = new Set([
  'college', 'medical', 'sciences', 'science', 'institute', 'inst', 'of', 'and', 'the', 'hospital',
  'hospt', 'res', 'research', 'centre', 'center', 'university', 'univ', 'academy', 'city', 'new',
  'dr', 'shri', 'sri', 'govt', 'government', 'deemed', 'uni', 'med', 'mc', 'hos', 'foundation',
]);

const norm = (s: string) =>
  (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const tokens = (s: string) => norm(s).split(' ').filter((t) => t && !STOP.has(t));

/** DENTAL is never stopworded — it is the only token separating a dental college from its
 *  medical sibling on the same campus, and merging those two is a documented real bug. */
const kindOf = (s: string) => (/dental|dentistry|\bbds\b/i.test(s) ? 'dental' : 'medical');

/** Coverage of the shorter token set — allotment cells and college names abbreviate differently. */
function score(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  let hit = 0;
  for (const t of short) {
    if (long.includes(t)) { hit++; continue; }
    // tolerate spelling drift (Bengaluru/Bangalore, Deogarh/Deoghar)
    if (long.some((u) => u.length > 3 && t.length > 3 && (u.startsWith(t.slice(0, 4)) || t.startsWith(u.slice(0, 4))))) hit += 0.85;
  }
  return hit / short.length;
}

async function main() {
  await connectDatabase();
  if (!isMongoConnected()) {
    console.error('\n  MongoDB is not connected.\n');
    process.exit(1);
  }
  const allotments = connection.collection('allotments');
  const colleges = connection.collection('colleges');
  const closingRanks = connection.collection('closingRanks');

  const haveCutoffs = new Set((await closingRanks.distinct('collegeId')).map(String));

  const all = await colleges.find({}, { projection: { name: 1, state: 1, city: 1, type: 1 } }).toArray();
  const byState = new Map<string, typeof all>();
  for (const c of all) {
    const k = norm(c.state as string);
    if (!byState.has(k)) byState.set(k, []);
    byState.get(k)!.push(c);
  }

  const unlinked = await allotments
    .aggregate([
      { $match: { $or: [{ collegeId: null }, { collegeId: { $exists: false } }, { collegeId: '' }] } },
      { $group: { _id: { name: '$instituteName', state: '$state' }, rows: { $sum: 1 }, courses: { $addToSet: '$course' } } },
      { $match: { rows: { $gte: MIN_ROWS } } },
      { $sort: { rows: -1 } },
    ])
    .toArray();

  console.log(`\n  unlinked institute names with >= ${MIN_ROWS} rows: ${unlinked.length}`);
  console.log(`  (rows covered: ${unlinked.reduce((s, u) => s + u.rows, 0)})\n`);

  for (const u of unlinked) {
    const cellKind = kindOf(u._id.name as string);
    const pool = (byState.get(norm(u._id.state as string)) || []).filter((c) => kindOf(c.name as string) === cellKind);
    const ct = tokens(u._id.name as string);
    const ranked = pool
      .map((c) => ({ c, s: score(ct, tokens(c.name as string)) }))
      .filter((r) => r.s >= 0.5)
      .sort((a, b) => b.s - a.s)
      .slice(0, 3);

    console.log(`  ${String(u.rows).padStart(5)}  "${u._id.name}"  [${u._id.state}] ${cellKind} ${JSON.stringify(u.courses)}`);
    if (!ranked.length) {
      console.log('           NO CANDIDATE in this state — likely a college we do not hold');
    }
    for (const r of ranked) {
      const flag = haveCutoffs.has(String(r.c._id)) ? 'has-cutoffs' : 'NO-CUTOFFS';
      console.log(`           ${r.s.toFixed(2)}  ${r.c.name}  (${r.c.city || '?'}, ${r.c.type}) ${flag}  ${r.c._id}`);
    }
    console.log('');
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
