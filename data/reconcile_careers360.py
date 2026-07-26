#!/usr/bin/env python3
"""
Reconcile the Careers360 aggregator fee rows against the LIVE college table, insert-only.

Careers360 (`fetch_careers360_fees.py`) is a self-declared aggregator, NOT a statutory fee
regulator, so `reconcile_fees.py` deliberately REJECTS it from the authoritative replace-set.
It is still useful as fast GAP-FILL for colleges that have no statutory fee yet — provided it
can never overwrite an authoritative row. This script is that gap-fill path.

Why it exists separately from reconcile_fees.py:
  * matches against LIVE colleges (Mongo), not the stale out/colleges.json snapshot. The
    earlier one-off careers360 match ran against 820 colleges; the table now holds 1,114, and
    ~294 of the newer rows (Bihar/Jharkhand/Chhattisgarh govt colleges, etc.) only exist live.
  * emits collegeId directly (resolved here) so the rows post straight to the bulk route.
  * INSERT-ONLY: a resolved row whose fees natural key (collegeId, course, category, quota)
    already exists is DROPPED, so an authoritative statutory fee is never clobbered by an
    aggregator number. This reproduces the `$setOnInsert` semantics the bulk route lacks.

Same conservative vetoes as the rest of the pipeline (namematch.CollegeIndex): discipline clash
(MBBS row can't land on a dental college), and the bare-city guard — a college whose whole
significant name is a single token (a bare city, "Bangalore Medical College..." -> {bangalore})
may match ONLY by exact fingerprint, never by coverage, or it soaks up any cell mentioning the
city (the BGS -> BMCRI bug). Careers360 rows carry NO state, so state gating is unavailable and
the vetoes are the only guard — hence they are applied strictly.

Inputs  (all JSON; the two live_* files are fresh Mongo exports — see the mongosh in the
         accompanying import step / README):
  raw/fees.careers360.json     scraped aggregator rows (collegeName, course, category, quota, ...)
  raw/colleges.live.json       [{_id, name, state, aliases}]  — live colleges
  raw/fee_keys.live.json       [[collegeId, course, category, quota], ...] — existing fee keys

Output:
  raw/fees.careers360.resolved.json   net-new rows WITH collegeId, ready for the bulk route
Usage:  python3 data/reconcile_careers360.py
"""
import json
import os
import collections

from namematch import CollegeIndex, key, name_region, tokens

D = os.path.dirname(os.path.abspath(__file__))
RAW = f'{D}/raw'
REQUIRED = ('collegeName', 'course', 'category', 'quota', 'tuitionFee', 'source')
KEEP_FIELDS = ('course', 'category', 'quota', 'tuitionFee', 'hostelFee', 'source')


def main():
    rows = json.load(open(f'{RAW}/fees.careers360.json'))
    colleges = json.load(open(f'{RAW}/colleges.live.json'))
    existing = {tuple(k) for k in json.load(open(f'{RAW}/fee_keys.live.json'))}
    idx = CollegeIndex(colleges)

    good, bad = [], []
    dropped = collections.Counter()

    for r in rows:
        missing = [f for f in REQUIRED if r.get(f) in (None, '', [])]
        if missing:
            dropped[f'missing:{",".join(missing)}'] += 1
            continue

        college, _ = idx.resolve(r['collegeName'])  # no state available for careers360

        # bare-city guard (identical rule to reconcile_fees.py): a single-token college name may
        # match ONLY by exact fingerprint, never by fuzzy coverage.
        if college and len(tokens(college['name'])) == 1 \
                and key(college['name']) != key(name_region(r['collegeName'])):
            dropped['bare-city-not-exact'] += 1
            bad.append({**r, '_why': f"coverage-matched bare-city {college['name']!r} w/o exact fingerprint"})
            continue

        if not college:
            dropped['unresolved-college'] += 1
            bad.append({**r, '_why': 'no confident college match in live table'})
            continue

        cid = str(college['_id'])
        nk = (cid, r['course'], r['category'], r['quota'])
        if nk in existing:
            dropped['already-has-fee (authoritative kept)'] += 1
            continue

        out = {k: r[k] for k in KEEP_FIELDS if r.get(k) not in (None, '')}
        out['collegeId'] = cid
        out['_collegeName'] = college['name']   # for the human-readable report only; stripped on import
        good.append(out)

    # de-dup within this batch on the natural key (two careers360 spellings -> one college)
    seen, deduped = set(), []
    for g in good:
        nk = (g['collegeId'], g['course'], g['category'], g['quota'])
        if nk in seen:
            continue
        seen.add(nk)
        deduped.append(g)

    json.dump(deduped, open(f'{RAW}/fees.careers360.resolved.json', 'w'), indent=1, ensure_ascii=False)

    # A resolved row is a net-new natural KEY (else it was dropped as already-has-fee). But some
    # land on a college that already has a fee under a DIFFERENT quota, so they add a row without
    # adding a newly-covered college. Report both — the second is the coverage number.
    already_covered = {k[0] for k in existing}
    new_keys = len(deduped)
    new_colleges = len({g['collegeId'] for g in deduped if g['collegeId'] not in already_covered})
    print(f'  careers360 rows in       : {len(rows)}')
    print(f'  net-new fee rows (keys)  : {new_keys}')
    print(f'  newly-covered colleges   : {new_colleges}')
    print(f'  -> raw/fees.careers360.resolved.json')
    for why, n in dropped.most_common():
        print(f'      {n:>4}  {why}')
    print('\n  sample net-new (row -> college):')
    for g in deduped[:20]:
        print(f"      {g['_collegeName'][:48]:49} {g['quota'][:20]:21} ₹{g['tuitionFee']}")


if __name__ == '__main__':
    main()
