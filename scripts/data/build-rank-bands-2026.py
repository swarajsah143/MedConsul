#!/usr/bin/env python3
"""
Build the NEET-UG 2026 marks -> All India Rank curve (`rankBands`) from OFFICIAL NTA data.

    python3 scripts/data/build-rank-bands-2026.py            # dry run, prints the table
    python3 scripts/data/build-rank-bands-2026.py --write    # writes rank-bands-2026.json

Dry-run by default, per repo convention.

WHY THIS EXISTS
---------------
NEET UG 2026 was cancelled after a paper leak (3 May exam scrapped), re-conducted on
21 June 2026, results declared 16 July 2026. The 2025 curve is therefore a weak prior:
the 2026 paper was far easier at the top (topper 715 vs 686 in 2025) and far harsher in
the middle (the 50th-percentile qualifying mark jumped from 144 to 213). Nothing about
the 2025 curve is reused here. Every number below traces to an NTA document.

SOURCES (all primary, all NTA, all fetched and parsed - no coaching-site data)
------------------------------------------------------------------------------
[PR]  "Press Release for NEET (UG) - 2026 Results (21st June 2026)", NTA, 16 July 2026.
      https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2026/07/20260716477215762.pdf
      Text-layer PDF, 4 pages.

[KD]  "KEY DATA POINTS OF NEET (UG) OVER YEARS", NTA, 16 July 2026.
      https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2026/07/202607161539405935.pdf
      Scanned PDF, 4 pages; Table 7 (appeared/qualified) and Table 8 (qualifying
      percentile criteria -> marks range -> candidate count) read off page 3.

[TL]  "List of Toppers of NEET(UG) - 2026 (Held on 21st June, 2026)", NTA, 16 July 2026.
      https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2026/07/20260716180970800.pdf
      Scanned PDF, 15 pages. Columns: Sr / Application / Name / Gender / Category /
      Percentile / NEET rank / State.  There is NO marks column - marks enter only
      through the three state toppers whose scores [PR] states in prose.

THE PERCENTILE BRIDGE
---------------------
[TL] publishes a percentile for every listed candidate. NTA's percentile is
        percentile = 100 * (# candidates scoring STRICTLY LESS) / (# appeared)
so the cumulative count at a candidate's mark is

        #(score >= m) = N_appeared * (1 - percentile/100)

This is not an assumption - it is verified against [PR] in `verify()` below: applied to
the toppers list it reproduces [PR]'s own independently-stated counts "Top 17 rankers
scored more than 705" and "19 candidates scored above 700" exactly. That bridge is what
turns three state toppers' quoted marks into three mid-curve rank anchors.

A cumulative count at score S IS the (worst) All India Rank at score S.
"""

import argparse
import json
import os
import sys

from scipy.interpolate import PchipInterpolator

# ── Official scalars ──────────────────────────────────────────────────────────
N_APPEARED = 1_999_895   # [KD] Table 7, NEET (UG) 2026 "Appeared", Total row
N_QUALIFIED = 1_121_185  # [KD] Table 7 / Table 8 total; [PR] "11.21 lakh"

# ── Anchors: marks -> #(score >= marks) == All India Rank at that score ───────
# 'kind' is the honesty label that ships in the report; nothing here is a coaching
# prediction and nothing here is carried over from 2025.
ANCHORS = [
    # marks,     rank, kind,        citation
    (715,           1, 'observed',  '[PR] highest score 715/720 (Aryan Gupta, Panshul Bansal). '
                                    '[TL] both at percentile 99.9999 -> #(>=715)=2; the band top is '
                                    'pinned to rank 1 so a 715 maps to AIR 1.'),
    (706,          17, 'observed',  '[PR] "The Top 17 rankers who scored more than 705 marks". '
                                    'Confirmed independently by [TL] percentile 99.99915 -> 17.'),
    (701,          19, 'observed',  '[PR] "19 candidates scored above 700 out of 720". '
                                    'Confirmed independently by [TL] percentile 99.99905 -> 19.'),
    (690,         138, 'observed',  '[TL] title: "List of Top 138 candidates scoring equal to or '
                                    'more than 690 marks" (the list enumerates exactly 138 people).'),
    (650,       1_492, 'observed',  '[PR] "1,492 candidates scored 650 and above".'),
    (606,       8_363, 'observed',  '[PR] state topper Dhruv Tripathi (Andaman & Nicobar) = 606 marks; '
                                    '[TL] p.12 percentile 99.58183, AIR 8339 -> #(>=606)=8363.'),
    (600,      10_160, 'observed',  '[PR] "10,160 candidates scored 600 and above".'),
    (573,      21_936, 'observed',  '[PR] state topper Fahmida Anees (Lakshadweep) = 573 marks; '
                                    '[TL] p.13 percentile 98.90314, AIR 21815 -> #(>=573)=21936.'),
    (530,      55_908, 'observed',  '[PR] state topper Jigmet Yangchan Lamo (Ladakh) = 530 marks; '
                                    '[TL] p.13 percentile 97.20445, AIR 55742 -> #(>=530)=55908.'),
    (500,      90_780, 'observed',  '[PR] "90,780 candidates scored 500 and above".'),
    (400,        None, 'modelled',  'NO 2026 OBSERVATION EXISTS between 500 and 213. Filled by '
                                    'monotone PCHIP interpolation of log10(rank) vs marks.'),
    (300,        None, 'modelled',  'NO 2026 OBSERVATION EXISTS between 500 and 213. Filled by '
                                    'monotone PCHIP interpolation of log10(rank) vs marks.'),
    (213,     996_935, 'observed',  '[KD] Table 8: >=50th percentile criterion, marks range 715-213, '
                                    '996,935 candidates. A counted total, not a percentile inference.'),
    (177,   1_185_000, 'derived',   'The 40th-percentile qualifying mark is 177 ([KD] Table 8, '
                                    'OBC/SC/ST rows: 212-177). Reserved-category candidates counted in '
                                    '177-212 = 123,770; UR/EWS candidates in that band are NOT counted '
                                    'anywhere because they did not qualify. Estimated at ~64k from the '
                                    'UR/EWS:reserved ratio below 213 (0.506), giving ~1,185,000. '
                                    'Bounded below by 1,121,185 (all qualified scored >=177) and above '
                                    'by 1,199,937 (60% of appeared).'),
    (0,     N_APPEARED, 'floor',    '[KD] Table 7 total appeared = 1,999,895. Slight overstatement: '
                                    'candidates with negative raw scores sit below 0. Irrelevant to '
                                    'college matching - 177 is the absolute qualifying floor.'),
]

# Anchors used to fit the interpolator across the 500..213 gap. Restricted to the
# smooth mid/low part of the curve: the 715..690 anchors are a near-vertical cliff
# (rank 1 to 138 over 25 marks) and would distort the fit's slope estimate.
FIT_RANGE = (177, 650)


def verify() -> None:
    """Re-derive [PR]'s own numbers from [TL]'s percentiles. Fails loudly on drift."""
    def cum(p): return N_APPEARED * (1 - p / 100.0)

    checks = [
        ('[TL] AIR 1-2  p=99.9999  vs [PR] two toppers at 715',      99.9999,   2),
        ('[TL] AIR 8-17 p=99.99915 vs [PR] "Top 17 ... above 705"',  99.99915, 17),
        ('[TL] AIR 18-19 p=99.99905 vs [PR] "19 ... above 700"',     99.99905, 19),
    ]
    for label, p, expect in checks:
        got = cum(p)
        assert abs(got - expect) < 0.02, f'percentile bridge broke: {label} -> {got}'
        print(f'  ok  {label:52s} -> {got:8.4f} == {expect}')

    # [KD] Table 8 must close, and must reconcile with [KD] Table 5 category totals.
    t8 = 996_935 + 81_111 + 29_947 + 12_452 + 480 + 185 + 64 + 11
    assert t8 == N_QUALIFIED, f'[KD] Table 8 does not close: {t8}'
    print(f'  ok  [KD] Table 8 sums to {t8:,} == stated qualified total')

    t5 = 291_133 + 95_026 + 512_014 + 159_296 + 63_716          # Gen, EWS, OBC, SC, ST
    assert t5 == N_QUALIFIED, f'[KD] Table 5 does not close: {t5}'
    ur_ews_ge213 = 291_133 + 95_026 - 480
    reserved = (996_935 - ur_ews_ge213) + (81_111 + 29_947 + 12_452 + 185 + 64 + 11)
    assert reserved == 512_014 + 159_296 + 63_716, f'Table 5/8 cross-check failed: {reserved}'
    print(f'  ok  [KD] Table 5 x Table 8 cross-check: reserved qualified = {reserved:,}')

    ranks = [r for _, r, _, _ in ANCHORS if r is not None]
    assert ranks == sorted(ranks), 'anchors are not monotone in rank'
    print('  ok  anchors strictly monotone across all three documents')


def fill_gap() -> dict:
    """Interpolate the two modelled anchors inside the 500..213 evidence gap.

    Linear-in-rank across a 287-mark gap is indefensible: it implies ~3,157 ranks per
    mark uniformly, i.e. a log-slope of 0.0149/mark immediately below 500 where the
    measured slope at 500-530 is 0.0070/mark - a factor-2 kink, and the mirror-image
    error near 213. Interpolating log10(rank) instead keeps the slope continuous with
    both measured shoulders. PCHIP is shape-preserving, so it cannot overshoot or
    introduce a non-monotone wiggle.
    """
    known = [(m, r) for m, r, _, _ in ANCHORS
             if r is not None and FIT_RANGE[0] <= m <= FIT_RANGE[1]]
    known.sort()
    xs = [m for m, _ in known]
    ys = [__import__('math').log10(r) for _, r in known]
    f = PchipInterpolator(xs, ys)
    return {m: int(round(10 ** float(f(m)))) for m in (400, 300)}


def build() -> tuple[list[dict], list[tuple]]:
    filled = fill_gap()
    anchors = []
    for m, r, kind, cite in ANCHORS:
        anchors.append((m, filled[m] if r is None else r, kind, cite))
    anchors.sort(key=lambda a: -a[0])

    bands = []
    for (m_hi, r_hi, _, _), (m_lo, r_lo, _, _) in zip(anchors, anchors[1:]):
        bands.append({
            'year': 2026,
            'marksMin': m_lo, 'marksMax': m_hi,
            'rankMin': r_hi,  'rankMax': r_lo,   # rankMin is the rank at marksMax
        })
    return bands, anchors


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--write', action='store_true', help='write the JSON (default: dry run)')
    args = ap.parse_args()

    print('Verifying official sources against each other:')
    verify()

    bands, anchors = build()

    print(f'\n{"marks":>10}  {"AIR":>10}  {"kind":<9}')
    for m, r, kind, _ in anchors:
        print(f'{m:>10}  {r:>10,}  {kind:<9}')

    print(f'\n{len(bands)} bands:')
    for b in bands:
        print(f"  {b['marksMin']:>3}-{b['marksMax']:<3}  ->  AIR {b['rankMin']:>9,} - {b['rankMax']:<9,}")

    for a, b in zip(bands, bands[1:]):
        assert a['marksMin'] == b['marksMax'], f'band gap at {a["marksMin"]}'
        assert a['rankMax'] == b['rankMin'], f'rank discontinuity at {a["marksMin"]}'
    print('\nbands tile the axis with no gap and no rank discontinuity')

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rank-bands-2026.json')
    if not args.write:
        print(f'\nDRY RUN - nothing written. Re-run with --write to emit {out}')
        return 0

    # Formatting mirrors scripts/data/rank-bands-2025.json: one band per line, values
    # left-aligned with trailing padding so the columns line up when read side by side.
    with open(out, 'w') as fh:
        fh.write('[\n')
        fh.write(',\n'.join(
            f'  {{ "year": {b["year"]}, '
            f'"marksMin": {str(b["marksMin"]) + ",":<5}'
            f'"marksMax": {str(b["marksMax"]) + ",":<5}'
            f'"rankMin": {str(b["rankMin"]) + ",":<9}'
            f'"rankMax": {b["rankMax"]} }}'
            for b in bands))
        fh.write('\n]\n')
    print(f'\nwrote {out}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
