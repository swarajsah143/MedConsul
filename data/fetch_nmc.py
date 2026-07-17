#!/usr/bin/env python3
"""
Backfill college metadata from the NMC — the statutory regulator, so this is the
authoritative source rather than an inference.

Why this exists: the 5,853-row cutoff CSV gave us 806 colleges and their closing ranks,
but no `established`, `totalSeats`, `affiliation` or `website`. Those four fields are
populated for only the 29 colleges that predate the import (3%), so a college-detail page
for any of the other 777 renders almost empty.

These numbers are NOT guessable. An annual intake of 150 vs 250 seats is a fact a student
makes a decision on, and a plausible-looking hallucinated seat count is worse than an
honest blank. So nothing here infers a value — every field is either read off the NMC
response or left null.

The contract below is lifted from NMC's own DataTables init script
(/wp-content/themes/twentyfourteen/mci_js/ugcollegeList.js):

  LIST    GET  {BASE}/open/getDataFromService?service=getAllUgColleges
               -> {"ugCollege": [{collegeId, collegeName, stateName, universityName,
                                  managementupdate, yearOfInc, ugApproved, status, ...}]}
               The final element carries a `totalCount` summary rather than a college.

  DETAIL  POST {BASE}/open/getDataFromService?service=getAllUgCollegesDetails
               body {"collegeId": "<id>"}  -> a JSON *string* holding
               {website, address, city, email, yearOfInc, managementText, contacts[]}

The LIST call alone yields established + seats + affiliation for every college in ONE
request. Only `website` needs the per-college fan-out, which is why --details is separate,
rate-limited and resumable: it is ~780 requests against a government server that is not
robust, and it buys the least valuable field.

Usage:
    python3 fetch_nmc.py --list                # 1 request  -> raw/nmc_list.json
    python3 fetch_nmc.py --details [--limit N] # fan-out    -> raw/nmc_details.json
    python3 fetch_nmc.py --match               # offline    -> raw/nmc_enrich.json
"""
import argparse, collections, json, os, re, subprocess, sys, time

D = os.path.dirname(os.path.abspath(__file__))
RAW = f'{D}/raw'
BASE = 'https://www.nmc.org.in/MCIRest'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126.0 Safari/537.36')
REFERER = ('https://www.nmc.org.in/information-desk/for-students-to-study-in-india/'
           'list-of-college-teaching-mbbs/')


class Down(Exception):
    """NMC is unreachable or serving its maintenance page."""


def call(url, payload=None, timeout=60):
    """HTTP via curl, not urllib.

    nmc.org.in presents ONLY its leaf certificate and omits the intermediate, so the chain
    cannot be built from the leaf alone:

        $ openssl s_client -connect www.nmc.org.in:443
        0 s:CN=*.nmc.org.in
        Verify return code: 21 (unable to verify the first certificate)

    curl (via the macOS trust store) recovers by fetching the missing intermediate from the
    certificate's AIA extension; Python's OpenSSL does not do AIA fetching and fails with
    CERTIFICATE_VERIFY_FAILED — with or without certifi. The tempting fix is to pass
    verify=False, which would silently accept ANY certificate for a connection whose whole
    purpose is to read authoritative seat counts. Shelling out to curl keeps verification
    fully ON and fixes the server's misconfiguration on our side instead.
    """
    cmd = ['curl', '-sS', '--compressed', '--max-time', str(timeout),
           '-A', UA, '-H', f'Referer: {REFERER}',
           '-H', 'Accept: application/json, text/javascript, */*; q=0.01',
           '-w', '\n%{http_code}', url]
    if payload is not None:
        cmd[1:1] = ['-X', 'POST', '-H', 'Content-Type: application/json',
                    '-d', json.dumps(payload)]

    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise Down(f'curl failed: {p.stderr.strip()[:120]}')

    body, _, status = p.stdout.rpartition('\n')
    if status.strip() != '200':
        raise Down(f'HTTP {status.strip()}')

    try:
        out = json.loads(body)
    except json.JSONDecodeError:
        # Under maintenance NMC serves an HTML page with a 200 or a 502; either way it is
        # not JSON, and a JSONDecodeError here would look like a parser bug.
        raise Down('response was not JSON (maintenance page?)')
    # The detail service double-encodes: it returns a JSON string containing JSON.
    return json.loads(out) if isinstance(out, str) else out


# ── fetch ──────────────────────────────────────────────────────────────

def fetch_list():
    try:
        res = call(f'{BASE}/open/getDataFromService?service=getAllUgColleges')
    except Down as e:
        sys.exit(f'\n  NMC is unreachable ({e}) — their outage, not a bug here.\n'
                 f'  The endpoint is correct; re-run when it recovers.\n')
    rows = res.get('ugCollege') or []
    # The last row is a totals footer (carries totalCount, no collegeName), not a college.
    seats_total = rows[-1].get('totalCount') if rows else None
    rows = [r for r in rows if r.get('collegeName')]
    json.dump(rows, open(f'{RAW}/nmc_list.json', 'w'), indent=1, ensure_ascii=False)
    print(f'  list        {len(rows)} colleges  -> raw/nmc_list.json')
    if seats_total:
        print(f'  NMC-reported total MBBS seats: {seats_total}')
    return rows


def fetch_details(limit=None, delay=0.4):
    """Per-college POST for `website`. Resumable: re-running only fetches what is missing,
    so an interrupted run (or an NMC wobble mid-way) costs nothing to pick back up."""
    rows = json.load(open(f'{RAW}/nmc_list.json'))
    path = f'{RAW}/nmc_details.json'
    have = json.load(open(path)) if os.path.exists(path) else {}

    todo = [r for r in rows if str(r['collegeId']) not in have]
    if limit:
        todo = todo[:limit]
    print(f'  {len(have)} cached, {len(todo)} to fetch\n')

    ok = fail = consecutive = 0
    for i, r in enumerate(todo, 1):
        cid = str(r['collegeId'])
        try:
            d = call(f'{BASE}/open/getDataFromService?service=getAllUgCollegesDetails',
                     {'collegeId': cid})
            have[cid] = {k: d.get(k) for k in ('website', 'city', 'address', 'email',
                                               'yearOfInc', 'managementText')}
            ok += 1
            consecutive = 0
        except Down:
            fail += 1
            consecutive += 1
            # A handful of individual failures is normal; five in a row means NMC has gone
            # down mid-run. Stop hammering it — progress is saved and --details resumes.
            if consecutive >= 5:
                print(f'\n  NMC stopped responding ({consecutive} failures in a row).')
                print(f'  Saved {len(have)} fetched so far; re-run --details to resume.')
                break
        if i % 25 == 0 or i == len(todo):
            print(f'    {i}/{len(todo)}  ok={ok} fail={fail}')
            json.dump(have, open(path, 'w'), indent=1, ensure_ascii=False)
        time.sleep(delay)  # be a polite guest on a government server

    json.dump(have, open(path, 'w'), indent=1, ensure_ascii=False)
    print(f'\n  details     {len(have)} cached  -> raw/nmc_details.json')


# ── name matching ──────────────────────────────────────────────────────

def norm(s):
    """Collapse a college name to a comparable token string.

    Our names come from a counselling CSV ("ACPM Medical College, Dhule"); NMC's come from
    its register ("A.C.P.M. Medical College, Dhule"). What actually differs between the two
    is FORMATTING — dots inside initialisms, '&' vs 'and', commas, case — so only that is
    normalised away.

    Content words are deliberately KEPT, including "medical", "college" and "hospital". An
    earlier version stripped them as boilerplate, which was wrong in the exact cases that
    matter: it collapsed "Government Medical College & Hospital, Chandigarh (GMCH-32)" and
    "Government Medical College (GMC), Chandigarh" — two different institutions — onto the
    same key, and reduced "University College of Medical Sciences" to the empty string.

    The trailing " — NRI seats" / " — Management/Paid seats" tags are dropped: they are a
    QUOTA, not an institution. The source CSV encoded them into the college name, so our
    college list carries four rows for the one Dr D Y Patil, Kolhapur. All of them refer to
    the same NMC college and must resolve to the same seats.
    """
    s = s.lower()
    s = re.split(r'\s+[—–]\s+|\s+--\s+', s)[0]   # drop the quota tag
    s = s.replace('&', ' and ')
    s = re.sub(r'[^a-z0-9]+', ' ', s)            # dots, commas, hyphens, brackets -> space
    s = re.sub(r'\s+', ' ', s).strip()
    # Re-join split initialisms: "a c p m" -> "acpm", "d y patil" -> "dy patil". Without this,
    # NMC's dotted "A.C.P.M." and our "ACPM" tokenise completely differently.
    return re.sub(r'\b(?:[a-z] )+[a-z]\b', lambda m: m.group(0).replace(' ', ''), s)


def key(name):
    """The match key: the SET of normalized tokens, order-insensitive.

    Set equality, not string similarity, and not a "discriminating tokens" subset. Both of
    those were tried and both silently swapped colleges:

      - Edit distance is hopeless here because 139 of our colleges are literally named
        "Government Medical College, <city>". "…, Akola" and "…, Alibag" are 93% identical as
        strings, so any cutoff loose enough to absorb NMC's formatting quirks also swaps two
        real colleges. It mis-attributed 18 seat counts.

      - Dropping "boilerplate" words and matching on what remains is worse, because the
        boilerplate IS the distinction: strip government/medical/college and both
        "Tirunelveli Medical College" and "Government Medical College, Tirunelveli" collapse
        to {tirunelveli}. They are different colleges.

    A set (rather than the raw string) absorbs the differences that are genuinely cosmetic —
    word order, commas, "&" vs "and" — while treating every content word as load-bearing.
    Anything this cannot match is reported as unmatched, which is a visible blank; the
    alternative is a confident wrong number that nothing downstream can catch.
    """
    return frozenset(norm(name).split())


def match():
    ours = json.load(open(f'{D}/out/colleges.json'))
    nmc = json.load(open(f'{RAW}/nmc_list.json'))
    details = (json.load(open(f'{RAW}/nmc_details.json'))
               if os.path.exists(f'{RAW}/nmc_details.json') else {})

    # Index NMC by (token set, state). State-scoping is essential: "Government Medical
    # College" repeats across states, so a nationwide match would be a coin flip.
    idx = collections.defaultdict(list)
    for r in nmc:
        idx[(key(r['collegeName']), (r.get('stateName') or '').lower())].append(r)

    def to_int(v):
        try:
            return int(str(v).strip())
        except (TypeError, ValueError):
            return None

    out, unmatched, ambiguous, mbbs_total = [], [], [], 0
    for c in ours:
        if 'MBBS' not in c.get('coursesOffered', []):
            continue  # BDS-only: DCI's register, not NMC's. Not a miss.
        mbbs_total += 1
        st = (c.get('state') or '').lower()
        mine = key(c['name'])

        # Exact token-set agreement within the same state. Nothing looser — see key().
        #
        # Containment was also tried (allowing one side to carry extra tokens, since NMC
        # might write "…, Akola (Govt.)" where we write "…, Akola") and is unsound: subset is
        # not similarity. {surat} ⊆ {surat, municipal, institute}, so "Government Medical
        # College, Surat" cheerfully matched "Surat Municipal Institute of Medical Education".
        cands = idx.get((mine, st), []) if mine else []

        if len(cands) > 1:  # NMC itself lists two colleges we cannot tell apart
            ambiguous.append((c['name'], cands[0]['collegeName'], cands[1]['collegeName']))
            continue
        if not cands:
            unmatched.append(c['name'])
            continue

        hit = cands[0]
        d = details.get(str(hit['collegeId']), {})
        row = {'name': c['name'], 'source': f"NMC UG register (collegeId {hit['collegeId']})"}
        if to_int(hit.get('yearOfInc')):
            row['established'] = to_int(hit['yearOfInc'])
        if to_int(hit.get('ugApproved')):
            row['totalSeats'] = to_int(hit['ugApproved'])
        if hit.get('universityName'):
            row['affiliation'] = hit['universityName'].strip()
        if d.get('website'):
            w = d['website'].strip()
            row['website'] = w if w.startswith('http') else f'http://{w}'
        if len(row) > 2:
            out.append(row)

    json.dump(out, open(f'{RAW}/nmc_enrich.json', 'w'), indent=1, ensure_ascii=False)

    print(f'  MBBS colleges     {mbbs_total}')
    print(f'  matched to NMC    {len(out)}  ({len(out) * 100 // max(mbbs_total, 1)}%)')
    print(f'  unmatched         {len(unmatched)}')
    print(f'  AMBIGUOUS         {len(ambiguous)}   (skipped on purpose — see below)')
    for f in ('established', 'totalSeats', 'affiliation', 'website'):
        n = sum(1 for r in out if r.get(f))
        print(f'    {f:<12}    {n:>4}')
    if ambiguous:
        print('\n  ambiguous — two NMC candidates too close to call, so NOT matched:')
        for ours_n, a, b in ambiguous[:10]:
            print(f'    - {ours_n}\n        could be "{a}"  or  "{b}"')
    if unmatched:
        print('\n  first unmatched (need a manual look, NOT a guess):')
        for n in unmatched[:10]:
            print(f'    - {n}')
    print(f'\n  -> raw/nmc_enrich.json   (now run: python3 apply_nmc.py)')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--list', action='store_true')
    p.add_argument('--details', action='store_true')
    p.add_argument('--match', action='store_true')
    p.add_argument('--limit', type=int)
    a = p.parse_args()
    if a.list:
        fetch_list()
    if a.details:
        fetch_details(a.limit)
    if a.match:
        match()
    if not (a.list or a.details or a.match):
        p.print_help()
