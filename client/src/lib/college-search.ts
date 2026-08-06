import type { College } from './data-api';

/**
 * Resolve a free-text search query to a specific college.
 *
 * Built for the dashboard search box: a student types a college name (often partial,
 * often an abbreviation like "KMC", often with a small spelling mistake) and expects to
 * land on that college's review. Matching is tolerant of partial names, aliases, acronyms
 * and typos, and returns null when nothing is confident enough — so the caller can fall
 * back to topic routing instead of opening a random college.
 */

/** Lowercase, strip punctuation, collapse whitespace. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Generic words that must not, on their own, identify a college. */
const STOPWORDS = new Set([
  'medical', 'college', 'colleges', 'institute', 'institution', 'university',
  'hospital', 'sciences', 'science', 'of', 'and', 'the', 'govt', 'government',
  'dental', 'research', 'centre', 'center', 'health', 'general', 'for',
]);

/** Words skipped when forming an acronym (KMC = Kasturba Medical College). */
const CONNECTORS = new Set(['and', 'of', 'the', 'for']);

/** Levenshtein edit distance (iterative, single-row). */
function lev(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[n];
}

/**
 * How well a single query word matches a single name word:
 * 1 exact · 0.95 prefix · 0.7 small typo · 0 otherwise. Exact/prefix beating fuzzy is
 * what stops "bangalore" from resolving to "Mangalore".
 */
function tokenWeight(nameTok: string, queryTok: string): number {
  if (nameTok === queryTok) return 1;
  // Prefix ONLY in the direction "user typed the start of a real word" (bang -> bangalore).
  // The reverse (queryTok.startsWith(nameTok)) matched single-letter name tokens like the
  // "a"/"j" in "A J Institute", so any query starting with those letters scored a false hit.
  if (queryTok.length >= 3 && nameTok.length >= 3 && nameTok.startsWith(queryTok)) return 0.95;
  if (Math.abs(nameTok.length - queryTok.length) <= 2) {
    const allowed = Math.min(nameTok.length, queryTok.length) <= 4 ? 1 : 2;
    if (lev(nameTok, queryTok) <= allowed) return 0.7;
  }
  return 0;
}

/**
 * Best college match for `query`, or null if none is confident enough.
 * Requires at least one distinctive (non-generic) query word, so a bare
 * "medical college" doesn't match anything.
 */
export function matchCollege(query: string, colleges: College[]): College | null {
  const q = norm(query);
  if (q.length < 2 || colleges.length === 0) return null;

  const qKeyTokens = q.split(' ').filter((t) => t && !STOPWORDS.has(t));
  if (qKeyTokens.length === 0) return null; // e.g. "medical college" — too generic; let caller route

  let best: { c: College; score: number } | null = null;

  for (const c of colleges) {
    const candidates = [c.name, ...(c.aliases ?? [])];
    let score = 0;

    for (const cand of candidates) {
      const n = norm(cand);
      if (!n) continue;

      let s: number;
      if (n === q) {
        s = 1;
      } else if (q.length >= 3 && n.includes(q)) {
        // Name literally contains the whole typed phrase — a strong signal that should beat a
        // single-token city match. Prefer the shortest such name via a gentle length penalty.
        s = 0.97 - Math.min(0.12, (n.length - q.length) / 500);
      } else {
        const nTokens = n.split(' ');
        const initials = nTokens.filter((w) => !CONNECTORS.has(w)).map((w) => w[0]).join('');
        let sum = 0;
        for (const qt of qKeyTokens) {
          let w = 0;
          for (const nt of nTokens) {
            const tw = tokenWeight(nt, qt);
            if (tw > w) w = tw;
          }
          // Acronym hit (query word is a run of the name's initials, e.g. "kmc" in "kmcm").
          // Capped at 6 chars: real abbreviations are short (AIIMS, BMCRI), and letting a long
          // word match a long initials string by coincidence is a false positive.
          if (qt.length >= 3 && qt.length <= 6 && initials.includes(qt)) w = 1;
          sum += w;
        }
        s = (sum / qKeyTokens.length) * 0.9;
      }
      if (s > score) score = s;
    }

    if (score > 0 && (!best || score > best.score)) best = { c, score };
  }

  return best && best.score >= 0.5 ? best.c : null;
}
