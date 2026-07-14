#!/usr/bin/env python3
"""
Reconcile sourced fee rows against the real college table.

The fee rows are collected from official state Fee-Regulating-Authority notifications and
deemed-university fee pages, so each `collegeName` is spelled the way THAT document spells
it ("Dr. D. Y. Patil Medical College, Kolhapur", "K.S. Hegde Medical Academy") — which is
not how our colleges table spells it. `import.mjs` resolves a fee row's college by an EXACT
name lookup and silently drops the row if it misses, so the names have to be canonicalised
here first.

Same rule as everywhere else in this pipeline: a fee row that cannot be pinned to a college
with confidence is QUARANTINED (raw/fees.unresolved.json), never guessed at. A fee attached
to the wrong college tells a family they can afford a place they cannot.

Input : raw/fees.sourced.json      what the sourcing agents returned, names as the source spells them
Output: raw/fees.json              canonicalised + validated — this is what stage.py consumes
        raw/fees.unresolved.json   rows we refused to attach to a college, and why
"""
import json
import os
import sys
import collections

from namematch import CollegeIndex

D = os.path.dirname(os.path.abspath(__file__))
RAW, OUT = f'{D}/raw', f'{D}/out'

REQUIRED = ('collegeName', 'course', 'category', 'quota', 'tuitionFee', 'source')

# A tuition fee outside this range is a unit error, not a fee: notifications quote the annual
# figure in rupees, but some quote it in lakhs ("15.57") and some quote the whole 4.5-year
# course. Either way we do not silently rescale it — we drop it and say so.
MIN_FEE, MAX_FEE = 1_000, 3_000_000


def main():
    rows = json.load(open(f'{RAW}/fees.sourced.json'))
    colleges = json.load(open(f'{OUT}/colleges.json'))
    idx = CollegeIndex(colleges)

    good, bad = [], []
    dropped = collections.Counter()

    for r in rows:
        missing = [f for f in REQUIRED if r.get(f) in (None, '', [])]
        if missing:
            dropped[f'missing:{",".join(missing)}'] += 1
            bad.append({**r, '_why': f'missing {missing}'})
            continue

        fee = r['tuitionFee']
        if not isinstance(fee, (int, float)) or not (MIN_FEE <= fee <= MAX_FEE):
            dropped[f'implausible-fee'] += 1
            bad.append({**r, '_why': f'tuitionFee {fee!r} outside {MIN_FEE}-{MAX_FEE}'})
            continue

        # An aggregator/SEO site is exactly where wrong fee numbers come from. The agents were
        # told to cite the official notification; enforce it rather than trust it.
        src = (r.get('source') or '').lower()
        if any(b in src for b in ('collegedunia', 'shiksha', 'careers360', 'edufever',
                                  'getmyuni', 'kaullege', 'bodmas', 'meducate')):
            dropped['non-authoritative-source'] += 1
            bad.append({**r, '_why': f'aggregator source: {r["source"]}'})
            continue

        college, _ = idx.resolve(r['collegeName'])
        if not college:
            dropped['unresolved-college'] += 1
            bad.append({**r, '_why': 'could not pin to a college in out/colleges.json'})
            continue

        good.append({**r, 'collegeName': college['name']})

    json.dump(good, open(f'{RAW}/fees.json', 'w'), indent=1, ensure_ascii=False)
    json.dump(bad, open(f'{RAW}/fees.unresolved.json', 'w'), indent=1, ensure_ascii=False)

    print(f'\n  reconciled  {len(good)} / {len(rows)} fee rows')
    print(f'  quarantined {len(bad)}  -> raw/fees.unresolved.json')
    for why, n in dropped.most_common():
        print(f'      {n:>4}  {why}')

    if good:
        by_col = len({r['collegeName'] for r in good})
        print(f'\n  colleges covered {by_col}')
        print(f'  quotas   {dict(collections.Counter(r["quota"] for r in good))}')
        print(f'  courses  {dict(collections.Counter(r["course"] for r in good))}')
        print(f'  cited    {sum(1 for r in good if r.get("source"))} / {len(good)}')


if __name__ == '__main__':
    if not os.path.exists(f'{RAW}/fees.sourced.json'):
        sys.exit('missing raw/fees.sourced.json — the fee-sourcing agents have not landed yet')
    main()
