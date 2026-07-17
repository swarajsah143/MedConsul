/**
 * Import the NEET cutoff dataset from the sibling `neet` project into MedCounsel.
 *
 *   npx tsx scripts/import-neet.ts [--dry] [--src /path/to/neet]
 *
 * Brings in, from ../neet/data/:
 *
 *   neet_cutoffs.csv    5,853 closing ranks · 848 colleges · 33 states · 2024+2025
 *   marks_to_rank.json  the score->rank curves that drive the Rank Predictor
 *
 * MedCounsel shipped with 29 colleges and 279 ranks. This is the real dataset.
 *
 * ── Three things this script is careful about ────────────────────────────
 *
 * 1. IT DOES NOT CLOBBER THE CURATED COLLEGES. Many of our 29 colleges also appear in the
 *    CSV under a different name ("AIIMS New Delhi" vs "All India Institute of Medical
 *    Sciences (AIIMS), New Delhi"). Those 29 carry hand-written review prose, galleries and
 *    pros/cons. So a college we already have is MATCHED, not re-posted: the only thing
 *    written back to it is the CSV's spelling, as an alias. Only genuinely new colleges are
 *    created, and `replace` is never sent, so nothing is ever deleted.
 *
 * 2. IT DOES NOT INVENT DATA. The CSV carries only (College, State), so:
 *
 *      city  <- the name's trailing comma ("B.J. Medical College, Ahmedabad"), the
 *               "AIIMS <city>" pattern, then a city vocabulary learned from the other
 *               names ("Agartala Government Medical College" -> Agartala). ~27 end up with
 *               NO city. They are left blank and listed, because a made-up city would
 *               silently corrupt the matcher below, which uses the city to tell apart the
 *               dozen different colleges all called "Government Medical College". Their
 *               closing ranks still import — a blank city costs nothing, a wrong one does.
 *
 *      type  <- Deemed-quota seats => Deemed. AIQ seats => Government, because AIQ IS
 *               defined as 15% of government-college seats plus the central institutes.
 *               Neither => Private, because a government college always contributes to AIQ.
 *
 *      state <- 189 rows leave it blank. Where another row of the same file names the same
 *               city, it is recovered from there; the rest come from STATE_BY_CITY below.
 *
 *    Every inference is counted and printed, and anything genuinely unresolvable is skipped
 *    and named rather than guessed. Colleges stay admin-editable, so a wrong one is a fix
 *    in the UI rather than a re-run.
 *
 * 3. IT WOULD RATHER LEAVE A DUPLICATE THAN MAKE A BAD MERGE. See the reconciliation notes
 *    below. A duplicate college is visible and mergeable; a false match silently welds one
 *    college's cutoffs onto another and nobody ever finds out.
 *
 * Re-running is safe and means the same thing every time: every write is an upsert on the
 * collection's natural key (closingRanks is keyed on college x year x round x course x
 * category x quota — exactly the CSV's grain), so a second run creates nothing.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API = process.env.API_URL || 'http://localhost:5050';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@medcounsel.ai';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '***REDACTED***';
const DRY = process.argv.includes('--dry');

const srcFlag = process.argv.indexOf('--src');
const SRC = srcFlag !== -1 && process.argv[srcFlag + 1]
  ? process.argv[srcFlag + 1]
  : resolve(import.meta.dirname, '../../neet');

// ── the CSV's vocabulary vs ours ───────────────────────────────────────

const CATEGORY: Record<string, string> = {
  OPEN: 'General', OBC: 'OBC', SC: 'SC', ST: 'ST', EWS: 'EWS',
};

// "Stray" is the Stray Vacancy round — a real 4th round, not a missing value.
const ROUND: Record<string, number> = {
  'Round 1': 1, 'Round 2': 2, 'Round 3': 3, Stray: 4,
};

/**
 * The CSV leaves `State` blank on 189 rows (39 colleges). It is not unknowable — every
 * one of them is a city whose state is a plain matter of fact — but it is not recoverable
 * from the file either, so it is written down HERE, explicitly and reviewably, rather
 * than being quietly inferred somewhere in the middle of the import.
 *
 * Do not be tempted to fill these from one cluster. The blanks look like Andhra Pradesh at
 * first glance (Srikakulam, Eluru, Nandyal...) — but 21 of the 35 are Gujarat. Assuming
 * would have silently filed twenty-one Gujarat colleges under the wrong state.
 */
const STATE_BY_CITY: Record<string, string> = {
  // Gujarat
  amreli: 'Gujarat', bharuch: 'Gujarat', bhuj: 'Gujarat', dahod: 'Gujarat',
  gandhinagar: 'Gujarat', godhra: 'Gujarat', himmatnagar: 'Gujarat', junagadh: 'Gujarat',
  karamsad: 'Gujarat', mehsana: 'Gujarat', morbi: 'Gujarat', nadiad: 'Gujarat',
  navsari: 'Gujarat', palanpur: 'Gujarat', patan: 'Gujarat', porbandar: 'Gujarat',
  rajpipla: 'Gujarat', surendranagar: 'Gujarat', vadnagar: 'Gujarat', valsad: 'Gujarat',
  visnagar: 'Gujarat',
  // Andhra Pradesh
  amalapuram: 'Andhra Pradesh', chinakakani: 'Andhra Pradesh', chinoutpalli: 'Andhra Pradesh',
  chinthareddypalem: 'Andhra Pradesh', eluru: 'Andhra Pradesh', kadapa: 'Andhra Pradesh',
  kuppam: 'Andhra Pradesh', machilipatnam: 'Andhra Pradesh', nandyal: 'Andhra Pradesh',
  nellimarla: 'Andhra Pradesh', paderu: 'Andhra Pradesh', rajahmundry: 'Andhra Pradesh',
  renigunta: 'Andhra Pradesh', srikakulam: 'Andhra Pradesh',
};

/** Their quota is a 3-value code; ours is the free text a counsellor would actually say. */
function quotaLabel(code: string, state: string): string {
  if (code === 'AIQ') return 'All India Quota (AIQ)';
  if (code === 'Deemed') return 'Deemed Quota';
  if (code === 'State') return `${state} State Quota`;
  return code;
}

// ── name reconciliation ────────────────────────────────────────────────
//
// This is the part that can silently corrupt the database, so it is deliberately
// conservative. migrate-to-db.ts matches five spellings of the SAME college across our
// own files; here we must instead keep 848 DIFFERENT colleges apart. Precision beats
// recall: a missed match creates a duplicate college an admin can merge, but a false
// match welds one college's cutoffs onto another and nobody ever notices.
//
// Its predecessor — plain Jaccard over a big stopword list — proposed
// "Government Dental College, Ahmedabad" -> "B.J. Medical College, Ahmedabad",
// because after stripping government/dental/college/medical both names reduced to
// {ahmedabad}. Four rules fix that:
//
//   1. IDF weighting.   "medical" appears in 777 of 877 names (idf 0.12); "stanley" in 2
//                       (idf 5.68). Shared generic words are near-worthless evidence.
//   2. The city is matched exactly and REMOVED from the name tokens. It is a rare token,
//      so leaving it in let two unrelated Chennai colleges look similar on the strength
//      of the word "Chennai" — double-counting a thing we already require.
//   3. A shared DISTINCTIVE word is mandatory — one that says WHICH college, not what kind.
//      "Saveetha Medical College, Chennai" and "Stanley Medical College, Chennai" share
//      none. See STRUCTURAL for why this is a word list and not a frequency cutoff.
//   4. Containment, not symmetric overlap, so "SMS Medical College" scores 1.0 inside
//      "Sawai Man Singh (SMS) Medical College" rather than being punished for the words
//      it omits.
//
// Verified by hand against all 848 CSV names x our 29 curated colleges.

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(([^)]*)\)/g, ' $1 ')       // keep what is inside parens: "(SMS)" -> "sms"
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const STOP = new Set(['the', 'of', 'and', 'at', 'for']);

/** "b j sharma" -> "bj sharma", so that "B.J." and "BJ" are the same token. */
function collapseInitials(words: string[]): string[] {
  const out: string[] = [];
  let run = '';
  for (const w of words) {
    if (w.length === 1) { run += w; continue; }
    if (run) { out.push(run); run = ''; }
    out.push(w);
  }
  if (run) out.push(run);
  return out;
}

function tokens(s: string): Set<string> {
  return new Set(collapseInitials(norm(s).split(' ').filter((t) => t && !STOP.has(t))));
}

/** Name tokens with the city removed — see rule 2 above. */
function nameTokens(name: string, city: string): Set<string> {
  const t = tokens(name);
  if (city) for (const c of tokens(city)) t.delete(c);
  return t;
}

const isDental = (s: string) => /\bdental\b/i.test(s);

/**
 * Words that describe what an institution IS, rather than which one it is. Two colleges
 * sharing only these share nothing at all.
 *
 * This has to be a list, not a frequency cutoff. The obvious move is "rare tokens are
 * distinctive", but the frequency bands overlap hopelessly: in 822 names `aiims` occurs 23
 * times and `patil` 25 — both are exactly the evidence we want — while `dental` (36),
 * `centre` (27), `state` (24), `shri` (23) and `university` (18) sit in the same band and
 * are worthless. No threshold separates them, because the difference is meaning, not count.
 *
 * Getting this wrong is not academic: with a frequency bar, "AIIMS New Delhi" shared no
 * "rare" word with "All India Institute of Medical Sciences (AIIMS), New Delhi" — their
 * only common token being `aiims` — so the two failed to match and AIIMS Delhi was
 * imported a second time.
 */
const STRUCTURAL = new Set([
  'medical', 'medicine', 'college', 'colleges', 'institute', 'institutes', 'institution',
  'sciences', 'science', 'hospital', 'hospitals', 'university', 'academy', 'school',
  'govt', 'government', 'state', 'central', 'autonomous', 'municipal', 'corporation',
  'research', 'centre', 'center', 'foundation', 'trust', 'society', 'education',
  'educational', 'higher', 'general', 'memorial', 'dental', 'health', 'group',
  'dr', 'shri', 'sri', 'smt', 'pt', 'pandit', 'late', 'prof',
]);

/** Is this token evidence about WHICH college, rather than scaffolding every name shares? */
const isDistinctive = (t: string) => !STRUCTURAL.has(t);

/**
 * Inverse document frequency over every college name we know about — used to WEIGHT the
 * score (a shared "medical" is worth almost nothing, a shared "stanley" almost everything).
 * It is deliberately NOT used to decide what counts as distinctive; see STRUCTURAL.
 */
class Idf {
  private df = new Map<string, number>();
  private n = 0;

  constructor(docs: Set<string>[]) {
    for (const d of docs) { this.n++; for (const t of d) this.df.set(t, (this.df.get(t) ?? 0) + 1); }
  }
  of(t: string): number { return Math.log(this.n / ((this.df.get(t) ?? 0) + 1)); }
  sum(t: Set<string>): number { let s = 0; for (const w of t) s += this.of(w); return s; }

  /** How much of the SMALLER name is present in the larger, weighted by distinctiveness. */
  containment(a: Set<string>, b: Set<string>): number {
    let shared = 0;
    for (const t of a) if (b.has(t)) shared += this.of(t);
    const denom = Math.min(this.sum(a), this.sum(b));
    return denom ? shared / denom : 0;
  }
}

/** Do these two names share a word that says WHICH college, not just what kind? */
function sharesDistinctive(a: Set<string>, b: Set<string>): boolean {
  for (const t of a) if (b.has(t) && isDistinctive(t)) return true;
  return false;
}

const MERGE = 0.55;    // at or above: the same college, alias it
const REVIEW = 0.30;   // between: create it, but tell the admin it might be a duplicate

/** Stamped on every college this import creates, so a re-run can tell its own work from
 *  the hand-curated records it must never treat as interchangeable. */
const SOURCE = 'neet-cutoffs-csv';

// ── http ───────────────────────────────────────────────────────────────

let token = '';

async function login() {
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!r.ok) throw new Error(`admin login failed (${r.status}): ${await r.text()}`);
  token = (await r.json()).data.accessToken;
}

const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

/**
 * Every page of a collection.
 *
 * The admin list endpoint hard-caps a page at 500 rows (resource.model.ts) and silently
 * clamps anything larger, so `?limit=5000` quietly returns 500. Asking once and trusting
 * it meant the college->id map was missing every college past the 500th, and 2,067 closing
 * ranks were dropped with "college id missing". Page until the server says we are done.
 */
async function listAll(collection: string): Promise<any[]> {
  const out: any[] = [];
  for (let page = 1; ; page++) {
    const r = await fetch(`${API}/api/admin/resources/${collection}?limit=500&page=${page}`, { headers: auth() });
    if (!r.ok) throw new Error(`GET ${collection} failed (${r.status}): ${await r.text()}`);
    const { data } = await r.json();
    const items = data.items ?? [];
    out.push(...items);
    if (!items.length || out.length >= (data.total ?? out.length) || page >= (data.pages ?? 1)) break;
  }
  return out;
}

/** Chunked so a 5,853-row body never hits the JSON limit, and so progress is visible. */
async function bulk(collection: string, rows: any[], chunk = 1000): Promise<void> {
  if (!rows.length) return;
  if (DRY) { console.log(`  [dry] would upsert ${rows.length} into ${collection}`); return; }

  let created = 0;
  let updated = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const r = await fetch(`${API}/api/admin/resources/${collection}/bulk`, {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({ rows: slice }),   // never `replace` — this must not delete
    });
    const text = await r.text();
    let body: any = {};
    try { body = JSON.parse(text); } catch { /* fall through to the raw error below */ }

    if (!r.ok) {
      console.error(`\n  FAILED ${collection} rows ${i}-${i + slice.length}: HTTP ${r.status} ${body.message || text.slice(0, 300)}`);
      (body.errors || []).slice(0, 10).forEach((e: any) =>
        console.error(`    row ${e.row} · ${e.field}: ${e.message}`));
      if (body.totalErrors > 10) console.error(`    ... and ${body.totalErrors - 10} more`);
      throw new Error(`bulk upsert failed for ${collection}`);
    }
    created += body.data.created ?? body.data.inserted ?? 0;
    updated += body.data.updated ?? 0;
    process.stdout.write(`\r  ${collection}: ${Math.min(i + chunk, rows.length)}/${rows.length}`);
  }
  console.log(`\r  ${collection}: ${created} created, ${updated} updated${' '.repeat(20)}`);
}

// ── csv ────────────────────────────────────────────────────────────────

/** Minimal RFC-4180 parse: the college names contain commas, so split-on-comma is wrong. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(cell); cell = ''; continue; }
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }

  const header = rows.shift()!.map((h) => h.trim());
  return rows
    .filter((r) => r.length === header.length && r.some((c) => c.trim()))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i].trim()])));
}

// ── main ───────────────────────────────────────────────────────────────

interface Canon {
  doc: Record<string, any>;
  toks: Set<string>;
  aliases: Set<string>;
  id?: string;
  isNew: boolean;
  gainedAlias: boolean;
}

async function main() {
  console.log(`\nNEET cutoff dataset -> MedCounsel  (${API})${DRY ? '  [DRY RUN]' : ''}`);
  console.log(`source: ${SRC}\n`);

  const csv = parseCsv(readFileSync(resolve(SRC, 'data/neet_cutoffs.csv'), 'utf8'));
  const meta = JSON.parse(readFileSync(resolve(SRC, 'data/marks_to_rank.json'), 'utf8'));
  console.log(`read ${csv.length.toLocaleString()} cutoff rows`);

  await login();
  console.log('admin authenticated\n');

  // ── 0. repair the blank States ────────────────────────────────────────
  // 189 rows (39 colleges) have an empty State — all Andhra Pradesh ones. It is not
  // missing information though, just a hole in these particular rows: the same cities
  // (Kadapa, Eluru...) carry "Andhra Pradesh" on OTHER rows of the very same file. So we
  // recover it from the dataset itself rather than typing in what we think it should be.
  const stateOfCity = new Map<string, string>();
  for (const r of csv) {
    const i = r.College.lastIndexOf(',');
    if (i === -1 || !r.State) continue;
    const city = norm(r.College.slice(i + 1));
    if (city && !stateOfCity.has(city)) stateOfCity.set(city, r.State);
  }
  let fromFile = 0;
  let fromTable = 0;
  const stillBlank = new Set<string>();
  for (const r of csv) {
    if (r.State) continue;
    const i = r.College.lastIndexOf(',');
    const city = i === -1 ? '' : norm(r.College.slice(i + 1));
    const found = stateOfCity.get(city);
    if (found) { r.State = found; fromFile++; continue; }
    if (STATE_BY_CITY[city]) { r.State = STATE_BY_CITY[city]; fromTable++; continue; }
    stillBlank.add(r.College);
  }
  if (fromFile || fromTable || stillBlank.size) {
    console.log(`\nRepairing the ${fromFile + fromTable + stillBlank.size} rows whose State the CSV left blank:`);
    console.log(`  ${fromFile} recovered from another row of the same file naming the same city`);
    console.log(`  ${fromTable} from STATE_BY_CITY (see the table in this script — 21 Gujarat, 14 Andhra Pradesh)`);
    if (stillBlank.size) {
      console.log(`  ${stillBlank.size} college(s) still have no state and are SKIPPED (not guessed):`);
      [...stillBlank].forEach((n) => console.log(`     ${n}`));
    }
  }

  // ── 1. what each college in the CSV looks like ────────────────────────
  // Fold the 5,853 rows down to one record per college, collecting the quota codes
  // it offers (which is what tells us whether it is Government / Private / Deemed).
  interface Src { name: string; state: string; quotas: Set<string>; courses: Set<string> }
  const srcColleges = new Map<string, Src>();
  for (const r of csv) {
    if (!r.State) continue;                    // reported above; never fabricated
    let s = srcColleges.get(r.College);
    if (!s) { s = { name: r.College, state: r.State, quotas: new Set(), courses: new Set() }; srcColleges.set(r.College, s); }
    s.quotas.add(r.Quota);
    s.courses.add(r.Course);
  }

  // city: the trailing comma covers ~91% ("B.J. Medical College, Ahmedabad")...
  const cityOf = new Map<string, string>();
  const vocab = new Set<string>();
  let fromComma = 0;
  for (const s of srcColleges.values()) {
    const i = s.name.lastIndexOf(',');
    if (i !== -1) {
      const city = s.name.slice(i + 1).trim();
      if (city && city.length > 2 && !/\d/.test(city)) {
        cityOf.set(s.name, city); vocab.add(city); fromComma++;
      }
    }
  }

  // ...an AIIMS is always "AIIMS <City>", which is how AIIMS Rishikesh / Deoghar /
  // Mangalagiri get one. Without this they would duplicate the AIIMS records we have.
  let fromAiims = 0;
  for (const s of srcColleges.values()) {
    if (cityOf.has(s.name)) continue;
    const m = s.name.match(/^AIIMS[,\s]+(.+)$/i);
    if (m) { cityOf.set(s.name, m[1].trim()); vocab.add(m[1].trim()); fromAiims++; }
  }

  // ...and for the rest, look for a city we already know inside the name
  // ("Agartala Government Medical College"). Longest first, so "New Delhi" beats "Delhi".
  const byLength = [...vocab].sort((a, b) => b.length - a.length);
  let fromVocab = 0;
  const noCity: string[] = [];
  for (const s of srcColleges.values()) {
    if (cityOf.has(s.name)) continue;
    const hay = ` ${norm(s.name)} `;
    const hit = byLength.find((c) => hay.includes(` ${norm(c)} `));
    if (hit) { cityOf.set(s.name, hit); fromVocab++; }
    else noCity.push(s.name);   // left BLANK, not guessed — and its ranks still import
  }

  const GOVT = /\b(govt|government|aiims|jipmer|esic|armed forces|military)\b/i;
  const typeOf = (s: Src) =>
    s.quotas.has('Deemed') ? 'Deemed'
      : s.quotas.has('AIQ') || GOVT.test(s.name) ? 'Government'
        : 'Private';

  const typeCount: Record<string, number> = { Government: 0, Private: 0, Deemed: 0 };
  for (const s of srcColleges.values()) typeCount[typeOf(s)]++;

  console.log('Deriving the fields the CSV does not carry:');
  console.log(`  city   ${fromComma} from the name's trailing comma, ${fromAiims} from the "AIIMS <city>" pattern, ${fromVocab} from a city vocabulary`);
  console.log(`         ${noCity.length} left BLANK — not guessed. Their closing ranks still import.`);
  console.log(`  type   ${typeCount.Government} Government (has AIQ seats, or the name says so)`);
  console.log(`         ${typeCount.Deemed} Deemed (has Deemed-quota seats)`);
  console.log(`         ${typeCount.Private} Private (no AIQ and no Deemed seats — a govt college always has AIQ)`);
  if (noCity.length) {
    console.log(`\n  no city (fill these in from the admin UI if you want them):`);
    noCity.slice(0, 8).forEach((n) => console.log(`     ${n}`));
    if (noCity.length > 8) console.log(`     ... and ${noCity.length - 8} more`);
  }

  // ── 2. reconcile against the colleges we already have ─────────────────
  const existing = await listAll('colleges');
  console.log(`\nReconciling ${srcColleges.size} CSV colleges against the ${existing.length} already in the database:`);

  const canon: Canon[] = existing.map((c: any) => ({
    doc: c,
    id: c.id ?? c._id,
    // Match on the name AND every alias it already carries, so a second run re-matches
    // through the alias the first run wrote.
    toks: nameTokens([c.name, ...(c.aliases ?? [])].join(' '), c.city ?? ''),
    aliases: new Set<string>(c.aliases ?? []),
    isNew: false,
    gainedAlias: false,
  }));

  const srcToks = new Map<string, Set<string>>();
  for (const s of srcColleges.values()) srcToks.set(s.name, nameTokens(s.name, cityOf.get(s.name) ?? ''));
  const idf = new Idf([...srcToks.values(), ...canon.map((c) => c.toks)]);

  const canonOf = new Map<string, Canon>();   // CSV name -> the college it belongs to
  const merged: string[] = [];
  const review: string[] = [];

  for (const s of srcColleges.values()) {
    const city = cityOf.get(s.name) ?? '';
    const t = srcToks.get(s.name)!;

    // An identical name is the same college — no further evidence needed, and no city
    // check, because the city is only ever a tiebreak BETWEEN different names. Skipping
    // this let "Bangalore Medical College and Research Institute (BMCRI)" fail the fuzzy
    // pass on a city mismatch and be treated as new; the natural key is the name, so the
    // upsert then landed right back on the curated record and stamped it as imported.
    const exact = canon.find((c) => norm(c.doc.name) === norm(s.name)
      || (c.aliases as Set<string>).size && [...c.aliases].some((a) => norm(a) === norm(s.name)));
    if (exact) { canonOf.set(s.name, exact); continue; }

    let best: Canon | null = null;
    let bestScore = 0;

    for (const c of canon) {
      // A dental college is not a medical college, whatever the names share.
      if (isDental(s.name) !== isDental(c.doc.name)) continue;

      // THE SAME CITY IS MANDATORY. Never fall back to the state.
      //
      // Containment is 1.0 for any short name sitting inside a longer one, so on state
      // alone it happily proposed "Narayan Medical College, Sasaram" -> "Anugrah Narayan
      // Magadh Medical College, Gaya" — structurally identical to "Grant Medical College,
      // Mumbai" -> "Grant Medical College & Sir JJ Group of Hospitals, Mumbai", which is
      // correct. The ONLY thing telling those two apart is the city. So the city is not a
      // tiebreak here, it is the evidence, and a college with no city simply does not
      // merge — it becomes its own record, which an admin can merge later.
      if (!city || !c.doc.city || norm(city) !== norm(c.doc.city)) continue;

      // Without a shared distinctive word there is no evidence at all — only the
      // generic "Medical College" scaffolding that every one of these names shares.
      if (!sharesDistinctive(t, c.toks)) continue;

      const score = idf.containment(t, c.toks);

      // Two different bars, because the two sides are not equally trustworthy.
      //
      // Against one of our 29 CURATED colleges, 0.55 is safe — every match at that bar
      // was checked by hand. But when BOTH records are unverified CSV strings, the same
      // bar merges "Malla Reddy Medical College for Women" into "Malla Reddy Institute of
      // Medical Sciences" (0.78) — two real, distinct colleges of one trust in one city.
      // No score separates that from "Krishna Vishwa Vidyapeeth" -> "Krishna Institute of
      // Medical Sciences" (0.59), which is the same college renamed. So for new-vs-new we
      // demand near-identity and report the rest: a duplicate college is a merge button in
      // the admin UI, while a bad merge silently fuses two colleges' cutoffs forever.
      //
      // "Unverified" means the record CAME FROM THIS IMPORT, which is provenance, so it is
      // read off the `source` stamp rather than guessed. Two wrong guesses to avoid:
      //
      //   isNew alone — on a second run the colleges the first run created are no longer
      //     new, so they would drop to the 0.55 bar and finally merge the Malla Reddys that
      //     run one deliberately kept apart. The import must mean the same thing every time.
      //
      //   "is the name in the CSV?" — several CURATED colleges are also named verbatim in
      //     the CSV, so this branded them unverified, held them to 0.85, and spawned a
      //     duplicate of each: "Pt Bhagwat Dayal Sharma PGIMS" (0.72), "Grant Government
      //     Medical College" (0.80), "Amrita School of Medicine" (0.61) all failed to merge.
      const unverified = c.isNew || c.doc.source === SOURCE;
      const bar = unverified ? 0.85 : MERGE;
      if (score > bestScore && score >= bar) { bestScore = score; best = c; }
    }

    if (best) {
      if (norm(s.name) !== norm(best.doc.name) && !best.aliases.has(s.name)) {
        best.aliases.add(s.name);
        best.gainedAlias = true;
        merged.push(`  ${bestScore.toFixed(2)}  "${s.name}"  ->  "${best.doc.name}"`);
      }
      canonOf.set(s.name, best);
      continue;
    }

    // Near-misses get created as their own college, but are REPORTED. This is exactly
    // where a duplicate hides, and it is a judgement call a human should make.
    let near: [number, string] | null = null;
    for (const c of canon) {
      if (isDental(s.name) !== isDental(c.doc.name)) continue;
      if (!city || !c.doc.city || norm(city) !== norm(c.doc.city)) continue;
      if (!sharesDistinctive(t, c.toks)) continue;
      const score = idf.containment(t, c.toks);
      if (score >= REVIEW && (!near || score > near[0])) near = [score, c.doc.name];
    }
    if (near) review.push(`  ${near[0].toFixed(2)}  "${s.name}"\n            might be  "${near[1]}"`);

    const created: Canon = {
      id: undefined,
      isNew: true,
      gainedAlias: false,
      toks: t,
      aliases: new Set<string>(),
      doc: {
        name: s.name,
        state: s.state,
        ...(city ? { city } : {}),          // blank rather than invented
        type: typeOf(s),
        coursesOffered: [...s.courses],
        isActive: true,
        source: SOURCE,
      },
    };
    canon.push(created);
    canonOf.set(s.name, created);
  }

  const fresh = canon.filter((c) => c.isNew);
  const aliased = canon.filter((c) => c.gainedAlias && !c.isNew);
  console.log(`  ${merged.length} CSV colleges are ones we already have under another name:`);
  merged.forEach((m) => console.log(m));
  console.log(`  ${fresh.length} are new and will be created`);
  if (review.length) {
    console.log(`\n  ${review.length} POSSIBLE DUPLICATE(S) — created separately, please check in the admin UI:`);
    review.forEach((r) => console.log(r));
  }

  // ── 3. write ──────────────────────────────────────────────────────────
  console.log('\nWriting:');

  // Matched colleges: ONLY the alias. Their curated prose/gallery/pros must survive.
  if (!DRY) {
    for (const c of aliased) {
      const r = await fetch(`${API}/api/admin/resources/colleges/${c.id}`, {
        method: 'PUT',
        headers: auth(),
        body: JSON.stringify({ aliases: [...c.aliases] }),
      });
      if (!r.ok) console.error(`  ! alias update failed for ${c.doc.name}: ${r.status}`);
    }
    if (aliased.length) console.log(`  colleges: ${aliased.length} existing records gained an alias (nothing else touched)`);
  }

  await bulk('colleges', fresh.map((c) => c.doc));

  // Re-read to pick up the ids Mongo assigned to the new ones.
  if (!DRY) {
    const after = await listAll('colleges');
    const byName = new Map(after.map((c: any) => [norm(c.name), c.id ?? c._id]));
    for (const c of canon) {
      if (!c.id) c.id = byName.get(norm(c.doc.name));
    }
  }

  // Closing ranks.
  const ranks: any[] = [];
  const skipped: Record<string, number> = {};
  for (const r of csv) {
    const c = canonOf.get(r.College);
    const category = CATEGORY[r.Category];
    const round = ROUND[r.Round];
    const rank = Number(r['Closing Rank']);
    const year = Number(r.Year);

    if (!c) { skipped['college has no state in the CSV'] = (skipped['college has no state in the CSV'] ?? 0) + 1; continue; }
    if (!category) { skipped[`unknown category "${r.Category}"`] = (skipped[`unknown category "${r.Category}"`] ?? 0) + 1; continue; }
    if (!round) { skipped[`unknown round "${r.Round}"`] = (skipped[`unknown round "${r.Round}"`] ?? 0) + 1; continue; }
    if (!Number.isFinite(rank) || rank < 1) { skipped['closing rank not a number'] = (skipped['closing rank not a number'] ?? 0) + 1; continue; }
    if (!Number.isFinite(year)) { skipped['year not a number'] = (skipped['year not a number'] ?? 0) + 1; continue; }
    if (!DRY && !c.id) { skipped['college id missing after insert'] = (skipped['college id missing after insert'] ?? 0) + 1; continue; }

    ranks.push({
      // In a dry run there are no real ids yet. Give each college a DISTINCT stand-in, or
      // every row would share one id and the dedupe below would report nonsense.
      collegeId: c.id ?? `dry${String(canon.indexOf(c)).padStart(21, '0')}`,
      year,
      round,
      course: r.Course,
      category,
      quota: quotaLabel(r.Quota, r.State),
      closingRank: rank,
    });
  }

  // The CSV has genuine duplicates on our natural key (the same college/year/round/
  // course/category/quota listed twice). Mongo's bulkWrite would apply both in the same
  // batch and count it twice; collapse to the most lenient (largest) closing rank, which
  // is the one a student could actually have got in on.
  const byKey = new Map<string, any>();
  for (const r of ranks) {
    const k = [r.collegeId, r.year, r.round, r.course, r.category, r.quota].join('|');
    const prev = byKey.get(k);
    if (!prev || r.closingRank > prev.closingRank) byKey.set(k, r);
  }
  const deduped = [...byKey.values()];
  if (deduped.length !== ranks.length) {
    console.log(`  (collapsed ${ranks.length - deduped.length} duplicate rows in the CSV to their most lenient closing rank)`);
  }

  await bulk('closingRanks', deduped);

  if (Object.keys(skipped).length) {
    console.log('\n  skipped rows:');
    for (const [why, n] of Object.entries(skipped)) console.log(`    ${n.toLocaleString().padStart(6)}  ${why}`);
  }

  // ── 4. the predictor curves ───────────────────────────────────────────
  const bands: any[] = [];
  for (const [year, table] of Object.entries<any[]>(meta.historicalMarksToRank ?? {})) {
    for (const b of table) {
      bands.push({
        year: Number(year),
        marksMin: b.marksMin, marksMax: b.marksMax,
        rankMin: b.rankMin, rankMax: b.rankMax,
      });
    }
  }
  await bulk('rankBands', bands);

  const factors = Object.entries<number>(meta.categoryRankFactor ?? {}).map(([cat, factor]) => ({
    category: CATEGORY[cat] ?? cat,
    factor,
  }));
  await bulk('categoryFactors', factors);

  // ── 5. what the app now has ───────────────────────────────────────────
  if (!DRY) {
    const [c, rk] = await Promise.all([listAll('colleges'), listAll('closingRanks')]);
    const states = new Set(c.map((x: any) => x.state).filter(Boolean));
    const years = [...new Set(rk.map((x: any) => x.year))].sort();
    console.log('\nMedCounsel now has:');
    console.log(`  ${c.length.toLocaleString()} colleges across ${states.size} states`);
    console.log(`  ${rk.length.toLocaleString()} closing ranks covering ${years.join(', ')}`);
    console.log(`  ${bands.length} rank bands, ${factors.length} category factors`);
  }

  console.log('\ndone. Re-running this is safe — every write is an upsert on the natural key.\n');
}

main().catch((e) => { console.error('\nERROR:', e.message, '\n'); process.exit(1); });
