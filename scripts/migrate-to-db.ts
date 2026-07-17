/**
 * One-time migration: the app's hardcoded static data -> MongoDB, via the admin API.
 *
 *   npx tsx scripts/migrate-to-db.ts [--replace] [--dry]
 *
 * Lives at the repo root, outside both tsconfigs, because it reaches into the
 * client's data files AND the server's RAG module. It is not part of either build.
 *
 * It pushes through the real admin HTTP API rather than writing to Mongo directly,
 * so every row goes through the same validation the admin form uses — if the
 * migration passes, the API demonstrably works.
 *
 * THE HARD PART is college identity. Colleges previously existed in five files
 * under five unrelated id schemes (college-1, col-aiims, fee-1, u1, bare ints),
 * joined only by display names that do not match each other:
 *
 *     "All India Institute of Medical Sciences (AIIMS), New Delhi"   (college-data)
 *     "AIIMS, New Delhi"                                             (insights, fees)
 *
 * So we build ONE canonical colleges table and fuzzy-match the rest onto it.
 * Every match and every miss is printed. Nothing is guessed silently: a row that
 * cannot be matched confidently creates a new college, and that is reported too.
 */

import { MOCK_COLLEGES } from '../client/src/lib/college-data';
import { INSIGHTS_DATA } from '../client/src/lib/insights-data';
import { FEE_MATRIX_DATA } from '../client/src/lib/fee-matrix-data';
import { ANNOUNCEMENTS_DATA } from '../client/src/lib/announcements-data';
import { CHECKLIST_DOCS, STATE_WISE_DOCS } from '../client/src/lib/checklist-data';
import { MEDICAL_UNIVERSITIES, BLOGS } from '../client/src/lib/explore-data';
import { ABROAD_UNIVERSITIES } from '../client/src/lib/abroad-data';
import { knowledgeBase } from '../server/src/services/rag/retriever';

const API = process.env.API_URL || 'http://localhost:5050';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@medcounsel.ai';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '***REDACTED***';
const REPLACE = process.argv.includes('--replace');
const DRY = process.argv.includes('--dry');

// ── name reconciliation ────────────────────────────────────────────────

/** Strip everything that differs between the five naming conventions. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(([^)]*)\)/g, ' $1 ')       // keep the text inside parens: "(AIIMS)" -> "aiims"
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const STOP = new Set([
  'the', 'of', 'and', 'college', 'medical', 'institute', 'institutes', 'sciences',
  'science', 'hospital', 'university', 'govt', 'government', 'research', 'centre', 'center',
]);

function tokens(s: string): Set<string> {
  return new Set(norm(s).split(' ').filter((t) => t && !STOP.has(t)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

interface Canon {
  key: string;              // temp key used while building
  doc: Record<string, any>; // the college record we will POST
  toks: Set<string>;
  aliases: Set<string>;
  id?: string;              // filled in after insert
}

const canon: Canon[] = [];

/**
 * Find the canonical college for a name, or create one.
 * Requires the same city OR state to accept a fuzzy match — "Government Medical
 * College" appears in a dozen cities and would otherwise collapse into one row.
 */
function resolveCollege(
  name: string,
  info: { state?: string; city?: string; type?: string; totalSeats?: number; website?: string | null },
  origin: string,
  report: string[]
): Canon {
  const t = tokens(name);
  let best: Canon | null = null;
  let bestScore = 0;

  for (const c of canon) {
    const sameCity = info.city && c.doc.city && norm(info.city) === norm(c.doc.city);
    const sameState = info.state && c.doc.state && norm(info.state) === norm(c.doc.state);
    if (!sameCity && !sameState) continue;

    let score = jaccard(t, c.toks);
    if (sameCity) score += 0.15;             // same city is strong evidence
    if (score > bestScore) { bestScore = score; best = c; }
  }

  if (best && bestScore >= 0.45) {
    if (norm(name) !== norm(best.doc.name)) {
      best.aliases.add(name);
      report.push(`  alias   ${origin.padEnd(9)} "${name}"  ->  "${best.doc.name}"  (${bestScore.toFixed(2)})`);
    }
    return best;
  }

  const created: Canon = {
    key: norm(name),
    toks: t,
    aliases: new Set<string>(),
    doc: {
      name,
      state: info.state || '',
      city: info.city || '',
      type: info.type || 'Government',
      totalSeats: info.totalSeats ?? 0,
      website: info.website || '',
      isActive: true,
    },
  };
  canon.push(created);
  report.push(`  NEW     ${origin.padEnd(9)} "${name}"${best ? `  (closest "${best.doc.name}" scored only ${bestScore.toFixed(2)})` : ''}`);
  return created;
}

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

async function bulk(collection: string, rows: any[]): Promise<number> {
  if (!rows.length) return 0;
  if (DRY) { console.log(`  [dry] would insert ${rows.length} into ${collection}`); return rows.length; }

  const r = await fetch(`${API}/api/admin/resources/${collection}/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ rows, replace: REPLACE }),
  });
  const text = await r.text();
  let body: any = {};
  try { body = JSON.parse(text); } catch { /* non-JSON error page — show it raw below */ }

  if (!r.ok) {
    console.error(`\n  FAILED ${collection}: HTTP ${r.status} ${body.message || text.slice(0, 200)}`);
    (body.errors || []).slice(0, 8).forEach((e: any) =>
      console.error(`    row ${e.row} · ${e.field}: ${e.message}`));
    if (body.totalErrors > 8) console.error(`    ... and ${body.totalErrors - 8} more`);
    throw new Error(`bulk insert failed for ${collection}`);
  }
  return body.data.inserted;
}

// ── main ───────────────────────────────────────────────────────────────

const MONTHS: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

async function main() {
  console.log(`\nMedCounsel static data -> MongoDB  (${API})${DRY ? '  [DRY RUN]' : ''}${REPLACE ? '  [REPLACE]' : ''}\n`);
  await login();
  console.log('admin authenticated\n');

  // 1. Canonical colleges. MOCK_COLLEGES first — it is the richest source
  //    (review prose, gallery, pros/cons), so it seeds the canonical names.
  const report: string[] = [];
  console.log('Reconciling college identity across the old data files:');

  const byCollegeSrc = new Map<any, Canon>();
  for (const c of MOCK_COLLEGES as any[]) {
    const k = resolveCollege(c.name, c, 'reviews', report);
    Object.assign(k.doc, {
      description: c.description, thumbnail: c.thumbnail, established: c.established,
      affiliation: c.affiliation, website: c.website, totalSeats: c.totalSeats,
      coursesOffered: c.coursesOffered, neetCutoffRange: c.neetCutoffRange, annualFees: c.annualFees,
      about: c.about, facultyQuality: c.facultyQuality, campusInfrastructure: c.campusInfrastructure,
      hospitalFacilities: c.hospitalFacilities, clinicalExposure: c.clinicalExposure,
      patientLoad: c.patientLoad, hostelFacilities: c.hostelFacilities, studentLife: c.studentLife,
      pros: c.pros, cons: c.cons, gallery: c.gallery, reviewVideos: c.reviewVideos,
    });
    byCollegeSrc.set(c.id, k);
  }

  // insights embed a whole College object per row; collapse to unique ones first
  const insightCollegeById = new Map<string, any>();
  for (const e of INSIGHTS_DATA as any[]) if (!insightCollegeById.has(e.collegeId)) insightCollegeById.set(e.collegeId, e.college);
  const insightIdToCanon = new Map<string, Canon>();
  for (const [cid, col] of insightCollegeById) {
    insightIdToCanon.set(cid, resolveCollege(col.name, col, 'ranks', report));
  }

  // fees carry the college inline too
  const feeIdToCanon = new Map<string, Canon>();
  for (const f of FEE_MATRIX_DATA as any[]) {
    feeIdToCanon.set(f.id, resolveCollege(f.name, f, 'fees', report));
  }

  console.log(report.join('\n') || '  (nothing to reconcile)');
  console.log(`\n  => ${canon.length} canonical colleges from ${MOCK_COLLEGES.length} reviews + ${insightCollegeById.size} rank-colleges + ${new Set(FEE_MATRIX_DATA.map((f: any) => f.name)).size} fee-colleges\n`);

  for (const c of canon) c.doc.aliases = [...c.aliases];

  // 2. Insert colleges, then read them back to learn their real ids.
  const insertedColleges = await bulk('colleges', canon.map((c) => c.doc));
  console.log(`colleges            ${insertedColleges}`);

  if (!DRY) {
    const r = await fetch(`${API}/api/admin/resources/colleges?limit=500`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const items = (await r.json()).data.items as any[];
    const byName = new Map(items.map((i) => [norm(i.name), i.id]));
    for (const c of canon) {
      c.id = byName.get(norm(c.doc.name));
      if (!c.id) throw new Error(`could not resolve inserted id for "${c.doc.name}"`);
    }
  }

  const cid = (c: Canon) => (DRY ? '000000000000000000000000' : c.id!);

  // 3. Everything that now hangs off a real collegeId.
  console.log(`closingRanks        ${await bulk('closingRanks', (INSIGHTS_DATA as any[]).map((e) => ({
    collegeId: cid(insightIdToCanon.get(e.collegeId)!),
    year: e.year, round: e.round, course: e.course, category: e.category,
    quota: e.quota, closingRank: e.closingRank, closingScore: e.closingScore,
  })))}`);

  console.log(`fees                ${await bulk('fees', (FEE_MATRIX_DATA as any[]).map((f) => ({
    collegeId: cid(feeIdToCanon.get(f.id)!),
    course: f.course, category: f.category, quota: f.quota,
    tuitionFee: f.tuitionFee, hostelFee: f.hostelFee, miscCharges: f.miscCharges,
    securityDeposit: f.securityDeposit, totalFirstYear: f.totalFirstYear,
    govtSeats: f.govtSeats, mgmtSeats: f.mgmtSeats, nriSeats: f.nriSeats,
    yearWiseFees: f.yearWiseFees, feeBreakdown: f.feeBreakdown,
    scholarships: f.scholarships, paymentSchedule: f.paymentSchedule,
    refundPolicy: f.refundPolicy, bondDetails: f.bondDetails,
  })))}`);

  // 4. Independent collections.
  console.log(`announcements       ${await bulk('announcements', (ANNOUNCEMENTS_DATA as any[]).map((a) => ({
    // The old rows had month+day strings and NO year, so ordering was guesswork.
    // We assume 2025 and record a real date; correct any that are wrong in the admin UI.
    date: `2025-${MONTHS[a.month?.toUpperCase()] || '01'}-${String(a.day).padStart(2, '0')}`,
    title: a.title, announcementType: a.announcementType, state: a.state || '',
    shortDescription: a.shortDescription, documentLabel: a.documentLabel,
    documentUrl: a.documentUrl || '',
  })))}`);

  console.log(`checklistDocs       ${await bulk('checklistDocs', (CHECKLIST_DOCS as any[]).map((d) => ({
    name: d.name, section: d.section, mandatory: d.mandatory, format: d.format,
    fileSize: d.fileSize || '', notes: d.notes,
    states: d.states, categories: d.categories, counsellingTypes: d.counsellingTypes,
  })))}`);

  console.log(`stateDocs           ${await bulk('stateDocs', (STATE_WISE_DOCS as any[]).map((s) => ({
    state: s.state, checklistType: s.checklistType, documents: s.documents,
  })))}`);

  console.log(`universities        ${await bulk('universities', (MEDICAL_UNIVERSITIES as any[]).map((u) => ({
    name: u.name, state: u.state, city: u.city, type: u.type, established: u.established,
    courses: u.courses, branches: u.branches, website: u.website, image: u.image,
  })))}`);

  console.log(`blogs               ${await bulk('blogs', (BLOGS as any[]).map((b) => ({
    title: b.title, category: b.category, excerpt: b.excerpt, author: b.author,
    date: b.date, readTime: b.readTime, tags: b.tags,
    // Every blog in the static data had url: '#' — i.e. it links nowhere. Store that
    // as "no url" rather than a fake link, so the admin can see which posts need one.
    url: !b.url || b.url === '#' ? '' : b.url,
  })))}`);

  console.log(`abroadUniversities  ${await bulk('abroadUniversities', (ABROAD_UNIVERSITIES as any[]).map((a) => ({
    name: a.name, country: a.country, flag: a.flag, city: a.city, degree: a.degree,
    durationYears: a.durationYears, medium: a.medium,
    tuitionPerYearUSD: a.tuitionPerYearUSD, livingCostPerYearUSD: a.livingCostPerYearUSD,
    rating: a.rating, recognitions: a.recognitions, highlight: a.highlight, image: a.image,
  })))}`);

  console.log(`knowledgeBase       ${await bulk('knowledgeBase', (knowledgeBase as any[]).map((k) => ({
    title: k.title, content: k.content, tags: k.tags,
  })))}`);

  console.log(`
allotments          0  <-- DELIBERATELY EMPTY

  The old allotment "data" was not data. allotment-data.ts contained a seeded
  PRNG that fabricated rows at runtime. Importing its output would launder
  invented numbers into a database that looks authoritative, which is worse
  than an empty table. The collection and its CSV import are ready; load real
  allotment rows through the admin UI.

Done.
`);
}

main().catch((e) => { console.error('\nMIGRATION FAILED:', e.message); process.exit(1); });
