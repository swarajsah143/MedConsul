#!/usr/bin/env python3
"""
Maharashtra GOVERNMENT medical/dental college fees, from the CET Cell's official notification.

Source: "FEE STRUCTURE FOR GOVERNMENT MEDICAL & DENTAL COLLEGES FOR THE ACADEMIC YEAR 2025-26
IN THE STATE OF MAHARASHTRA" (State CET Cell). Unlike the private colleges — where the Fee
Regulating Authority fixes a DIFFERENT number for each college — the state publishes ONE fee
structure that covers every government college. So attaching it to each government college in
Maharashtra is what the document says, not an inference.

Verbatim from the notification (Open category, male/female, income > ₹8 lakh):

    MBBS   Tuition 1,52,100   Library 1000  Development 5000  Admission 1500
           Library deposit 2000 (one time)  Gymkhana 500   TOTAL 1,62,100   Hostel 4,000/yr
    BDS    Tuition 1,14,400   Library 1000  Development 3000  Admission 1500
           Library deposit 2000 (one time)  Gymkhana 500   TOTAL 1,22,400   Hostel 4,000/yr

Only the OPEN-category row is emitted, deliberately. The notification also shows ₹0 tuition for
SC/ST, and for OBC/SEBC/EWS below the ₹8 lakh income line — but that zero is CONDITIONAL: it
applies only to Maharashtra-domiciled candidates who qualify for the MAHADBT scholarship scheme
(and for OPEN/EWS males under ₹8 lakh it is a 50% waiver, ₹76,050 — not zero). The fees schema
has nowhere to record "if you are domiciled here AND under this income line AND claim this
scholarship". Publishing a bare "SC: ₹0" would tell an out-of-state SC candidate that a seat is
free when it is not, so the waivers are left out and only the unconditional figure ships.

Output: raw/fees.mhgovt.json
"""
import json
import os

D = os.path.dirname(os.path.abspath(__file__))
RAW, OUT = f'{D}/raw', f'{D}/out'

SOURCE = ('https://statecetcell.s3.ap-south-1.amazonaws.com/Notifications_UG25/'
          'Fees+details_Govt+&+Pvt.+MBBS_BDS+college.pdf')

# course -> (annual tuition, total first year, hostel rent per year)
FEES = {
    'MBBS': (152100, 162100, 4000),
    'BDS': (114400, 122400, 4000),
}


def main():
    colleges = json.load(open(f'{OUT}/colleges.json'))
    rows = []
    for c in colleges:
        if c.get('state') != 'Maharashtra' or c.get('type') != 'Government':
            continue
        for course, (tuition, total, hostel) in FEES.items():
            if course not in (c.get('coursesOffered') or []):
                continue
            rows.append({
                'collegeName': c['name'],
                'course': course,
                'category': 'General',
                'quota': 'Maharashtra State Quota',
                'tuitionFee': tuition,
                'hostelFee': hostel,
                'totalFirstYear': total,
                'source': SOURCE,
            })

    json.dump(rows, open(f'{RAW}/fees.mhgovt.json', 'w'), indent=1, ensure_ascii=False)
    n_mbbs = sum(1 for r in rows if r['course'] == 'MBBS')
    n_bds = sum(1 for r in rows if r['course'] == 'BDS')
    print(f'\n  Maharashtra government (AY 2025-26) -> raw/fees.mhgovt.json')
    print(f'    {len(rows)} rows  ({n_mbbs} MBBS @ Rs 1,52,100  +  {n_bds} BDS @ Rs 1,14,400)')
    print(f'    Open category only — the SC/ST/OBC/EWS zeroes are scholarship-conditional.')


if __name__ == '__main__':
    main()
