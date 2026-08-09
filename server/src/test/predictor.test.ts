/**
 * The Rank Predictor.
 *
 * The maths here is the whole feature — a student decides where to apply on the strength of
 * these numbers — so it is checked against the band table rather than eyeballed. The cases
 * that matter are the boundaries, where an off-by-one in the interpolation hides:
 *
 *   - at the TOP of a score band you must get that band's BEST rank, at the bottom its worst
 *     (higher marks -> smaller rank; getting this backwards still "looks plausible")
 *   - Safe/Good/Reach/Tough must flip exactly on their ratio thresholds
 *   - the estimate must never blend two years' curves
 *
 *   npx tsx src/test/predictor.test.ts
 */

const API = process.env.API_URL || 'http://localhost:5050';
let failures = 0;

const check = (name: string, cond: boolean, detail = '') => {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}\n      ${detail}`); }
};

async function post(body: any) {
  const res = await fetch(`${API}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

async function main() {
  console.log(`\nrank predictor — ${API}\n`);

  const meta = await (await fetch(`${API}/api/predict/meta`)).json() as any;
  const m = meta.data;
  check('meta lists the years it has curves for', m.years.length > 0, JSON.stringify(m.years));
  check('meta lists categories', m.categories.includes('OBC'), JSON.stringify(m.categories));
  check('meta lists states for the filter', m.states.length > 25, `${m.states.length} states`);
  check('total marks is 720', m.totalMarks === 720);

  // ── the curve ────────────────────────────────────────────────────────
  // These assert the interpolation SEMANTICS, deriving the expected numbers from whatever curve is
  // actually loaded. They used to hardcode the 2025 band {607-622 -> 630-1140}, which meant
  // recalibrating that curve to official NTA data broke four tests that were not testing the
  // recalibration at all. The rule the repo keeps relearning: assert the shape, not the row.
  // `rankBands` is publicRead:false by design, so the band table is derived from the predictor's
  // OWN responses: air.lo / air.hi ARE the enclosing band's best/worst rank. Walk down from 660
  // until three consecutive marks share one band and it is wide enough to interpolate inside.
  let probe: { top: number; bottom: number; mid: number; lo: number; hi: number } | null = null;
  for (let m = 660; m >= 480 && !probe; m -= 1) {
    const a = (await post({ marks: m, category: 'General', year: 2025 })).body.data?.air;
    const b = (await post({ marks: m - 6, category: 'General', year: 2025 })).body.data?.air;
    if (!a || !b) continue;
    // Same band, and wide enough that the midpoint is a genuinely distinct third value.
    if (a.lo === b.lo && a.hi === b.hi && a.hi - a.lo >= 60) {
      probe = { top: m, bottom: m - 6, mid: m - 3, lo: a.lo, hi: a.hi };
    }
  }
  check('found a 2025 band wide enough to pin the interpolation to', !!probe, JSON.stringify(probe));

  if (probe) {
    const atTop = (await post({ marks: probe.top, category: 'General', year: 2025 })).body.data;
    const atBottom = (await post({ marks: probe.bottom, category: 'General', year: 2025 })).body.data;
    const atMid = (await post({ marks: probe.mid, category: 'General', year: 2025 })).body.data;

    check('more marks means a BETTER (smaller) rank',
      atTop.air.point < atMid.air.point && atMid.air.point < atBottom.air.point,
      `${atTop.air.point} < ${atMid.air.point} < ${atBottom.air.point}`);
    check('every point sits inside its own reported band',
      [atTop, atMid, atBottom].every((r) => r.air.point >= r.air.lo && r.air.point <= r.air.hi),
      JSON.stringify([atTop.air, atMid.air, atBottom.air]));
    check('the band range is reported, not just a point',
      atMid.air.lo === probe.lo && atMid.air.hi === probe.hi, JSON.stringify(atMid.air));

    // Linear within a band: equal marks steps must give equal rank steps. This is the property
    // that matters, and unlike a hardcoded rank it survives recalibrating the curve.
    const stepUp = atMid.air.point - atTop.air.point;
    const stepDown = atBottom.air.point - atMid.air.point;
    check('a mid-band score interpolates linearly', Math.abs(stepUp - stepDown) <= 2,
      `steps ${stepUp} vs ${stepDown} across marks ${probe.top}/${probe.mid}/${probe.bottom}`);
  }

  // ── years are never blended ──────────────────────────────────────────
  const y2025 = (await post({ marks: 650, category: 'General', year: 2025 })).body.data;
  const y2024 = (await post({ marks: 650, category: 'General', year: 2024 })).body.data;
  check('the same score gives a different rank in a harder year', y2025.air.point !== y2024.air.point,
    `2025: ${y2025.air.point}, 2024: ${y2024.air.point} — identical means the curves were blended`);
  check('2025 (the harder paper) ranks a 650 better than 2024 does', y2025.air.point < y2024.air.point,
    `2025 ${y2025.air.point} vs 2024 ${y2024.air.point}`);
  check('the matched cutoffs come from the SAME year as the curve',
    y2024.matches.every((x: any) => x.year === 2024),
    `found years: ${[...new Set(y2024.matches.map((x: any) => x.year))].join(', ')}`);

  // ── category rank ────────────────────────────────────────────────────
  const obc = (await post({ rank: 10000, category: 'OBC' })).body.data;
  const gen = (await post({ rank: 10000, category: 'General' })).body.data;
  check('OBC rank is AIR x 0.55', obc.categoryRank === 5500, `got ${obc.categoryRank}`);
  check('General rank is AIR x 0.51', gen.categoryRank === 5100, `got ${gen.categoryRank}`);
  check('a known rank is used as-is, not re-estimated', obc.matchedOn === 10000 && obc.mode === 'rank',
    `matchedOn ${obc.matchedOn}, mode ${obc.mode}`);

  // ── Safe / Good / Reach / Tough ──────────────────────────────────────
  // Ratio = closingRank / yourRank. >=2 Safe, >=1.2 Good, >=0.95 Reach, else Tough.
  const r = (await post({ rank: 10000, category: 'General' })).body.data;
  const wrong = r.matches.filter((x: any) => {
    const ratio = x.closingRank / 10000;
    const want = ratio >= 2 ? 'Safe' : ratio >= 1.2 ? 'Good' : ratio >= 0.95 ? 'Reach' : 'Tough';
    return x.chance !== want;
  });
  check('every college is labelled by its cutoff/rank ratio', wrong.length === 0,
    wrong.slice(0, 3).map((x: any) => `${x.college}: cutoff ${x.closingRank} labelled ${x.chance}`).join('; '));
  // The list is sorted toughest-cutoff-first, so a naive slice(0, limit) drops every Safe
  // college off the end — the summary claimed "542 Safe" while showing the student none.
  for (const band of ['Safe', 'Good', 'Reach', 'Tough'] as const) {
    if (!r.counts[band]) continue;
    check(`the ${band} colleges it counted are actually in the list it returns`,
      r.matches.some((x: any) => x.chance === band),
      `counts.${band} = ${r.counts[band]} but no ${band} college was returned`);
  }
  check('nothing below the 0.75 cushion is offered at all',
    r.matches.every((x: any) => x.closingRank >= 7500),
    `lowest cutoff offered: ${Math.min(...r.matches.map((x: any) => x.closingRank))}`);
  check('matches are ordered hardest-cutoff-first',
    r.matches.every((x: any, i: number) => i === 0 || r.matches[i - 1].closingRank <= x.closingRank));
  check('the counts add up to the matches returned',
    Object.values(r.counts).reduce((a: any, b: any) => a + b, 0) === r.total, JSON.stringify(r.counts));

  // ── a better rank must never open FEWER doors ────────────────────────
  const good = (await post({ rank: 5000, category: 'General' })).body.data;
  const poor = (await post({ rank: 50000, category: 'General' })).body.data;
  check('a stronger rank is Safe at more colleges than a weaker one',
    good.counts.Safe > poor.counts.Safe, `#5,000 -> ${good.counts.Safe} safe, #50,000 -> ${poor.counts.Safe} safe`);

  // ── filters ──────────────────────────────────────────────────────────
  const mh = (await post({ rank: 20000, category: 'OBC', state: 'Maharashtra', course: 'MBBS' })).body.data;
  check('the state filter is honoured', mh.matches.every((x: any) => x.state === 'Maharashtra'),
    [...new Set(mh.matches.map((x: any) => x.state))].join(', '));
  check('the course filter is honoured', mh.matches.every((x: any) => x.course === 'MBBS'));
  check('it actually finds Maharashtra colleges', mh.total > 0, `${mh.total} matches`);

  const r1 = (await post({ rank: 20000, category: 'OBC', round: 1 })).body.data;
  check('the round filter is honoured', r1.matches.every((x: any) => x.round === 1));

  // With no round chosen, each college appears ONCE, at its most lenient cutoff.
  const anyRound = (await post({ rank: 20000, category: 'OBC', course: 'MBBS', quota: 'All India Quota (AIQ)' })).body.data;
  const keys = anyRound.matches.map((x: any) => x.collegeId);
  check('with no round chosen a college is listed once, not once per round',
    keys.length === new Set(keys).size,
    `${keys.length} rows for ${new Set(keys).size} colleges`);

  // ── input validation ─────────────────────────────────────────────────
  const cases: [string, any][] = [
    ['a score above 720', { marks: 800, category: 'General' }],
    ['both a score and a rank', { marks: 600, rank: 1000, category: 'General' }],
    ['neither a score nor a rank', { category: 'General' }],
    ['a missing category', { marks: 600 }],
    ['a rank of zero', { rank: 0, category: 'General' }],
    ['a negative rank', { rank: -5, category: 'General' }],
  ];
  for (const [label, body] of cases) {
    const res = await post(body);
    check(`${label} is rejected`, res.status === 400, `got ${res.status}: ${JSON.stringify(res.body).slice(0, 90)}`);
  }

  // A NEET score CAN be negative (-1 per wrong answer), so it must not be rejected.
  const neg = await post({ marks: 0, category: 'General' });
  check('a score of 0 is accepted (it is a real score)', neg.status === 200, `got ${neg.status}`);

  console.log(failures ? `\n${failures} FAILED\n` : '\nall predictor checks passed\n');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });
