/**
 * Fetch real college photos and update MongoDB thumbnails.
 * Strategy per college:
 *   1. Fetch website HTML → extract og:image / twitter:image (strict quality filter)
 *   2. If that fails → Wikipedia API with title-similarity check
 *   3. If that fails → leave thumbnail unchanged
 *
 * Run: node server/scripts/fetch-college-photos.js
 * Flags:
 *   --clean-only   Reset known-bad thumbnails to empty, skip fetching
 *   --skip-done    Skip colleges that already have a non-Unsplash, non-empty thumbnail
 */

'use strict';

const https = require('https');
const http  = require('http');
const { MongoClient } = require('../node_modules/mongodb');

const MONGO_URI    = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medcounsel';
const CONCURRENCY  = 10;
const WEB_TIMEOUT  = 7000;
const WIKI_TIMEOUT = 5000;

const CLEAN_ONLY  = process.argv.includes('--clean-only');
const SKIP_DONE   = process.argv.includes('--skip-done');

// ---------------------------------------------------------------------------
// Quality filters
// ---------------------------------------------------------------------------

// URL patterns that indicate spam, logos, icons — NOT campus photos
const BAD_URL_PATTERNS = [
  /slot/i, /gacor/i, /casino/i, /dewi/i, /togel/i, /bet[0-9]/i,
  /judi/i, /poker/i, /harapan/i,
  /logo/i, /icon/i, /favicon/i, /screenshot/i,
  /banner/i, /sponsor/i, /advertis/i,
  /expired.*domain/i, /parked/i,
  // Thai/Indonesian gambling spam characters
  /[฀-๿]/, /[؀-ۿ]/,
  // Tiny files unlikely to be real photos
  /\.gif$/i,
  // WordPress theme previews
  /themes\/.*screenshot/i,
  // Founder/person photos (not campus)
  /founder/i, /principal/i, /director/i,
];

// Wikipedia URL patterns that are logos/seals/flags — not building photos
const BAD_WIKI_PATTERNS = [
  /_[Ll]ogo/, /_[Ss]eal/, /_[Ff]lag/, /[Cc]oat_of_[Aa]rms/,
  /[Ee]mblem/, /[Cc]rest/, /_[Ii]con/,
];

function isGoodImageUrl(url) {
  if (!url || url.length < 20) return false;
  if (!url.match(/\.(jpg|jpeg|png|webp|JPG|JPEG|PNG|WEBP)/)) {
    // Allow Wikipedia URLs that end differently (they use /600px-Name.jpg)
    if (!url.includes('wikimedia') && !url.includes('wikipedia')) return false;
  }
  for (const pat of BAD_URL_PATTERNS) if (pat.test(url)) return false;
  return true;
}

function isGoodWikiUrl(url) {
  if (!isGoodImageUrl(url)) return false;
  for (const pat of BAD_WIKI_PATTERNS) if (pat.test(url)) return false;
  return true;
}

/** How many words from `query` appear in `title` (normalised, lowercase). */
function wordOverlap(title, query) {
  const titleWords = new Set(title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean));
  const queryWords = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3);
  if (!queryWords.length) return 0;
  const matches = queryWords.filter(w => titleWords.has(w)).length;
  return matches / queryWords.length;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function get(url, timeoutMs, hops = 0) {
  return new Promise((resolve, reject) => {
    if (hops > 3) return reject(new Error('too many redirects'));
    let parsed;
    try { parsed = new URL(url); } catch { return reject(new Error('bad url')); }
    const lib = parsed.protocol === 'https:' ? https : http;
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,*/*',
      },
      timeout: timeoutMs,
      rejectUnauthorized: false,
    };
    const req = lib.request(opts, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        return resolve(get(next, timeoutMs, hops + 1));
      }
      if (res.statusCode >= 400) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', c => { buf += c; if (buf.length > 600_000) { req.destroy(); resolve(buf); } });
      res.on('end', () => resolve(buf));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Image extraction
// ---------------------------------------------------------------------------

function extractMetaImage(html, baseUrl) {
  const patterns = [
    /property="og:image"\s+content="([^"]+)"/i,
    /content="([^"]+)"\s+property="og:image"/i,
    /name="twitter:image"\s+content="([^"]+)"/i,
    /content="([^"]+)"\s+name="twitter:image"/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m?.[1]) continue;
    const raw = m[1].trim();
    if (raw.startsWith('data:')) continue;
    const resolved = raw.startsWith('http') ? raw : (() => { try { return new URL(raw, baseUrl).href; } catch { return null; } })();
    if (resolved && isGoodImageUrl(resolved)) return resolved;
  }
  return null;
}

async function getWebsiteImage(websiteUrl) {
  if (!websiteUrl) return null;
  try {
    const html = await get(websiteUrl, WEB_TIMEOUT);
    return extractMetaImage(html, websiteUrl);
  } catch { return null; }
}

async function getWikipediaImage(name) {
  try {
    const query = encodeURIComponent(name);
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json&srlimit=5&srprop=snippet`;
    const searchBody = await get(searchUrl, WIKI_TIMEOUT);
    const hits = JSON.parse(searchBody)?.query?.search;
    if (!hits?.length) return null;

    for (const hit of hits) {
      // Require >50% word overlap between the article title and the college name
      if (wordOverlap(hit.title, name) < 0.5) continue;

      const title = encodeURIComponent(hit.title);
      const summaryBody = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, WIKI_TIMEOUT);
      const summary = JSON.parse(summaryBody);
      const src = summary?.thumbnail?.source;
      if (!src) continue;
      const large = src.replace(/\/\d+px-/, '/600px-');
      if (isGoodWikiUrl(large)) return large;
    }
  } catch { /* ignore */ }
  return null;
}

// ---------------------------------------------------------------------------
// Process a single college
// ---------------------------------------------------------------------------

async function processCollege(college) {
  let imgUrl = await getWebsiteImage(college.website);
  if (!imgUrl) imgUrl = await getWikipediaImage(college.name);
  return { id: college._id, name: college.name, imgUrl };
}

// ---------------------------------------------------------------------------
// Concurrency helper
// ---------------------------------------------------------------------------

async function runConcurrent(items, fn, concurrency, onDone) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const result = await fn(items[idx]);
      results.push(result);
      onDone(result, results.length, items.length);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  const col = db.collection('colleges');

  // ── Phase 0: clean up known-bad thumbnails ──────────────────────────────
  // Any thumbnail that passes the quality filter is kept. Bad ones are wiped.
  const allColleges = await col.find({}, { projection: { _id: 1, name: 1, website: 1, thumbnail: 1 } }).toArray();

  const cleanOps = [];
  for (const c of allColleges) {
    if (!c.thumbnail) continue;
    if (c.thumbnail.includes('unsplash')) continue; // keep generic Unsplash as-is
    // Non-Unsplash thumbnail: validate it
    const isWiki = c.thumbnail.includes('wikipedia') || c.thumbnail.includes('wikimedia');
    const ok = isWiki ? isGoodWikiUrl(c.thumbnail) : isGoodImageUrl(c.thumbnail);
    if (!ok) {
      cleanOps.push({ updateOne: { filter: { _id: c._id }, update: { $set: { thumbnail: '' } } } });
    }
  }
  if (cleanOps.length) {
    await col.bulkWrite(cleanOps);
    console.log(`Cleaned up ${cleanOps.length} bad thumbnails.`);
  }

  if (CLEAN_ONLY) { console.log('Done (clean only).'); await client.close(); return; }

  // ── Phase 1: select colleges to process ─────────────────────────────────
  // Reload after cleanup
  const colleges = await col.find({}, { projection: { _id: 1, name: 1, website: 1, thumbnail: 1 } }).toArray();
  const toProcess = SKIP_DONE
    ? colleges.filter(c => !c.thumbnail || c.thumbnail.includes('unsplash'))
    : colleges;

  console.log(`\nFetching photos for ${toProcess.length} colleges (concurrency=${CONCURRENCY})...\n`);

  let found = 0, fromWeb = 0, fromWiki = 0, unchanged = 0;

  const results = await runConcurrent(toProcess, processCollege, CONCURRENCY, (result, done, total) => {
    if (result.imgUrl) {
      found++;
      const src = (result.imgUrl.includes('wikipedia') || result.imgUrl.includes('wikimedia')) ? 'wiki' : 'web';
      if (src === 'wiki') fromWiki++; else fromWeb++;
    } else { unchanged++; }
    process.stdout.write(`\r[${String(done).padStart(4)}/${total}] ${Math.round(done/total*100)}% | found=${found} web=${fromWeb} wiki=${fromWiki} skip=${unchanged}  `);
  });

  // ── Phase 2: write to MongoDB ────────────────────────────────────────────
  console.log('\n\nUpdating MongoDB...');
  const bulkOps = results.filter(r => r.imgUrl).map(r => ({
    updateOne: { filter: { _id: r.id }, update: { $set: { thumbnail: r.imgUrl } } },
  }));
  let updated = 0;
  if (bulkOps.length) {
    const res = await col.bulkWrite(bulkOps);
    updated = res.modifiedCount;
  }

  console.log(`\nDone!`);
  console.log(`  Updated:   ${updated}`);
  console.log(`  From web:  ${fromWeb}`);
  console.log(`  From wiki: ${fromWiki}`);
  console.log(`  No image:  ${unchanged}`);

  await client.close();
})().catch(err => { console.error('\nFatal:', err.message); process.exit(1); });
