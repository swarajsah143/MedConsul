#!/usr/bin/env python3
"""
Propose `colleges.mccCode` backfills from a parsed MCC seat matrix.

    python3 data/propose_mcc_codes.py            # -> data/raw/mcc_code_proposals.json

READ-ONLY. Writes a proposal file for review; a separate script applies the accepted ones.

WHY A SEPARATE PROPOSAL STEP
A wrong `mccCode` is worse than a missing one, and worse in a way that hides: once a college
carries a code, every future MCC ingest joins to it EXACTLY and silently, with no fuzzy-match
warning to notice. A missing code just falls back to name matching, which is where we already are.
So this never writes; it emits tiers for a human (or an adversarial reviewer) to accept.

TIERS
  exact   — the cell's fingerprint matches exactly one college, discipline-checked and state-gated.
  strong  — no exact hit, but the fuzzy resolver returned a single college AND the college's town
            appears in the cell. The town check is the extra guard: the resolver alone put the
            Bellary dental college onto Bangalore's.
  weak    — resolver returned something, but the town is absent from the cell. NOT proposed.
  none    — resolver declined (tie, veto, or nothing above threshold). NOT proposed.

Only `exact` and `strong` are proposed. Everything else is quarantined WITH its reason, so the
misses are inspectable rather than invisible.
"""
import json
import os
import re
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import namematch as nm  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MATRIX = os.path.join(REPO, 'data/raw/seat_matrix.2026.json')
COLLEGES = os.path.join(REPO, 'data/raw/colleges.live.json')
OUT = os.path.join(REPO, 'data/raw/mcc_code_proposals.json')


def norm_state(s):
    """The matrix and our table spell a few states differently."""
    s = (s or '').strip()
    fixes = {
        'Andaman And Nicobar Islands': 'Andaman Nicobar Islands',
        'Jammu And Kashmir': 'Jammu and Kashmir',
        'The Dadra And Nagar Haveli And Daman And Diu': 'Dadra and Nagar Haveli',
        'Delhi (Nct)': 'Delhi',
    }
    return fixes.get(s, s)


def town_in_cell(college, cell):
    """Does the college's own town appear in the institute cell?

    The guard that the fuzzy resolver lacks. `coverage()` can clear its threshold on a short
    college name whose town is simply missing from the cell — which is how a Bellary dental
    college scored against Bangalore's. A college with no recorded city cannot be checked, so it
    is treated as unverified rather than passed.
    """
    city = (college.get('city') or '').strip().lower()
    if not city:
        return False
    hay = re.sub(r'[^a-z0-9]+', ' ', cell.lower())
    return any(tok and tok in hay.split() for tok in re.split(r'[^a-z0-9]+', city))


def main():
    matrix = json.load(open(MATRIX))
    colleges = json.load(open(COLLEGES))
    index = nm.CollegeIndex(colleges)

    # One representative cell per code — the code is 1:1 with the institute.
    by_code = {}
    for r in matrix:
        code = str(r.get('instituteCode') or '').strip()
        if not code:
            continue
        by_code.setdefault(code, {'name': r.get('instituteName', ''), 'state': r.get('state', '')})

    taken = defaultdict(list)   # collegeId -> [codes]  (to catch two codes claiming one college)
    proposals, quarantine = [], []
    tiers = Counter()

    for code, info in sorted(by_code.items()):
        cell = info['name']
        state = norm_state(info['state'])
        college, _display = index.resolve(cell, state)

        if not college:
            tiers['none'] += 1
            quarantine.append({'mccCode': code, 'cell': cell, 'state': state, 'reason': 'resolver declined'})
            continue

        # Re-derive whether this was an exact fingerprint hit, for the tier label.
        name = nm.name_region(cell)
        exact_hits = [c for c in index.by_key.get(nm.key(name), [])
                      if not nm.discipline_clash(name, c['name'])]
        is_exact = len(exact_hits) == 1 and exact_hits[0] is college

        if is_exact:
            tier = 'exact'
        elif town_in_cell(college, cell):
            tier = 'strong'
        else:
            tier = 'weak'

        tiers[tier] += 1
        rec = {
            'mccCode': code,
            'collegeId': str(college.get('_id') or college.get('id') or ''),
            'collegeName': college['name'],
            'collegeCity': college.get('city', ''),
            'collegeState': college.get('state', ''),
            'cell': cell,
            'matrixState': state,
            'tier': tier,
        }
        if tier in ('exact', 'strong'):
            proposals.append(rec)
            taken[rec['collegeId']].append(code)
        else:
            rec['reason'] = "resolver matched but the college's town is absent from the cell"
            quarantine.append(rec)

    # A college claimed by two codes means at least one is wrong — MCC codes are 1:1 with
    # institutes, so drop BOTH rather than pick. This is the check that catches a duplicate
    # cluster absorbing two different institutes.
    collisions = {cid: codes for cid, codes in taken.items() if len(codes) > 1}
    if collisions:
        bad_codes = {c for codes in collisions.values() for c in codes}
        for p in [p for p in proposals if p['mccCode'] in bad_codes]:
            p['reason'] = f"collision: college also claimed by codes {taken[p['collegeId']]}"
            quarantine.append(p)
        proposals = [p for p in proposals if p['mccCode'] not in bad_codes]

    json.dump({'proposals': proposals, 'quarantine': quarantine}, open(OUT, 'w'), indent=2)

    print(f'  codes in matrix        : {len(by_code)}')
    print(f'  tiers                  : {dict(tiers)}')
    print(f'  colliding colleges     : {len(collisions)} (both codes dropped)')
    print(f'  PROPOSED (exact+strong): {len(proposals)}')
    print(f'  quarantined            : {len(quarantine)}')
    print(f'  -> {OUT}')


if __name__ == '__main__':
    main()
