/**
 * Populate the `gallery` field for Indian medical colleges using Wikipedia.
 * For each college without a gallery:
 *   1. Search Wikipedia for the college article (strict title match)
 *   2. List ALL images in the article
 *   3. Filter to photos whose filename contains distinctive college keywords
 *   4. Fetch URLs for up to MAX_IMAGES candidates
 *   5. Write them as { url, caption } gallery entries
 *
 * Run: MONGODB_URI=mongodb://... node server/scripts/fetch-college-gallery.js
 * Flags: --force   overwrite existing galleries too
 *        --limit N  only process N colleges (default: all)
 */
'use strict';

const https = require('https');
const { MongoClient } = require('../node_modules/mongodb');

const MONGO_URI   = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medcounsel';
const CONCURRENCY  = 3;   // keep well within Wikipedia rate limits
const MAX_IMAGES   = 5;   // max gallery images per college
const WIKI_TIMEOUT = 8000;

const FORCE = process.argv.includes('--force');
const LIMIT_ARG = (() => { const i = process.argv.indexOf('--limit'); return i >= 0 ? parseInt(process.argv[i + 1], 10) : Infinity; })();

// ── Filters ──────────────────────────────────────────────────────────────────

const SKIP_NAME = [
  // Institutional symbols
  /logo/i, /emblem/i, /seal/i, /crest/i, /coat.*arm/i, /flag/i, /icon/i,
  /badge/i, /blason/i, /arms/i, /insignia/i, /heraldry/i, /shield/i,
  // Abstract / infographic
  /map/i, /chart/i, /graph/i, /template/i, /list/i, /table/i,
  // People, statues (not buildings)
  /portrait/i, /president/i, /minister/i, /governor/i, /naidu/i,
  /dean/i, /rector/i, /principal/i, /founder/i,
  /\bstatue\b/i, /\bbust\b/i, /memorial/i, /\btomb\b/i,
  // Events
  /convocation/i, /inauguration/i, /ceremony/i, /function/i, /felicitation/i,
  // City landmarks (not the college itself)
  /airport/i, /railway/i, /station/i, /mall/i, /market/i, /bazaar/i,
  /fort/i, /temple/i, /mosque/i, /church/i, /monument/i, /museum/i,
  /shopping/i, /hotel/i,
  // Misc
  /portrait/i, /gallery/i, /\.svg$/i,
  // Non-latin spam
  /заседани/i, /мажилис/i,
];

const WANT_EXT = /\.(jpg|jpeg|png|webp)$/i;

function skipFile(name) { return SKIP_NAME.some(p => p.test(name)); }

// Words that don't help distinguish one college from another.
// NOTE: "medical", "dental", "hospital" are intentionally NOT here so they
// contribute to the score when combined with city/college-specific words.
const GENERIC = new Set([
  'college', 'university', 'institute', 'national', 'international',
  'school', 'faculty', 'academy', 'higher', 'education',
  'center', 'centre', 'system', 'health', 'sciences', 'science',
  'government', 'state', 'india', 'indian', 'trust',
  'research', 'teaching', 'private', 'public',
  'north', 'south', 'east', 'west', 'central', 'new', 'old',
  'the', 'and', 'for', 'of', 'in', 'at', 'from',
  'sri', 'shri', 'dr', 'prof',
]);

function distinctiveWords(name) {
  // Collect abbreviations from parentheses: (AIIMS), (CMC), (BMCRI) etc.
  const abbrevs = [];
  for (const m of name.matchAll(/\(([A-Z]{2,8})\)/g)) abbrevs.push(m[1].toLowerCase());

  const main = name
    .replace(/\(.*?\)/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !GENERIC.has(w));

  return [...new Set([...main, ...abbrevs])];
}

function nameScore(filename, words) {
  if (!words.length) return 0;
  const decoded = decodeURIComponent(filename).toLowerCase().replace(/[^a-z0-9]/g, ' ');
  return words.filter(w => decoded.includes(w)).length;
}

/** Clean a Wikipedia filename into a human-readable caption. */
function toCaption(filename) {
  return decodeURIComponent(filename)
    .replace(/^File:/i, '')
    .replace(/\.\w+$/, '')           // strip extension
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\d+px\s+/i, '');      // strip size prefix like "600px "
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    let parsed; try { parsed = new URL(url); } catch { return reject(new Error('bad url')); }
    const req = https.request({
      hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'GET',
      timeout: WIKI_TIMEOUT, rejectUnauthorized: false,
      headers: { 'User-Agent': 'MedCounselBot/1.0 (educational; contact@medcounsel.ai)' },
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); return resolve(get(new URL(res.headers.location, url).href));
      }
      let d = ''; res.setEncoding('utf8');
      res.on('data', c => { d += c; if (d.length > 300_000) { req.destroy(); resolve(d); } });
      res.on('end', () => resolve(d));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

async function wikiApi(params, retries = 2) {
  const qs = new URLSearchParams({ format: 'json', ...params }).toString();
  for (let i = 0; i <= retries; i++) {
    try {
      const body = await get(`https://en.wikipedia.org/w/api.php?${qs}`);
      return JSON.parse(body);
    } catch (e) {
      if (i === retries) throw e;
      await delay(1500 * (i + 1));  // back off 1.5s, 3s on consecutive failures
    }
  }
}

// ── Core logic ────────────────────────────────────────────────────────────────

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchGallery(collegeName) {
  const words = distinctiveWords(collegeName);
  if (!words.length) return [];

  // 1. Search for the Wikipedia article
  const searchRes = await wikiApi({
    action: 'query', list: 'search',
    srsearch: collegeName.replace(/\(.*?\)/g, '').trim(),
    srlimit: 5, srprop: 'snippet',
  });
  const hits = searchRes?.query?.search || [];
  if (!hits.length) return [];

  // Trust Wikipedia's own search ranking for article selection.
  // Title scoring is NOT applied here — "JIPMER" doesn't appear in the title
  // "Jawaharlal Institute of Postgraduate Medical Education and Research"
  // but Wikipedia search correctly surfaces it. We rely on image-level
  // name scoring (score >= 2) to prevent wrong-college photos.
  const best = hits[0];

  // 2. Get images in the article
  const imgRes = await wikiApi({
    action: 'query', titles: best.title,
    prop: 'images', imlimit: 50,
  });
  const page = Object.values(imgRes?.query?.pages || {})[0];
  const allImages = (page?.images || []).map(i => i.title);

  // Filter and score
  const allCandidates = allImages
    .filter(name => {
      const n = name.replace(/^File:/i, '');
      return WANT_EXT.test(n) && !skipFile(n);
    })
    .map(name => ({ name, score: nameScore(name, words) }))
    .sort((a, b) => b.score - a.score);

  // Prefer score ≥ 2 (city-name + institution-type); fall back to score = 1 (abbreviation-only names like JIPMER)
  let candidates = allCandidates.filter(c => c.score >= 2).slice(0, MAX_IMAGES + 2);
  if (!candidates.length) candidates = allCandidates.filter(c => c.score >= 1).slice(0, MAX_IMAGES + 2);

  if (!candidates.length) return [];

  // 3. Get actual URLs via imageinfo
  const titles = candidates.map(c => c.name).join('|');
  const infoRes = await wikiApi({
    action: 'query', titles,
    prop: 'imageinfo', iiprop: 'url', iiurlwidth: 900,
  });
  const infoPages = Object.values(infoRes?.query?.pages || {});

  const gallery = [];
  for (const p of infoPages) {
    const url = p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url;
    if (!url || !WANT_EXT.test(url) || skipFile(url)) continue;
    const caption = toCaption(p.title || '');
    gallery.push({ url, caption });
    if (gallery.length >= MAX_IMAGES) break;
  }
  return gallery;
}

// ── Concurrency helper ────────────────────────────────────────────────────────

async function runConcurrent(items, fn, concurrency, onDone) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const r = await fn(items[idx]);
      results.push(r);
      onDone(r, results.length, items.length);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const col = client.db().collection('colleges');

  // ── Phase 0: Clean existing gallery entries that fail quality filters ────────
  const withGallery = await col.find({ 'gallery.0': { $exists: true } }, { projection: { _id: 1, name: 1, gallery: 1 } }).toArray();
  const cleanOps = [];
  for (const college of withGallery) {
    // Phase 0 only removes entries that match SKIP_NAME (logos, maps, statues, etc.).
    // nameScore is NOT used here — it's for finding new images, not validating existing ones.
    const clean = (college.gallery || []).filter(g => {
      const fname = decodeURIComponent((g.url || '').split('/').pop() || '');
      return !skipFile(fname);
    });
    if (clean.length !== (college.gallery || []).length) {
      cleanOps.push({ updateOne: { filter: { _id: college._id }, update: { $set: { gallery: clean } } } });
    }
  }
  if (cleanOps.length) {
    await col.bulkWrite(cleanOps);
    console.log(`Phase 0: cleaned bad entries from ${cleanOps.length} galleries.\n`);
  }

  const query = FORCE ? {} : { 'gallery.0': { $exists: false } };
  const all = await col.find(query, { projection: { _id: 1, name: 1 } }).toArray();
  const toProcess = all.slice(0, LIMIT_ARG);

  console.log(`Processing ${toProcess.length} colleges (concurrency=${CONCURRENCY}, max ${MAX_IMAGES} images each)...\n`);

  let found = 0, total = 0;

  const results = await runConcurrent(toProcess, async (college) => {
    try {
      await delay(400);  // gentle throttle to stay within Wikipedia rate limits
      const gallery = await fetchGallery(college.name);
      return { id: college._id, name: college.name, gallery };
    } catch (e) {
      return { id: college._id, name: college.name, gallery: [], err: e.message };
    }
  }, CONCURRENCY, (result, done, items) => {
    total++;
    if (result.gallery?.length) found++;
    if (result.gallery?.length) {
      process.stdout.write(`\r[${String(done).padStart(4)}/${items}] found=${found} total=${total}  `);
      process.stdout.write(`\n  ✓ ${result.name.slice(0, 55)} (${result.gallery.length} photos)\n`);
    } else {
      process.stdout.write(`\r[${String(done).padStart(4)}/${items}] found=${found} total=${total}  `);
    }
  });

  // Write to MongoDB
  console.log('\n\nWriting to MongoDB...');
  const bulkOps = results
    .filter(r => r.gallery?.length)
    .map(r => ({
      updateOne: {
        filter: { _id: r.id },
        update: { $set: { gallery: r.gallery } },
      },
    }));

  let updated = 0;
  if (bulkOps.length) {
    const res = await col.bulkWrite(bulkOps);
    updated = res.modifiedCount;
  }

  console.log(`\nDone!`);
  console.log(`  Colleges with new gallery: ${updated}`);
  console.log(`  No images found:           ${toProcess.length - updated}`);

  await client.close();
})().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
