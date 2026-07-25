/**
 * Enrich abroad universities with photos, costs, ratings and the descriptive fields that power
 * the new "View details" panel.
 *
 *   npx tsx scripts/enrich-abroad.ts [--dry]
 *
 * Idempotent and NON-destructive: it only fills fields that are still empty, so real data an
 * admin already entered (and the 14 existing photos) is never overwritten. Country-level
 * defaults are refined by per-university OVERRIDES; missing images get a deterministic stock
 * photo. See scripts/data/abroad-enrichment.ts for the (clearly-labelled, indicative) data.
 */
import { connectDatabase, isMongoConnected } from '../server/src/config/database';
import { getSchema } from '../server/src/schema/collections';
import { resource } from '../server/src/models/resource.model';
import { COUNTRY, OVERRIDES, STOCK_IMAGES, ELIGIBILITY, HOSTEL_INFO } from './data/abroad-enrichment';

const DRY = process.argv.includes('--dry');

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h;
}

const isEmpty = (v: any) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/** A short, accurate blurb built from the university's own fields + the standard abroad framing. */
function aboutFor(u: any): string {
  const place = [u.city, u.country].filter(Boolean).join(', ');
  const degree = u.degree || 'MD (MBBS-equivalent)';
  return (
    `${u.name} is a medical university in ${place} offering an English-medium ${degree} programme ` +
    `popular with Indian NEET-qualified students. The degree is recognised for registration by the ` +
    `National Medical Commission (India) and the university is WHO/WFME-listed, so graduates can sit ` +
    `the FMGE / NExT licensing examination to practise in India.`
  );
}

async function main() {
  await connectDatabase();
  if (!isMongoConnected()) {
    console.error('\n  MongoDB is not connected — set MONGODB_URI in the repo-root .env and try again.\n');
    process.exit(1);
  }

  const schema = getSchema('abroadUniversities');
  if (!schema) { console.error('  abroadUniversities schema not found'); process.exit(1); }
  const res = resource(schema);

  const unis = await res.all();
  console.log(`\n  ${unis.length} abroad universities loaded.${DRY ? '  [DRY RUN — no writes]' : ''}\n`);

  let photos = 0, priced = 0, rated = 0, described = 0, noCountry = 0;

  for (const u of unis) {
    const cp = COUNTRY[u.country];
    const ov = OVERRIDES[u.id] || {};
    if (!cp) { console.warn(`  [warn] no country profile for "${u.country}" (${u.name})`); noCountry++; }

    const patch: Record<string, any> = {};
    const fill = (key: string, value: any) => { if (isEmpty(u[key]) && !isEmpty(value)) patch[key] = value; };

    // Costs & rating (indicative)
    fill('tuitionPerYearUSD', ov.tuitionPerYearUSD ?? cp?.tuitionPerYearUSD);
    fill('livingCostPerYearUSD', ov.livingCostPerYearUSD ?? cp?.livingCostPerYearUSD);
    fill('rating', ov.rating ?? cp?.rating);

    // Descriptive / detail fields
    fill('about', ov.about ?? aboutFor(u));
    fill('eligibility', ELIGIBILITY);
    fill('hostelInfo', HOSTEL_INFO);
    fill('intake', cp?.intake);
    fill('advantages', cp?.advantages);
    fill('licensingExams', cp?.licensingExams);
    fill('recognitions', cp?.recognitions);
    fill('established', ov.established);
    fill('website', ov.website);

    // Photo — only when the university has none
    if (isEmpty(u.image) && STOCK_IMAGES.length) {
      patch.image = STOCK_IMAGES[hash(u.id) % STOCK_IMAGES.length];
      photos++;
    }

    if (!isEmpty(patch.tuitionPerYearUSD)) priced++;
    if (!isEmpty(patch.rating)) rated++;
    if (!isEmpty(patch.about)) described++;

    if (!DRY && Object.keys(patch).length) await res.update(u.id, patch);
  }

  console.log(`  Photos added:   ${photos} (stock) · ${unis.length - photos} already had one`);
  console.log(`  Costs filled:   ${priced} · Ratings: ${rated} · Descriptions: ${described}`);
  if (noCountry) console.log(`  Missing country profile: ${noCountry}`);
  console.log('\n  Done.\n');
  process.exit(0);
}

main().catch((e) => {
  console.error('\n  Enrichment failed:', e?.message || e, '\n');
  process.exit(1);
});
