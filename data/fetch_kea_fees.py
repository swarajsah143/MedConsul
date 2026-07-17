#!/usr/bin/env python3
"""
Karnataka MBBS/BDS fees, straight from the KEA's own college-wise fee notifications.

The Karnataka Examinations Authority publishes a per-college table (not one class-wide number
fanned out across colleges), so every figure here is attributable to a named institution:

    SL.NO | College Code | College Name + address | College Type | Govt (G) | Private (P) | OTHER(Q) | NRI(N)

Two things this deliberately does NOT do:

  * It does not translate KEA's quota letters into friendlier names. KEA's "OTHER (Q)" is not
    the same thing as a COMEDK seat and its "Private (P)" is not the same thing as a management
    seat, so the columns keep KEA's own labels. Asserting an equivalence the source does not
    make is how a student ends up planning around the wrong number.
  * It does not record a 0 as a fee. A 0 in this table means the seat type is not offered
    through KEA at that college at all — mostly the deemed universities (Kasturba/Manipal,
    Yenepoya, K.S. Hegde, JSS), whose non-government seats go through MCC's deemed counselling
    instead. Writing those down as "₹0" would advertise a free seat at a deemed university.

Caveat worth surfacing to students: both PDFs are titled PROVISIONAL and state the amount
"includes RGUHS / Other University Registration Fees" — so this is KEA's notified provisional
figure inclusive of university registration, not a pure tuition line, and KEA may revise it.

Output: raw/fees.kea.json
"""
import json
import os
import re
import urllib.request

import pdfplumber

D = os.path.dirname(os.path.abspath(__file__))
RAW, CACHE = f'{D}/raw', f'{D}/raw/kea_pdfs'
os.makedirs(CACHE, exist_ok=True)

PDFS = {
    'MBBS': 'https://cetonline.karnataka.gov.in/keawebentry456/ugneet2025/UGNEET_FEES_MED_MBBS_kannada.pdf',
    'BDS': 'https://cetonline.karnataka.gov.in/keawebentry456/ugneet2025/UGNEET_FEES_DEN_kannada.pdf',
}
# column index -> the quota it represents, in KEA's own words
QUOTA = {4: 'Government Quota (G)', 5: 'Private Quota (P)',
         6: 'Other Quota (Q)', 7: 'NRI Quota (N)'}


def get(course, url):
    path = f'{CACHE}/{course}.pdf'
    if not os.path.exists(path):
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=120) as r, open(path, 'wb') as f:
            f.write(r.read())
    return path


def rows_for(course, url):
    out = []
    with pdfplumber.open(get(course, url)) as pdf:
        for page in pdf.pages:
            for table in (page.extract_tables() or []):
                for cells in table:
                    if len(cells) < 8 or not (cells[0] or '').strip().isdigit():
                        continue                       # header / spacer
                    name = re.sub(r'\s+', ' ', (cells[2] or '')).strip()
                    if not name:
                        continue
                    for col, quota in QUOTA.items():
                        raw = re.sub(r'[^\d]', '', cells[col] or '')
                        if not raw:
                            continue
                        fee = int(raw)
                        if fee <= 0:                   # not offered through KEA — not free
                            continue
                        out.append({
                            'collegeName': name,
                            'course': course,
                            'category': 'General',     # KEA gives one fee per quota, no caste split
                            'quota': quota,
                            'tuitionFee': fee,
                            'source': url,
                        })
    return out


def main():
    rows = []
    for course, url in PDFS.items():
        got = rows_for(course, url)
        colleges = len({r['collegeName'] for r in got})
        print(f'  {course:<5} {colleges:>3} colleges  {len(got):>4} fee rows')
        rows.extend(got)

    # The source lists each college once; if a (college, course, quota) shows up twice with
    # two different numbers, the table was misread and one of them is wrong. Say so.
    seen = {}
    for r in rows:
        k = (r['collegeName'], r['course'], r['quota'])
        if k in seen and seen[k] != r['tuitionFee']:
            print(f'  ! conflicting fee for {k}: {seen[k]} vs {r["tuitionFee"]}')
        seen[k] = r['tuitionFee']

    json.dump(rows, open(f'{RAW}/fees.kea.json', 'w'), indent=1, ensure_ascii=False)
    print(f'\n  KEA Karnataka (2025-26) -> raw/fees.kea.json   {len(rows)} rows')


if __name__ == '__main__':
    main()
