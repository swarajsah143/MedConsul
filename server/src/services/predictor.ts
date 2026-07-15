import { resource } from '../models/resource.model';
import * as S from '../schema/collections';

/**
 * The Rank Predictor.
 *
 * A student types a score (or a rank they already know) and gets back an estimated All
 * India Rank, a percentile, their category rank, and the colleges they can realistically
 * target — each labelled Safe / Good / Reach / Tough.
 *
 * It lives on the server, not in the browser, for three reasons:
 *
 *   - The 5,955 closing ranks exceed the public read cap (PUBLIC_MAX = 5000), so a client
 *     that fetched them all would silently be working from a truncated table.
 *   - The chatbot needs the same answers. One implementation, one set of numbers.
 *   - The curves are admin-editable rows (rankBands / categoryFactors), not constants, so
 *     a counsellor can correct them the week NTA publishes new data. Shipping them to the
 *     browser would mean shipping a stale copy.
 *
 * The maths is ported from the standalone NEET predictor that the cutoff dataset came with,
 * deliberately unchanged — see the notes on each function.
 */

const ranks = () => resource(S.closingRanks);
const colleges = () => resource(S.colleges);
const bandsRes = () => resource(S.rankBands);
const factorsRes = () => resource(S.categoryFactors);

export const TOTAL_MARKS = 720;

/**
 * A stable key for "the same real college, spelled differently". The colleges table carries
 * ~27 duplicate clusters (one institution entered 3-5 ways); without collapsing them a student
 * sees the same college listed two or three times in one result. We key on the name with the
 * parenthetical abbreviation and all punctuation stripped — which merges the pure-abbreviation
 * variants ("Christian Medical College (CMC), Vellore" vs "Christian Medical College, Vellore")
 * with zero risk, because the town stays in the key so two different colleges in one city never
 * collapse. It deliberately does NOT try to merge reworded variants ("...Dr RML Hospital" vs
 * "...Dr Ram Manohar Lohia Hospital") — that needs the fuzzy matcher / an aliases merge, and a
 * wrong guess here would hide a real college from a student's shortlist.
 */
function canonCollegeKey(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')       // drop "(CMC)", "(ABVIMS-RML)", …
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * NEET-UG draws roughly 23-24 lakh candidates. Only used to turn a rank into a percentile
 * for display; it does not affect which colleges are matched.
 */
export const TOTAL_CANDIDATES = 2_400_000;

export interface Band { year: number; marksMin: number; marksMax: number; rankMin: number; rankMax: number }

export type Chance = 'Safe' | 'Good' | 'Reach' | 'Tough';

export interface PredictInput {
  marks?: number;
  rank?: number;
  category: string;
  year?: number;
  course?: string;
  quota?: string;
  round?: number;
  state?: string;
  limit?: number;
}

export interface Match {
  collegeId: string;
  college: string;
  city?: string;
  state?: string;
  type?: string;
  course: string;
  quota: string;
  round: number;
  year: number;
  closingRank: number;
  chance: Chance;
}

export interface Prediction {
  mode: 'marks' | 'rank';
  year: number;
  category: string;
  marks?: number;
  air: { point: number; lo: number; hi: number };
  percentile: number;
  categoryRank: number | null;
  matchedOn: number;
  counts: Record<Chance, number>;
  total: number;
  matches: Match[];
  note?: string;
}

// ── the curves ─────────────────────────────────────────────────────────

/**
 * A score's rank within its band, interpolated linearly.
 *
 * Higher marks mean a BETTER (smaller) rank, so the fraction is measured down from
 * marksMax — at the top of the band you get rankMin, at the bottom rankMax.
 */
export function interpolateRank(marks: number, table: Band[]): number | null {
  const band = table.find((b) => marks >= b.marksMin && marks <= b.marksMax);
  if (!band) return null;
  const mSpan = band.marksMax - band.marksMin;
  if (mSpan === 0) return band.rankMin;
  const frac = (band.marksMax - marks) / mSpan;
  return Math.max(1, Math.round(band.rankMin + frac * (band.rankMax - band.rankMin)));
}

/**
 * Estimate an All India Rank for a score, against ONE year's curve.
 *
 * Never blend years. NEET difficulty swings hard — 2025's topper scored 686 where 2024's
 * scored 720 — so the same 650 marks is a very different rank in each, and averaging the
 * two curves would produce a number that is right for neither.
 *
 * Returns a point estimate plus the enclosing band's range, which is the honest spread for
 * that score rather than false precision.
 */
export function estimateAIR(marks: number, table: Band[]): { point: number; lo: number; hi: number } {
  const band = table.find((b) => marks >= b.marksMin && marks <= b.marksMax);
  if (band) {
    return { point: interpolateRank(marks, table)!, lo: band.rankMin, hi: band.rankMax };
  }
  // Below the lowest band (or no curve for this year at all): fall back to a crude linear
  // spread over the whole candidate pool rather than refusing to answer.
  const f = Math.max(1, Math.round(TOTAL_CANDIDATES * (1 - marks / TOTAL_MARKS)));
  return { point: f, lo: f, hi: f };
}

export function percentileFromRank(rank: number): number {
  const p = (1 - rank / TOTAL_CANDIDATES) * 100;
  return Math.min(99.9999, Math.max(0, p));
}

/** Category rank ≈ AIR × the share of candidates above you who are in your category. */
export function categoryRankOf(air: number, category: string, factors: Map<string, number>): number | null {
  const f = factors.get(category);
  if (!f) return null;
  return Math.max(1, Math.round(air * f));
}

/**
 * How likely is this college, given the rank the student is matching on?
 *
 * The ratio is the college's closing rank over the student's rank, so >1 means the cutoff
 * is more lenient than they need — the further above 1, the safer.
 */
export function chanceOf(userRank: number, closingRank: number): Chance {
  const ratio = closingRank / userRank;
  if (ratio >= 2) return 'Safe';
  if (ratio >= 1.2) return 'Good';
  if (ratio >= 0.95) return 'Reach';
  return 'Tough';
}

// ── data ───────────────────────────────────────────────────────────────

async function loadBands(year?: number): Promise<{ year: number; table: Band[] }> {
  const all = (await bandsRes().all()) as Band[];
  const years = [...new Set(all.map((b) => b.year))].sort((a, b) => b - a);
  const pick = year && years.includes(year) ? year : years[0];
  const table = all
    .filter((b) => b.year === pick)
    .sort((a, b) => b.marksMin - a.marksMin);
  return { year: pick, table };
}

async function loadFactors(): Promise<Map<string, number>> {
  const all = await factorsRes().all();
  return new Map(all.map((f: any) => [f.category, f.factor]));
}

// ── the prediction ─────────────────────────────────────────────────────

export async function predict(input: PredictInput): Promise<Prediction> {
  const { year, table } = await loadBands(input.year);
  const factors = await loadFactors();

  const mode: 'marks' | 'rank' = input.rank ? 'rank' : 'marks';

  // The rank we match colleges on is the ALL INDIA RANK, not the category rank. That is
  // what a published cutoff means: "OBC closing rank 15,000" is the AIR of the last OBC
  // candidate admitted. The category rank below is shown to the student for orientation,
  // and is deliberately not used for matching.
  const air = mode === 'rank'
    ? { point: input.rank!, lo: input.rank!, hi: input.rank! }
    : estimateAIR(input.marks!, table);

  const matchedOn = air.point;

  // Only ever query FILTERED. closingRanks is larger than the 5,000-row read cap, so an
  // unfiltered read would quietly hand back a truncated table and under-report matches.
  //
  // The year filter uses the RESOLVED year — the same one whose curve produced the rank
  // above, not just whatever the caller passed. Estimating an AIR off the 2025 curve and
  // then matching it against 2024's cutoffs silently compares two different scales, and
  // showed each college twice (once per year) into the bargain.
  const filters: Record<string, string> = { category: input.category, year: String(year) };
  if (input.course) filters.course = input.course;
  if (input.quota) filters.quota = input.quota;
  if (input.round) filters.round = String(input.round);

  const [rows, cols] = await Promise.all([
    ranks().all({ filters }),
    colleges().all(),
  ]);
  const byId = new Map<string, any>(cols.map((c: any) => [c.id, c]));

  let list = rows
    .map((r: any) => ({ r, c: byId.get(r.collegeId) }))
    .filter((x): x is { r: any; c: any } => !!x.c);

  if (input.state) {
    const s = input.state.toLowerCase();
    list = list.filter((x) => (x.c.state || '').toLowerCase() === s);
  }

  // Collapse to one row per (college, course, quota). Two things fold in here:
  //  - duplicate-college clusters: keyed on canonCollegeKey, not collegeId, so the same
  //    institution spelled two ways stops appearing twice in the shortlist.
  //  - rounds: with no round selected the student is asking "could I have got in at all?", so
  //    we drop round from the key and keep the most LENIENT (largest) closing rank across the
  //    rounds — later rounds and the stray-vacancy round are where the cutoff loosens. With a
  //    round selected we keep round in the key so only the duplicate colleges merge.
  {
    const best = new Map<string, { r: any; c: any }>();
    for (const x of list) {
      const roundPart = input.round ? `|${x.r.round}` : '';
      const k = `${canonCollegeKey(x.c.name)}|${x.r.course}|${x.r.quota}${roundPart}`;
      const prev = best.get(k);
      if (!prev || x.r.closingRank > prev.r.closingRank) best.set(k, x);
    }
    list = [...best.values()];
  }

  // Reachable, plus a cushion: colleges whose cutoff is a little tighter than the student's
  // rank still belong on the list as a "Reach", or the result reads as falsely narrow.
  const cushion = Math.round(matchedOn * 0.75);
  const eligible = list
    .filter((x) => x.r.closingRank >= cushion)
    .sort((a, b) => a.r.closingRank - b.r.closingRank);

  const counts: Record<Chance, number> = { Safe: 0, Good: 0, Reach: 0, Tough: 0 };
  const matches: Match[] = eligible.map((x) => {
    const chance = chanceOf(matchedOn, x.r.closingRank);
    counts[chance]++;
    return {
      collegeId: x.r.collegeId,
      college: x.c.name,
      city: x.c.city,
      state: x.c.state,
      type: x.c.type,
      course: x.r.course,
      quota: x.r.quota,
      round: x.r.round,
      year: x.r.year,
      closingRank: x.r.closingRank,
      chance,
    };
  });

  const limit = Math.min(Math.max(4, input.limit ?? 200), 500);

  // Truncate FAIRLY ACROSS THE FOUR BANDS, not off the end of the sorted list.
  //
  // The list is sorted by closing rank ascending, so the toughest colleges come first and
  // the safest last. A plain .slice(0, 200) therefore returned Good/Reach/Tough only: at
  // AIR 10,000 the summary said "542 Safe" and then showed the student not one of them.
  //
  // Taking the first N of each band keeps that band's HARDEST members, which is what a
  // student actually wants — the best college that is still a safe bet.
  const perBand = Math.ceil(limit / 4);
  const taken: Record<Chance, number> = { Safe: 0, Good: 0, Reach: 0, Tough: 0 };
  const page = matches.filter((m) => taken[m.chance]++ < perBand);

  return {
    mode,
    year,
    category: input.category,
    ...(mode === 'marks' ? { marks: input.marks } : {}),
    air,
    percentile: percentileFromRank(matchedOn),
    categoryRank: categoryRankOf(matchedOn, input.category, factors),
    matchedOn,
    counts,
    total: matches.length,
    matches: page,
    note: table.length
      ? undefined
      : `No marks-to-rank curve is loaded for ${year}, so the rank estimate is a rough linear one.`,
  };
}

/** Everything the predictor form needs to build its dropdowns. */
export async function predictorMeta() {
  const [bands, factors, cols] = await Promise.all([
    bandsRes().all(),
    factorsRes().all(),
    colleges().all(),
  ]);

  // Courses/quotas/rounds come from the rank rows themselves, so the form can only ever
  // offer combinations that actually exist in the data.
  const sample = await ranks().all({ filters: { category: 'General' } });

  return {
    totalMarks: TOTAL_MARKS,
    years: [...new Set((bands as any[]).map((b) => b.year))].sort((a, b) => b - a),
    categories: (factors as any[]).map((f) => f.category).sort(),
    courses: [...new Set(sample.map((r: any) => r.course))].sort(),
    quotas: [...new Set(sample.map((r: any) => r.quota))].sort(),
    rounds: [...new Set(sample.map((r: any) => r.round))].sort((a: number, b: number) => a - b),
    states: [...new Set((cols as any[]).map((c) => c.state).filter(Boolean))].sort(),
  };
}
