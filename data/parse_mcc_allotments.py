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

try:
    import pdfplumber
except ImportError:
    sys.exit('pip install pdfplumber')

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


def institute_name(cell):
    """The institute cell is 'Name, <long postal address>'. Keep the name."""
    s = re.sub(r'\s+', ' ', (cell or '')).strip()
    return s.split(',')[0].strip() if ',' in s else s


HEADERS = {'sno', 's no', 'rank', 'allotted quota', 'allotted institute', 'course'}


def parse_pdf(path, meta):
    rows, dropped = [], collections.Counter()
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                for r in table:
                    if not r or len(r) < 7:
                        continue
                    cells = [re.sub(r'\s+', ' ', (c or '')).strip() for c in r]
                    sno, rank, quota, inst, course, allot_cat, cand_cat = cells[:7]

                    if not re.fullmatch(r'\d+', sno or '') or not re.fullmatch(r'\d+', rank or ''):
                        continue                       # header / legend / spillover line
                    if norm(sno) in HEADERS:
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

                    state = find_state(inst)
                    if not state:
                        dropped['no-state-in-address'] += 1
                        continue

                    name = institute_name(inst)
                    if not name:
                        dropped['no-institute-name'] += 1
                        continue

                    row = {
                        'counselling': meta.get('counselling') or 'MCC UG',
                        'round': int(meta['round']),
                        'instituteName': name,
                        'collegeName': name,           # -> collegeId at import, if it resolves
                        'state': state,
                        'allIndiaRank': int(rank),
                        'category': cat,
                        'seatType': st,
                        'course': c,
                        'source': meta['url'],
                    }
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


if __name__ == '__main__':
    main()
