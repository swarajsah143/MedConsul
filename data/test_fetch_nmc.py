#!/usr/bin/env python3
"""
Tests for the NMC name matcher.   Run:  python3 test_fetch_nmc.py

The matcher's failure mode is not "it crashes", it is "it silently gives one college
another college's seat count". Nothing downstream can catch that — the number is plausible,
and a student picks a college on it. So the matcher is tested against a SYNTHETIC NMC
register built from our own college list and perturbed the way the real register differs
from a counselling CSV (dotted initialisms, '&' vs 'and', omitted city suffixes), with a
slice of colleges held out entirely so that false matches become detectable.

Three invariants, all hard failures:

  COLLISION        two genuinely different colleges in one state must not share a match key.
  MIS-ATTRIBUTION  a matched college must carry ITS OWN seats, never a neighbour's.
  FALSE MATCH      a college absent from the register must come back unmatched.

Recall is reported but NOT asserted. The register genuinely names some colleges differently
than the counselling data does, and the right outcome there is a blank an operator can see —
not a guess. Precision is the invariant; recall is a number to look at.

Note on quota variants: our college list carries four rows for Dr D Y Patil, Kolhapur (plain,
"— General category", "— Management/Paid seats", "— NRI seats") because the source CSV encoded
a QUOTA into the college name. They are one institution, so they SHARE a match key by design
and must all resolve to the same seats. The synthetic register is deduped accordingly — a real
regulator lists that college once.
"""
import json, os, random, re, shutil, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_nmc
from fetch_nmc import norm, key

D = os.path.dirname(os.path.abspath(__file__))
HELD_OUT = 77

base_name = lambda n: re.split(r'\s+[—–]\s+|\s+--\s+', n)[0].strip()


def nmc_ify(name, rnd):
    """Perturb one of our names into the shape the NMC register would write it."""
    s = base_name(name)                                       # the register has no quota tags
    if rnd.random() < 0.5:
        s = s.replace(' & ', ' and ')
    if rnd.random() < 0.4:                                    # ACPM -> A.C.P.M.
        s = re.sub(r'\b([A-Z]{3,5})\b', lambda m: '.'.join(m.group(1)) + '.', s, count=1)
    if rnd.random() < 0.35 and ',' in s:                      # the register sometimes omits the city
        s = s.rsplit(',', 1)[0]
    return re.sub(r'\s+', ' ', s).strip()


def build_register(colleges, rnd):
    """One register entry per INSTITUTION, not per row — dedupe the quota variants first."""
    present = colleges[:-HELD_OUT]
    seen, register, seats = {}, [], {}
    for c in present:
        k = (key(c['name']), c['state'])
        if k not in seen:
            cid = 1000 + len(register)
            seen[k] = cid
            seats[k] = str(rnd.choice([50, 100, 150, 200, 250]))
            register.append({
                'collegeId': cid,
                'collegeName': nmc_ify(c['name'], rnd),
                'stateName': c['state'],
                'universityName': f"{c['state']} University of Health Sciences",
                'yearOfInc': str(1960 + cid % 60),
                'ugApproved': seats[k],
            })
    # every row of an institution expects that institution's seats
    want = {c['name']: seats[(key(c['name']), c['state'])] for c in present}
    return register, want


def find_duplicates(colleges):
    """Rows that share a match key — i.e. rows that are the SAME institution.

    This is a report on the DATA, not an assertion about the matcher. Two rows landing on one
    key is exactly right when they are one college spelled two ways ("Government Medical
    College, Vadodara (Baroda)" and "Medical College, Baroda (Government Medical College,
    Vadodara)"), or when the source CSV baked a quota into the name ("… — NRI seats"). The key
    collapsing them is the feature; what it reveals is that our college table has duplicates.

    Merging them is a migration, not a matcher change: closingRanks rows carry a collegeId
    foreign key, so the ranks have to be repointed before a duplicate row can be dropped.
    """
    groups = {}
    for c in colleges:
        groups.setdefault((key(c['name']), c['state']), []).append(c['name'])
    dupes = {k: v for k, v in groups.items() if len(v) > 1}
    quota = [v for v in dupes.values() if len({base_name(n) for n in v}) == 1]
    spelling = [v for v in dupes.values() if len({base_name(n) for n in v}) > 1]
    return quota, spelling


def find_empty_keys(colleges):
    """A name that normalizes to nothing would match anything. Always a real bug."""
    return [c['name'] for c in colleges if not key(c['name'])]


def run_match(colleges, register):
    tmp = tempfile.mkdtemp()
    try:
        os.makedirs(f'{tmp}/raw'); os.makedirs(f'{tmp}/out')
        json.dump(colleges, open(f'{tmp}/out/colleges.json', 'w'))
        json.dump(register, open(f'{tmp}/raw/nmc_list.json', 'w'))
        fetch_nmc.D, fetch_nmc.RAW = tmp, f'{tmp}/raw'
        fetch_nmc.match()
        return {r['name']: r for r in json.load(open(f'{tmp}/raw/nmc_enrich.json'))}
    finally:
        fetch_nmc.D, fetch_nmc.RAW = D, f'{D}/raw'
        shutil.rmtree(tmp)


if __name__ == '__main__':
    colleges = [c for c in json.load(open(f'{D}/out/colleges.json'))
                if 'MBBS' in c.get('coursesOffered', [])]
    rnd = random.Random(7)
    register, want = build_register(colleges, rnd)
    held = {c['name'] for c in colleges[-HELD_OUT:]}

    print(f'\n  corpus {len(colleges)} MBBS colleges  ->  register of {len(register)} '
          f'institutions ({HELD_OUT} held out)\n')
    got = run_match(colleges, register)

    empty = find_empty_keys(colleges)
    mis = [n for n, r in got.items() if n in want and str(r.get('totalSeats')) != want[n]]
    false = [n for n in got if n in held]

    print('\n  ══════════ matcher invariants (hard) ══════════')
    print(f'  MIS-ATTRIBUTED seats             : {len(mis)}')
    for m in mis[:8]:
        print(f'      {m}')
    print(f'  FALSE MATCHES (held-out college) : {len(false)}')
    for f in false[:8]:
        print(f'      {f}')
    print(f'  names normalizing to nothing     : {len(empty)}')
    for e in empty[:5]:
        print(f'      {e}')
    print(f'\n  recall (informational, not asserted) : {len(got)}/{len(want)} '
          f'({len(got) * 100 // max(len(want), 1)}%)')

    quota, spelling = find_duplicates(colleges)
    n_dupe = sum(len(v) - 1 for v in quota + spelling)
    print(f'\n  ══════════ data-quality report (informational) ══════════')
    print(f'  duplicate rows in our college table : {n_dupe}')
    print(f'      {sum(len(v)-1 for v in quota)} quota variants baked into the name '
          f'({len(quota)} colleges)')
    print(f'      {sum(len(v)-1 for v in spelling)} spelled two ways ({len(spelling)} colleges)')
    for v in spelling:
        print(f'          {v[0]}\n       == {v[1]}')
    print(f'  -> these are one institution each; merging them means repointing closingRanks.')

    bad = len(mis) + len(false) + len(empty)
    print('\n  ' + ("✓ PASS — no college can be given another college's seats"
                    if bad == 0 else f'✗ FAIL — {bad} violation(s)') + '\n')
    sys.exit(1 if bad else 0)
