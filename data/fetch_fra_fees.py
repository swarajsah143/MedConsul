#!/usr/bin/env python3
"""
Pull Maharashtra's FRA-approved MBBS/BDS tuition fees straight from the authority's portal.

Maharashtra's Fee Regulating Authority is the body that legally FIXES what a private medical
college may charge, so its own portal is the primary source — not a news article, and not an
SEO "fee structure" page (which is where wrong fee numbers come from).

The public page is ay25-26.mahafraportal.org/ssi_prp_24/outer.php?q=fee_search_report; it
renders the table via an XHR to get_report_ajax.php, which returns the numbers as raw HTML.
We hit that endpoint directly.

The table is RAGGED, and getting this wrong silently misquotes a college by lakhs:

    Sr | InstID | Name | District | Stream | Status | Date | Tuition | Devt | Total
       | ReviewStatus | ReviewDate | ReviewTuition | ReviewDevt | ReviewTotal

A college whose fee was later revised carries the second block — and for those rows the FIRST
Tuition cell is often 0 with the whole amount dumped in Development (K.J. Somaiya: 0 + 12,00,000),
the real split appearing only in the review columns (10,90,909 + 1,09,091 = the same 12,00,000).
Reading column 7 blindly would report a ₹10.9 lakh college as free. So: take the REVIEWED
tuition when a review exists, else the original.

Output: raw/fees.fra.json
"""
import json
import os
import re
import html
import urllib.request

D = os.path.dirname(os.path.abspath(__file__))
RAW = f'{D}/raw'

BASE = ('https://ay25-26.mahafraportal.org/ssi_prp_24/admin/reports/ajax/'
        'get_report_ajax.php?sub_type={course}&district=all&institute=&type=MEDIC')
PAGE = 'https://ay25-26.mahafraportal.org/ssi_prp_24/outer.php?q=fee_search_report'


def cells_of(row_html):
    return [html.unescape(re.sub('<[^>]+>', '', c)).strip()
            for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', row_html, re.S)]


def fetch(course):
    url = BASE.format(course=course)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=90) as r:
        body = r.read().decode('utf-8', 'replace')

    rows = []
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', body, re.S):
        c = cells_of(tr)
        if len(c) < 10 or not c[0].isdigit():
            continue                                    # header / spacer
        name, district, status = c[2], c[3], c[5]

        # Every figure printed after the "Date of Meeting" column. Three numbers means a single
        # approval (tuition, development, total). Six means it was reviewed, and the reviewed
        # tuition — nums[3] — is the one in force.
        nums = [int(x) for x in c[7:] if x.strip().isdigit()]
        if len(nums) >= 6:
            tuition, total = nums[3], nums[5]
        elif len(nums) >= 3:
            tuition, total = nums[0], nums[2]
        else:
            continue

        if tuition <= 0:                                # nothing usable; never guess one
            continue

        rows.append({
            'collegeName': name,
            'course': course,
            'category': 'General',
            # FRA fixes the fee for the seats it regulates (the CAP / state-quota and
            # institutional seats). NRI seats sit outside its remit, so this is the only
            # quota the source actually supports.
            'quota': 'Maharashtra State Quota',
            'tuitionFee': tuition,
            'totalFirstYear': total,
            '_district': district,
            '_status': status,
            'source': PAGE,
        })
    return rows


def main():
    rows = fetch('MBBS') + fetch('BDS')
    json.dump(rows, open(f'{RAW}/fees.fra.json', 'w'), indent=1, ensure_ascii=False)

    mbbs = [r for r in rows if r['course'] == 'MBBS']
    bds = [r for r in rows if r['course'] == 'BDS']
    print(f'\n  FRA Maharashtra (AY 2025-26)  -> raw/fees.fra.json')
    print(f'    MBBS {len(mbbs):>3} colleges   tuition '
          f'{min(r["tuitionFee"] for r in mbbs):,} - {max(r["tuitionFee"] for r in mbbs):,}')
    print(f'    BDS  {len(bds):>3} colleges   tuition '
          f'{min(r["tuitionFee"] for r in bds):,} - {max(r["tuitionFee"] for r in bds):,}')


if __name__ == '__main__':
    main()
