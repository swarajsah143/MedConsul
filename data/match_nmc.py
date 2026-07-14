#!/usr/bin/env python3
"""
Match the official NMC UG college list against our CSV-derived college base and emit
enrichment rows (raw/enriched_nmc.json) that merge_colleges.py will consume.

NMC is the authoritative registry, so anything it says wins over a value parsed out of
a college's display name. It carries exactly the fields our base is missing:

    universityName    -> affiliation
    managementupdate  -> type        (Govt. -> Government; Trust/Society/Private -> Private)
    yearOfInc         -> established
    ugApproved        -> totalSeats
    website / city    -> website / city

Matching is the whole problem: the two lists spell the same college differently
("ACPM Medical College, Dhule" vs "A.C.P.M. Medical College, Dhule"). We normalise
aggressively, then require a high token-similarity AND a corroborating signal (same
city or same state) before accepting a pair. A wrong match writes a wrong seat count
into a real college, so unmatched is strictly better than mismatched: everything we
are not sure about is written to raw/nmc_unmatched.json for an agent to resolve.

NMC only covers MBBS. BDS/AYUSH colleges in the base will not match here by design.
"""
import json, re, os, collections

D = os.path.dirname(os.path.abspath(__file__))
RAW, OUT = f'{D}/raw', f'{D}/out'

nmc = json.load(open(f'{RAW}/nmc_ug_2023.json'))['ugCollege']
base = json.load(open(f'{OUT}/colleges.base.json'))

# --- normalisation -----------------------------------------------------------------
# The matcher lives in namematch.py, shared with parse_mcc_allotments.py. It used to be
# defined here, but a second copy in the allotment parser is exactly how the dental and
# same-name-different-town traps get quietly reintroduced in one file after being fixed
# in the other. The vetoes, and the bug behind each, are documented there.
from namematch import (norm, tokens, key, sim, discipline_clash,
                       place, place_clash, identity, identity_clash)


STATE_FIX = {
    'andaman  nicobar islands': 'Andaman and Nicobar Islands',
    'jammu  kashmir': 'Jammu and Kashmir',
    'dadra  nagar haveli': 'Dadra and Nagar Haveli',
    'orissa': 'Odisha', 'pondicherry': 'Puducherry', 'uttaranchal': 'Uttarakhand',
}


def clean_state(s):
    s = re.sub(r'\s+', ' ', (s or '').strip())
    return STATE_FIX.get(norm(s), s)


TYPE = {'Govt.': 'Government', 'Govt-Society': 'Government',
        'Trust': 'Private', 'Society': 'Private', 'Private': 'Private'}


def year(v):
    m = re.search(r'(19|20)\d{2}', str(v or ''))
    return int(m.group(0)) if m else None


def url(v):
    v = (v or '').strip()
    if not v or '.' not in v:
        return None
    if not v.startswith('http'):
        v = 'http://' + v
    return v if re.match(r'^https?://[\w.-]+\.\w', v) else None


# --- index NMC by fingerprint, then fall back to fuzzy ------------------------------
nmc_by_key = collections.defaultdict(list)
for n in nmc:
    nmc_by_key[key(n['collegeName'])].append(n)

matched, unmatched, ambiguous = [], [], []
used = set()



def eligible(c, n, fuzzy):
    """Hard vetoes. Any one of these makes the pair impossible regardless of name score."""
    if discipline_clash(c['name'], n['collegeName']):
        return False
    if place_clash(c['name'], n['collegeName'], c['city'] or '', n.get('city') or ''):
        return False
    # Only gate fuzzy pairs on identity: an exact fingerprint hit is already conclusive.
    if fuzzy and identity_clash(c['name'], n['collegeName']):
        return False
    return True


for c in base:
    cname, cstate, ccity = c['name'], clean_state(c['state']), (c['city'] or '').strip()

    # 0. course gate: the NMC UG registry is MBBS-only. A college that does not offer MBBS
    #    cannot be in it, so never let one match — that is how dental colleges were being
    #    handed MBBS seat counts. BDS/AYUSH get resolved from their own councils instead.
    if 'MBBS' not in c['coursesOffered']:
        unmatched.append({'name': cname, 'state': cstate, 'city': ccity,
                          'courses': c['coursesOffered'], '_why': 'not-an-MBBS-college'})
        continue

    # 1. exact fingerprint hit
    cands = [n for n in nmc_by_key.get(key(cname), []) if eligible(c, n, fuzzy=False)]
    score = 1.0

    # 2. fuzzy sweep, restricted to the same state when we know it (cuts false pairs hard:
    #    there are ~15 "Government Medical College"s and only the state tells them apart)
    if not cands:
        pool = [n for n in nmc if not cstate or clean_state(n['stateName']) == cstate] or nmc
        pool = [n for n in pool if eligible(c, n, fuzzy=True)]
        scored = sorted(((sim(cname, n['collegeName']), n) for n in pool),
                        key=lambda x: -x[0])
        if scored and scored[0][0] >= 0.72:
            top = scored[0][0]
            # a near-tie between two different colleges is a coin flip -> refuse to guess
            rivals = [n for s, n in scored[1:3] if top - s < 0.06]
            if rivals:
                ambiguous.append({'name': cname, 'state': cstate, 'city': ccity,
                                  'courses': c['coursesOffered'],
                                  'candidates': [scored[0][1]['collegeName']] +
                                                [r['collegeName'] for r in rivals]})
                continue
            cands, score = [scored[0][1]], top

    if not cands:
        unmatched.append({'name': cname, 'state': cstate, 'city': ccity,
                          'courses': c['coursesOffered']})
        continue

    # prefer a candidate that also corroborates on city, else on state
    n = next((x for x in cands if ccity and norm(x.get('city')) == norm(ccity)), None) \
        or next((x for x in cands if clean_state(x['stateName']) == cstate), None) \
        or cands[0]

    # a fuzzy name match that agrees on NEITHER city NOR state is not a match
    if score < 1.0 and clean_state(n['stateName']) != cstate and norm(n.get('city')) != norm(ccity):
        unmatched.append({'name': cname, 'state': cstate, 'city': ccity,
                          'courses': c['coursesOffered']})
        continue

    used.add(n['collegeId'])

    # `type` precedence: Deemed WINS over anything NMC says.
    #
    # NMC's `managementupdate` describes ownership (Govt./Trust/Society/Private) — it has no
    # "Deemed" value at all, so every deemed university reads as "Trust" there. Our base
    # derives Deemed from the counselling quota, which is the distinction the site actually
    # runs on (deemed seats are a separate counselling stream with their own fees). Letting
    # NMC win here downgraded 82 deemed universities to Private and broke that stream.
    nmc_type = TYPE.get(n.get('managementupdate'))
    ctype = nmc_type if c['type'] != 'Deemed' else 'Deemed'

    row = {
        'name': cname,                                   # OUR name — the merge joins on it
        'state': clean_state(n['stateName']) or cstate,
        'city': (n.get('city') or '').strip() or ccity,
        'type': ctype,
        'affiliation': (n.get('universityName') or '').strip() or None,
        'established': year(n.get('yearOfInc')),
        'totalSeats': n['ugApproved'] if isinstance(n.get('ugApproved'), int) else None,
        'website': url(n.get('website')),
        'source': 'https://www.nmc.org.in/MCIRest/open/getDataFromService?service=getAllUgColleges',
        '_score': round(score, 3),
        '_nmc': n['collegeName'],
    }
    matched.append({k: v for k, v in row.items() if v not in (None, '')})

# NMC colleges nobody in our base claimed = colleges missing from the site entirely.
new_colleges = [
    {
        'name': n['collegeName'].strip(),
        'state': clean_state(n['stateName']),
        'city': (n.get('city') or '').strip(),
        'type': TYPE.get(n.get('managementupdate')),
        'affiliation': (n.get('universityName') or '').strip() or None,
        'established': year(n.get('yearOfInc')),
        'totalSeats': n['ugApproved'] if isinstance(n.get('ugApproved'), int) else None,
        'website': url(n.get('website')),
        'coursesOffered': ['MBBS'],
        'source': 'nmc-ug-registry',
    }
    for n in nmc if n['collegeId'] not in used
]
new_colleges = [{k: v for k, v in r.items() if v not in (None, '')} for r in new_colleges]

# --- duplicate clusters ------------------------------------------------------------
# Two of OUR college records resolving to ONE NMC record means the source CSV spelled the
# same institution two ways ("Dr D Y Patil", "Dr DY Patil", "Padmashree Dr D Y Patil"...).
# Those are duplicate colleges on the site. They are NOT auto-merged here: merging picks a
# survivor, and every closingRank/fee row pointing at the losers has to be repointed at it,
# so a wrong call silently destroys rank data. Emitted for verification instead.
clusters = collections.defaultdict(list)
for m in matched:
    clusters[m['_nmc']].append(m['name'])
dupes = [{'nmcName': k, 'candidates': sorted(v)} for k, v in clusters.items() if len(v) > 1]
dupes.sort(key=lambda d: -len(d['candidates']))
json.dump(dupes, open(f'{RAW}/base_duplicates.json', 'w'), indent=1, ensure_ascii=False)

json.dump(matched,      open(f'{RAW}/enriched_nmc.json', 'w'),   indent=1, ensure_ascii=False)
json.dump(unmatched,    open(f'{RAW}/nmc_unmatched.json', 'w'),  indent=1, ensure_ascii=False)
json.dump(ambiguous,    open(f'{RAW}/nmc_ambiguous.json', 'w'),  indent=1, ensure_ascii=False)
json.dump(new_colleges, open(f'{RAW}/nmc_new_colleges.json', 'w'), indent=1, ensure_ascii=False)

print(f'base colleges        {len(base)}')
print(f'NMC registry (MBBS)  {len(nmc)}')
print()
print(f'  MATCHED            {len(matched)}   -> raw/enriched_nmc.json')
exact = sum(1 for m in matched if m['_score'] == 1.0)
print(f'    exact            {exact}')
print(f'    fuzzy            {len(matched) - exact}')
for f in ('type', 'affiliation', 'established', 'totalSeats', 'website', 'city'):
    print(f'      {f:<12} {sum(1 for m in matched if m.get(f)):>4}')
print()
print(f'  unmatched          {len(unmatched)}   -> raw/nmc_unmatched.json  (BDS/AYUSH/deemed + name drift)')
print(f'  ambiguous          {len(ambiguous)}   -> raw/nmc_ambiguous.json  (near-tie, refused to guess)')
print(f'  NMC-only (NEW)     {len(new_colleges)}   -> raw/nmc_new_colleges.json  (real colleges missing from the site)')
print(f'  DUPLICATE clusters {len(dupes)}   -> raw/base_duplicates.json  (same college, spelled 2+ ways)')
crs = collections.Counter(c for u in unmatched for c in u['courses'])
print(f'\n  unmatched by course: {dict(crs)}')
