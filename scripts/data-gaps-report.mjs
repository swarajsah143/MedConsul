#!/usr/bin/env node
/**
 * Generate the "data still to scrape" workbook handed to the interns.
 *
 *   node scripts/data-gaps-report.mjs            # -> dist-db/MedCounsel-data-gaps-<date>.xlsx
 *   MEDC_OUT=~/Desktop node scripts/data-gaps-report.mjs
 *
 * Reads LOCAL Mongo, which is the superset working copy (production trails it). Three sheets,
 * matching the format already circulated:
 *   1. "Colleges to scrape" — one row per college, MISSING per data type, sorted by state
 *   2. "Summary"            — totals + intern priorities
 *   3. "Fee gap by state"   — where the fee sourcing effort should go
 *
 * Output lands in dist-db/ (gitignored) — the workbook is a generated artifact, not source.
 */
import { readFileSync, mkdirSync } from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const OUT_DIR = process.env.MEDC_OUT || 'dist-db';
const REPO = path.resolve(import.meta.dirname, '..');

function mongoUri() {
  const line = readFileSync(path.join(REPO, '.env'), 'utf8')
    .split('\n')
    .find((l) => l.startsWith('MONGODB_URI='));
  if (!line) throw new Error('MONGODB_URI not found in repo-root .env');
  return line.slice('MONGODB_URI='.length).trim().replace(/^["']|["']$/g, '');
}

/** Run a mongosh eval and parse its JSON output. */
function q(js) {
  const out = execFileSync('mongosh', [mongoUri(), '--quiet', '--eval', js], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  return JSON.parse(out);
}

const rows = q(`
  const feeIds   = new Set(db.fees.distinct('collegeId').map(String));
  const rankIds  = new Set(db.closingRanks.distinct('collegeId').map(String));
  const allotIds = new Set(db.allotments.distinct('collegeId', { collegeId: { $nin: [null, ''] } }).map(String));
  const out = db.colleges.find({}, { name:1, state:1, city:1, type:1, website:1, about:1 })
    .sort({ state: 1, name: 1 }).toArray().map(c => {
      const id = String(c._id);
      return {
        name: c.name || '', state: c.state || '', city: c.city || '',
        type: c.type || '', website: c.website || '',
        fees:    feeIds.has(id)   ? '' : 'MISSING',
        review:  (c.about && String(c.about).trim()) ? '' : 'MISSING',
        ranks:   rankIds.has(id)  ? '' : 'MISSING',
        allot:   allotIds.has(id) ? '' : 'MISSING',
      };
    });
  print(JSON.stringify(out));
`);

const LABEL = { fees: 'fees', review: 'review', ranks: 'closingRanks', allot: 'allotments' };
for (const r of rows) {
  r.todo = Object.keys(LABEL).filter((k) => r[k] === 'MISSING').map((k) => LABEL[k]).join(', ');
}

const count = (k) => rows.filter((r) => r[k] === 'MISSING').length;
const withSite = rows.filter((r) => r.website).length;
const withGap = rows.filter((r) => r.todo).length;

// Fee gap per state, worst first — this is what decides who scrapes what.
const byState = new Map();
for (const r of rows) {
  const s = byState.get(r.state) || { total: 0, missing: 0 };
  s.total++;
  if (r.fees === 'MISSING') s.missing++;
  byState.set(r.state, s);
}
const stateRows = [...byState.entries()]
  .map(([state, v]) => [state, v.total, v.missing])
  .sort((a, b) => b[2] - a[2]);

const today = q('print(JSON.stringify(new Date().toISOString().slice(0,10)))');
const [Y, M, D] = today.split('-');
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const pretty = `${Number(D)} ${MONTHS[Number(M) - 1]} ${Y}`;

const XLSX = await import(path.join(REPO, 'node_modules/exceljs/lib/exceljs.nodejs.js'))
  .then((m) => m.default || m)
  .catch(() => null);
if (!XLSX) {
  console.error('\n  exceljs not installed. Run:  npm i -D exceljs\n');
  process.exit(1);
}

const wb = new XLSX.Workbook();

const s1 = wb.addWorksheet('Colleges to scrape', { views: [{ state: 'frozen', ySplit: 1 }] });
s1.columns = [
  { header: '#', key: 'n', width: 5 },
  { header: 'College', key: 'name', width: 52 },
  { header: 'State', key: 'state', width: 20 },
  { header: 'City', key: 'city', width: 18 },
  { header: 'Type', key: 'type', width: 12 },
  { header: 'Website', key: 'website', width: 38 },
  { header: 'Fees', key: 'fees', width: 10 },
  { header: 'Reviews/About', key: 'review', width: 14 },
  { header: 'Closing ranks', key: 'ranks', width: 13 },
  { header: 'Allotments', key: 'allot', width: 11 },
  { header: 'What to scrape', key: 'todo', width: 40 },
];
rows.forEach((r, i) => s1.addRow({ n: i + 1, ...r }));
s1.autoFilter = { from: 'A1', to: 'K1' };
s1.getRow(1).font = { bold: true };
// Red-tint every MISSING cell so a non-technical reader sees the gaps at a glance.
for (let i = 2; i <= rows.length + 1; i++) {
  for (const col of ['G', 'H', 'I', 'J']) {
    const cell = s1.getCell(`${col}${i}`);
    if (cell.value === 'MISSING') {
      cell.font = { color: { argb: 'FF9C0006' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
    }
  }
}

const s2 = wb.addWorksheet('Summary');
s2.columns = [{ width: 44 }, { width: 78 }];
[
  ['MedCounsel — data still to scrape', ''],
  ['Generated', pretty],
  ['Total colleges in DB', rows.length],
  ['', ''],
  ['Data type', 'Colleges MISSING it'],
  ['Fees', count('fees')],
  ['Reviews / About text', count('review')],
  ['Closing ranks', count('ranks')],
  ['Allotments', count('allot')],
  ['', ''],
  ['Colleges with a website (scrape source)', withSite],
  ['Colleges with >=1 gap', withGap],
  ['', ''],
  ['Priority for interns', ''],
  ['1. FEES', `highest value — ${count('fees')} colleges. Sources: college website, state fee-regulator (FRC/AFRC) notices.`],
  ['2. Reviews / About', `${count('review').toLocaleString()} colleges show 'No overview yet'. Source: college website / prospectus.`],
  ['3. Closing ranks / Allotments', 'mostly complete; fill only where a govt/new college is missing.'],
  ['', ''],
  ['Tip', 'Tab 1 is filterable + sorted by state — assign each intern one or more states.'],
].forEach((r) => s2.addRow(r));
s2.getRow(1).font = { bold: true, size: 13 };
s2.getRow(5).font = { bold: true };
s2.getRow(14).font = { bold: true };

const s3 = wb.addWorksheet('Fee gap by state');
s3.columns = [
  { header: 'State', key: 's', width: 26 },
  { header: 'Total colleges', key: 't', width: 15 },
  { header: 'Missing fees', key: 'm', width: 14 },
];
stateRows.forEach(([s, t, m]) => s3.addRow({ s, t, m }));
s3.getRow(1).font = { bold: true };
s3.autoFilter = { from: 'A1', to: 'C1' };

mkdirSync(path.resolve(REPO, OUT_DIR), { recursive: true });
const file = path.resolve(REPO, OUT_DIR, `MedCounsel-data-gaps-${Y}${M}${D}.xlsx`);
await wb.xlsx.writeFile(file);

console.log(`\n  ${file}`);
console.log(`  colleges ${rows.length} | missing fees ${count('fees')} | reviews ${count('review')} | ranks ${count('ranks')} | allotments ${count('allot')}\n`);
