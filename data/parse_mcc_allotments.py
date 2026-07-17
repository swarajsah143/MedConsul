#!/usr/bin/env python3
"""
Parse MCC's published NEET-UG seat-allotment result PDFs into rows for the `allotments`
collection.

These are the real per-candidate allotment lists — the thing the schema comment means when
it says this collection "replaces the old seeded-PRNG generator, which fabricated these at
runtime". So every row here has to come out of the PDF; nothing is inferred.

Input : raw/mcc_allotment_pdfs.json   [{url, title, year, round, counselling, ...}]
Output: raw/allotments.json           rows matching the allotments schema
        raw/allotments.dropped.json   what we refused to import, and why

The PDF table is:
    SNo | Rank | Allotted Quota | Allotted Institute | Course | Alloted Category |
    Candidate Category | Remarks

Three things will sink the import if you get them wrong, and all three are enums the bulk
endpoint validates ALL-OR-NOTHING — one bad value rejects the entire batch of ~50,000 rows:

  course    MCC allots B.Sc. Nursing seats in the same file. B.Sc. Nursing is NOT in the
            COURSES enum, so those rows CANNOT be imported. They are dropped, not coerced.
  category  MCC writes "Open"; the enum wants "General". PwD is expressed as a suffix
            ("SC PwD"), and the schema has a flat PwD value + a free-text subcategory.
  seatType  Not in the PDF at all. It is derived from the quota, which is the only honest
            signal available: Deemed/Paid -> Deemed, Management/NRI -> Private, and the
            AIQ/central/ESIC/state-government streams -> Government.

`state` is likewise not a column — it is buried in the institute's address blob. We pull it
by matching against the real list of states/UTs rather than by splitting on commas, because
the addresses are free text and comma counts vary wildly.
"""
import json, os, re, sys, collections

from namematch import CollegeIndex

try:
    import pdfplumber
except ImportError:
    sys.exit('pip install pdfplumber')

# Institutes we could not confidently pin to a college, and how many rows each cost. These
# are reported, never silently swallowed — an unlinked institute means real allotment rows
# with no collegeId, which is exactly the thing worth seeing.
unlinked = collections.Counter()

D = os.path.dirname(os.path.abspath(__file__))
RAW = f'{D}/raw'
CACHE = f'{RAW}/mcc_pdfs'
os.makedirs(CACHE, exist_ok=True)

COURSES = {'MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS', 'BVSc'}
CATEGORIES = {'General', 'OBC', 'SC', 'ST', 'EWS', 'PwD'}

STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
    'Chandigarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi', 'Jammu and Kashmir',
    'Ladakh', 'Lakshadweep', 'Puducherry',
]
STATE_ALIAS = {
    'delhi (nct)': 'Delhi', 'new delhi': 'Delhi', 'nct of delhi': 'Delhi',
    'orissa': 'Odisha', 'pondicherry': 'Puducherry', 'uttaranchal': 'Uttarakhand',
    'jammu & kashmir': 'Jammu and Kashmir', 'a & n islands': 'Andaman and Nicobar Islands',
    'w.b': 'West Bengal', 'tamilnadu': 'Tamil Nadu',
}


def norm(s):
    return re.sub(r'[^a-z ]', ' ', (s or '').lower())


def find_state(addr):
    """Pull the state out of a free-text institute address."""
    low = ' ' + re.sub(r'\s+', ' ', (addr or '').lower()) + ' '
    for k, v in STATE_ALIAS.items():
        if k in low:
            return v
    # longest name first so "Andhra Pradesh" is not shadowed by a stray "Andhra"
    for st in sorted(STATES, key=len, reverse=True):
        if st.lower() in low:
            return st
    return None


def clean_course(v):
    v = re.sub(r'\s+', ' ', (v or '')).strip()
    u = v.upper().replace('.', '').replace(' ', '')
    for c in COURSES:
        if u == c.upper():
            return c
    if u.startswith('MBBS'):
        return 'MBBS'
    if u.startswith('BDS'):
        return 'BDS'
    return None          # B.Sc Nursing and friends -> not importable, drop the row


def clean_category(v):
    """'Open' -> General. 'SC PwD' -> PwD, keeping 'SC' as the subcategory."""
    v = re.sub(r'\s+', ' ', (v or '')).strip()
    if not v:
        return None, None
    pwd = bool(re.search(r'\bpwd\b|\bph\b', v, re.I))
    core = re.sub(r'\s*\b(pwd|ph)\b\s*', ' ', v, flags=re.I).strip()
    m = {'open': 'General', 'general': 'General', 'gn': 'General', 'ur': 'General',
         'ews': 'EWS', 'obc': 'OBC', 'obc-ncl': 'OBC', 'sc': 'SC', 'st': 'ST'}
    base = m.get(core.lower())
    if pwd:
        # the enum is flat: PwD is the category, the base category becomes the subcategory
        return 'PwD', (base or core or None)
    return base, None


DEEMED = re.compile(r'deemed|paid seat', re.I)
PRIVATE = re.compile(r'management|nri|non[- ]resident|minority', re.I)


def seat_type(quota):
    """Not a PDF column — derived from the quota, the only honest signal in the file."""
    q = re.sub(r'\s+', ' ', quota or '')
    if DEEMED.search(q):
        return 'Deemed'
    if PRIVATE.search(q):
        return 'Private'
    if not q:
        return None
    # AIQ, Open Seat, ESI, AMU/DU/BHU/central, Delhi NCR, IP, JIPMER, AFMS, state govt
    return 'Government'


# ---- resolve the institute against OUR college table --------------------------------
# The institute cell is "<Name>, <City>,<POSTAL ADDRESS>, <State>, <PIN>" in round-1 files
# and a bare "<Name>, <City>" in round-2/3 files:
#
#   AIIMS, New Delhi,AIIMS ANSARI NAGAR EAST AUROBINDO MARG NEW DELHI 110029, Delhi (NCT), 110029
#   AIIMS, Jodhpur,BASNI PHASE - II, JODHPUR-342005, Rajasthan, 342005
#   AIIMS, New Delhi
#
# This used to be `cell.split(',')[0]`, which keeps only "AIIMS" — welding all 20 AIIMS
# campuses into ONE institute (7,881 rows), every "Government Medical College, <city>" into
# one (6,601 rows), and collapsing 700+ colleges down to 456 distinct names. Every one of
# those rows then resolved to a single wrong collegeId, filing AIIMS Patna's ranks under
# AIIMS New Delhi. The city lives in the SECOND segment, so the name is matched against the
# real college table instead of being cut at a comma.
#
# When the cell genuinely does not say which college it means (a bare "AIIMS"), the match is
# declined: the row keeps its printed name and carries NO collegeId. A missing link is
# recoverable; a wrong one silently corrupts the cutoffs students rely on.
def load_colleges():
    path = f'{D}/out/colleges.json'
    return json.load(open(path)) if os.path.exists(path) else []


INDEX = CollegeIndex(load_colleges())


def header_map(cells):
    """Map the current round's columns by NAME, never by position.

    Round 1 files are 8 columns. Round 2/3 files are THIRTEEN: they print the candidate's
    PREVIOUS-round allotment beside the new one, under a spanning "Round 1 | Round 2" header:

      SNo Rank | Quota Institute Course Remarks          <- round 1 (already happened)
               | Quota Institute Course AllotedCat CandidateCat OptionNo Remarks   <- round 2 (current)

    Reading the first 7 columns therefore parses the WRONG ROUND and lands round 1's
    "Remarks" ("Reported"/"Not Reported") in the category field. So for the repeated
    columns we deliberately take the LAST occurrence — the current round — and we require
    a real header before trusting any row.
    """
    h = [norm(c).strip() for c in cells]
    if 'rank' not in h or not any('institute' in x for x in h):
        return None
    m = {'rank': h.index('rank')}
    # repeated groups -> last occurrence is the round this file is actually about
    for key, pat in (('quota', 'quota'), ('inst', 'institute'), ('course', 'course')):
        hits = [i for i, x in enumerate(h) if pat in x]
        if not hits:
            return None
        m[key] = hits[-1]
    # MCC's own typo: "Alloted Category". Match loosely, but never confuse it with
    # "candidate category" (which is the student's own category, not the seat's).
    cat = [i for i, x in enumerate(h) if 'categor' in x and 'candidate' not in x]
    cand = [i for i, x in enumerate(h) if 'candidate' in x and 'categor' in x]
    if not cat:
        return None
    m['cat'] = cat[-1]
    m['cand'] = cand[-1] if cand else None
    return m


def parse_pdf(path, meta):
    rows, dropped = [], collections.Counter()
    hdr = None                       # persists across pages; not every page reprints it
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                for r in table:
                    if not r or len(r) < 6:
                        continue
                    cells = [re.sub(r'\s+', ' ', (c or '')).strip() for c in r]

                    if header_map(cells):
                        continue                       # it's a header row, not data

                    # Anchor on CONTENT, not column position.
                    #
                    # pdfplumber does not return a stable column count across 20,000 pages:
                    # continuation pages merge and split cells, so any index cached from a
                    # header row eventually slides and starts reading the category column as
                    # the course ("course-not-in-enum: Open / GN / OBC"). The cell VALUES,
                    # though, are unambiguous — "MBBS" only ever appears in a course cell.
                    # So we find the course cell and read outward from it:
                    #
                    #     ... | quota | institute | COURSE | allotted-cat | candidate-cat | ...
                    #
                    # In a round-2/3 row the course appears twice (previous round, then this
                    # one). We take the LAST — that is the allotment this file is reporting.
                    ci = None
                    for i in range(len(cells) - 1, -1, -1):
                        if clean_course(cells[i]):
                            ci = i
                            break
                    if ci is None or ci < 2:
                        dropped['no-allotment-this-round'] += 1
                        continue

                    course = cells[ci]
                    inst = cells[ci - 1]
                    quota = cells[ci - 2]

                    # category = the first category-looking cell to the RIGHT of the course.
                    # (The previous-round group has no category column, only Remarks, so this
                    # can only ever pick up the current round's.)
                    #
                    # A row with NO category after the course is a candidate who kept his
                    # previous-round seat and took no new allotment ("Did not opt for
                    # Upgradation" — his whole round-2 group reads "-"). The only course cell
                    # left on that row is his ROUND-1 course, so importing it here would file
                    # a round-1 allotment under round 2. Drop it: his seat is already in the
                    # round-1 file.
                    cats = [c for c in cells[ci + 1:] if clean_category(c)[0]]
                    if not cats:
                        dropped['retained-previous-round-seat'] += 1
                        continue
                    allot_cat = cats[0]
                    cand_cat = cats[1] if len(cats) > 1 else ''

                    # rank = the first bare number on the row after SNo. MCC prints tie-broken
                    # ranks as "1.01", so allow a decimal.
                    nums = [c for c in cells[:ci] if re.fullmatch(r'\d+(\.\d+)?', c or '')]
                    rank = nums[1] if len(nums) > 1 else (nums[0] if nums else '')
                    if not rank:
                        continue                       # banner / spillover / blank line

                    if not inst or len(inst) < 8:
                        dropped['no-institute-name'] += 1
                        continue

                    c = clean_course(course)
                    if not c:
                        dropped[f'course-not-in-enum:{course[:22]}'] += 1
                        continue

                    cat, sub = clean_category(allot_cat)
                    if cat not in CATEGORIES:
                        dropped[f'category:{allot_cat[:22]}'] += 1
                        continue

                    st = seat_type(quota)
                    if st not in {'Government', 'Private', 'Deemed'}:
                        dropped[f'seatType:{quota[:22]}'] += 1
                        continue

                    # Address first (it is explicit), then the college we matched. Round-2/3
                    # cells carry no address at all, so the college table is the only source
                    # of a state for them.
                    addr_state = find_state(inst)
                    college, display = INDEX.resolve(inst, addr_state)

                    name = college['name'] if college else display
                    if not name:
                        dropped['no-institute-name'] += 1
                        continue

                    state = addr_state or (college['state'] if college else None)
                    if not state:
                        dropped['no-state'] += 1
                        continue
                    if not college:
                        unlinked[name] += 1

                    # The `allotments` schema has NO year field, and its naturalKey is
                    # (counselling, round, category, course, allIndiaRank, instituteName).
                    # Import two cycles without a year anywhere in that key and 2025's
                    # Round 1 silently OVERWRITES 2024's, row for row. The year has to live
                    # in `counselling` — which is also what /allotment/:counselling groups by,
                    # so "MCC UG 2025" is the natural value rather than a hack.
                    row = {
                        'counselling': f"MCC UG {meta['year']}" if meta.get('year')
                                       else (meta.get('counselling') or 'MCC UG'),
                        'round': int(meta['round']),
                        'instituteName': name,
                        'state': state,
                        # MCC writes tie-broken ranks as "1.01", "1.02" — same AIR, split by
                        # a tiebreaker. int() would throw; the AIR is the integer part.
                        'allIndiaRank': int(float(rank)),
                        'category': cat,
                        'seatType': st,
                        'course': c,
                        'source': meta['url'],
                    }
                    # Only a CONFIRMED match carries the FK. An unresolved institute keeps its
                    # printed name and no collegeName, so the importer leaves collegeId unset
                    # rather than guessing a college for it.
                    if college:
                        row['collegeName'] = college['name']
                    if sub:
                        row['subcategory'] = sub
                    elif cand_cat and cand_cat.lower() not in ('', '-'):
                        row['subcategory'] = cand_cat
                    rows.append(row)
    return rows, dropped


def main():
    idx_path = f'{RAW}/mcc_allotment_pdfs.json'
    if not os.path.exists(idx_path):
        sys.exit(f'missing {idx_path} — the URL-collection agent has not finished yet')
    index = json.load(open(idx_path))

    all_rows, all_dropped = [], collections.Counter()
    for meta in index:
        if not meta.get('url') or meta.get('round') is None:
            continue
        local = f"{CACHE}/{re.sub(r'[^A-Za-z0-9.]', '_', meta['url'].rsplit('/', 1)[-1])}"
        if not os.path.exists(local):
            rc = os.system(f"curl -sL -m 300 -A 'Mozilla/5.0' {meta['url']!r} -o {local!r}")
            if rc != 0 or not os.path.exists(local):
                print(f'  ! download failed: {meta["url"]}')
                continue
        try:
            rows, dropped = parse_pdf(local, meta)
        except Exception as e:
            print(f'  ! parse failed ({e}): {meta.get("title", meta["url"])[:50]}')
            continue
        all_rows += rows
        all_dropped += dropped
        print(f'  {meta.get("year", "?")} R{meta.get("round")} {str(meta.get("title", ""))[:44]:<46} '
              f'{len(rows):>6} rows  ({sum(dropped.values())} dropped)')

    # naturalKey: counselling, round, category, course, allIndiaRank, instituteName
    seen, deduped = set(), []
    for r in all_rows:
        k = (r['counselling'], r['round'], r['category'], r['course'],
             r['allIndiaRank'], r['instituteName'])
        if k in seen:
            all_dropped['duplicate-natural-key'] += 1
            continue
        seen.add(k)
        deduped.append(r)

    json.dump(deduped, open(f'{RAW}/allotments.json', 'w'), indent=1, ensure_ascii=False)
    json.dump(dict(all_dropped), open(f'{RAW}/allotments.dropped.json', 'w'), indent=1)

    print(f'\n  TOTAL importable   {len(deduped)}  -> raw/allotments.json')
    print(f'  dropped            {sum(all_dropped.values())}')
    for reason, n in all_dropped.most_common(8):
        print(f'      {n:>6}  {reason}')
    if deduped:
        print(f'\n  courses    {dict(collections.Counter(r["course"] for r in deduped))}')
        print(f'  categories {dict(collections.Counter(r["category"] for r in deduped))}')
        print(f'  seatTypes  {dict(collections.Counter(r["seatType"] for r in deduped))}')
        print(f'  rounds     {dict(collections.Counter(r["round"] for r in deduped))}')
        print(f'  states     {len({r["state"] for r in deduped})}')

        linked = sum(1 for r in deduped if r.get('collegeName'))
        institutes = {r['instituteName'] for r in deduped}
        print(f'\n  institutes {len(institutes)} distinct')
        print(f'  linked     {linked} rows -> a real collegeId '
              f'({len(deduped) - linked} rows keep their name but no FK)')
        if unlinked:
            print(f'  unlinked   {len(unlinked)} institutes could not be pinned to a college:')
            for nm, n in unlinked.most_common(10):
                print(f'      {n:>6}  {nm[:66]}')
            json.dump(unlinked.most_common(), open(f'{RAW}/allotments.unlinked.json', 'w'),
                      indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
