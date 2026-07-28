/**
 * Fetch Wikipedia campus photos for abroad universities.
 * Instead of using the article thumbnail (usually a logo), we:
 *   1. Search for the university article
 *   2. List ALL images in the article
 *   3. Get URL info for each, pick the first that looks like a building/campus photo
 *
 * Run: MONGODB_URI=mongodb://... node server/scripts/fetch-abroad-photos.js
 */
'use strict';

const https = require('https');
const { MongoClient } = require('../node_modules/mongodb');
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medcounsel';

// Images whose filename contains any of these are skipped (logos, crests, portraits, etc.)
const SKIP_NAME = [
  /logo/i, /emblem/i, /seal/i, /crest/i, /coat.*arm/i, /flag/i, /icon/i,
  /badge/i, /blason/i, /arms/i, /insignia/i, /heraldry/i,
  /map/i, /chart/i, /graph/i, /template/i,
  /portrait/i, /painter/i, /artist/i,  // painted portraits
  /\bsaint\b/i,  // saint portraits
  /museum/i, /gallery/i, /monument/i,  // non-campus landmarks
  // Politician / session / meeting photos
  /заседани/i, /мажилис/i, /nurotan/i, /nur_otan/i,
  /\.svg$/i,  // SVG files are almost always logos/icons
];
// Must look like a photo
const WANT_EXT = /\.(jpg|jpeg|png|webp)$/i;

function skip(name) { return SKIP_NAME.some(p => p.test(name)); }

function get(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'GET',
      timeout: 8000, rejectUnauthorized: false,
      headers: { 'User-Agent': 'MedCounselBot/1.0 (educational; contact@medcounsel.ai)' },
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(get(new URL(res.headers.location, url).href));
      }
      let d = ''; res.setEncoding('utf8');
      res.on('data', c => { d += c; if (d.length > 200_000) { req.destroy(); resolve(d); } });
      res.on('end', () => resolve(d));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

function api(params) {
  const qs = new URLSearchParams({ format: 'json', ...params }).toString();
  return get(`https://en.wikipedia.org/w/api.php?${qs}`).then(b => JSON.parse(b));
}

// Distinctive words from the university name (excluding generic terms)
const GENERIC = new Set(['medical', 'university', 'college', 'state', 'institute', 'national',
  'international', 'school', 'faculty', 'academy', 'higher', 'education', 'center', 'centre',
  'system', 'help', 'perpetual', 'lady', 'saint', 'south', 'north', 'east', 'west', 'the', 'and',
  'of', 'for', 'dr', 'jose']);

function distinctiveWords(name) {
  return name.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !GENERIC.has(w));
}

/** Score how well a filename matches the university name. 0 = no match. */
function nameScore(filename, words) {
  const decoded = decodeURIComponent(filename).toLowerCase().replace(/[^a-z0-9]/g, ' ');
  return words.filter(w => decoded.includes(w)).length;
}

async function getBestCampusPhoto(universityName) {
  // 1. Find the article
  const search = await api({ action: 'query', list: 'search', srsearch: universityName, srlimit: 3, srprop: 'snippet' });
  const hits = search?.query?.search || [];
  if (!hits.length) return null;

  // Pick the best title match
  const titleMatch = hits.find(h => {
    const t = h.title.toLowerCase(), q = universityName.toLowerCase();
    const qWords = q.split(/\s+/).filter(w => w.length > 3);
    return qWords.filter(w => t.includes(w)).length >= Math.min(2, qWords.length);
  });
  const article = titleMatch || hits[0];

  // 2. Get all images in the article
  const imgRes = await api({ action: 'query', titles: article.title, prop: 'images', imlimit: 50 });
  const page = Object.values(imgRes?.query?.pages || {})[0];
  const allImages = (page?.images || []).map(i => i.title);

  // Filter to likely campus/building photos
  const candidates = allImages.filter(name => {
    const n = name.replace(/^File:/i, '');
    return WANT_EXT.test(n) && !skip(n);
  });

  if (!candidates.length) return null;

  // Sort by how well the filename matches the university name (prefer named matches)
  const uWords = distinctiveWords(universityName);
  const scored = candidates
    .map(name => ({ name, score: nameScore(name, uWords) }))
    .sort((a, b) => b.score - a.score);

  // Only use images whose filename matches at least one distinctive university word.
  // No fallback to unmatched images — that causes wrong city/person photos to slip through.
  const toFetch = scored.filter(c => c.score > 0).slice(0, 5);
  if (!toFetch.length) return null;
  const tryList = toFetch;

  // 3. Get the actual URL for each candidate
  const titles = tryList.map(c => c.name).join('|');
  const infoRes = await api({ action: 'query', titles, prop: 'imageinfo', iiprop: 'url', iiurlwidth: 800 });
  const pages = Object.values(infoRes?.query?.pages || {});
  for (const p of pages) {
    const url = p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url;
    if (url && WANT_EXT.test(url) && !skip(url)) return url;
  }
  return null;
}

(async () => {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const col = client.db().collection('abroadUniversities');

  // Phase 0: clean any stored images that are logos/svg/etc
  const allForClean = await col.find({ image: { $exists: true, $ne: null } }, { projection: { _id: 1, image: 1 } }).toArray();
  const badImages = allForClean.filter(u => {
    const fname = decodeURIComponent((u.image || '').split('/').pop() || '');
    return SKIP_NAME.some(p => p.test(fname)) || fname.endsWith('.svg');
  });
  if (badImages.length) {
    await col.bulkWrite(badImages.map(u => ({ updateOne: { filter: { _id: u._id }, update: { $set: { image: null } } } })));
    console.log(`Cleaned ${badImages.length} bad images.\n`);
  }

  const all = await col.find({}, { projection: { _id: 1, name: 1, image: 1 } }).toArray();
  // Process those without a real (non-Unsplash, non-null) image
  const toProcess = all.filter(u => !u.image || u.image.includes('unsplash'));
  console.log(`Finding campus photos for ${toProcess.length} abroad universities...\n`);

  const updates = [];
  for (let i = 0; i < toProcess.length; i++) {
    const u = toProcess[i];
    process.stdout.write(`[${i + 1}/${toProcess.length}] ${u.name.slice(0, 55)}... `);
    try {
      const img = await getBestCampusPhoto(u.name);
      if (img) {
        console.log('✓ ' + img.split('/').pop().slice(0, 50));
        updates.push({ updateOne: { filter: { _id: u._id }, update: { $set: { image: img } } } });
      } else {
        console.log('—');
      }
    } catch (e) {
      console.log('err: ' + e.message);
    }
  }

  if (updates.length) {
    const r = await col.bulkWrite(updates);
    console.log(`\nUpdated ${r.modifiedCount} universities.`);
  } else {
    console.log('\nNo updates.');
  }
  await client.close();
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
