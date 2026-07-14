#!/usr/bin/env python3
"""
Merge every sourced fee file into the one input the reconciler reads.

Each `raw/fees.<source>.json` is produced by a different authority — Maharashtra's Fee
Regulating Authority, the state CET Cell, Karnataka's KEA, deemed universities' own fee
pages — and each row carries the URL it came from. This just concatenates them and refuses
to let two sources disagree silently about the same (college, course, category, quota).

Output: raw/fees.sourced.json
"""
import json
import glob
import os
import collections

D = os.path.dirname(os.path.abspath(__file__))
RAW = f'{D}/raw'

# these are pipeline artefacts, not sources
SKIP = {'fees.json', 'fees.sourced.json', 'fees.unresolved.json'}


def main():
    rows, per_file = [], {}
    for path in sorted(glob.glob(f'{RAW}/fees.*.json')):
        base = os.path.basename(path)
        if base in SKIP:
            continue
        data = json.load(open(path))
        per_file[base] = len(data)
        rows.extend(data)

    # The same college can legitimately appear in two sources (a state list and the college's
    # own page). If they give DIFFERENT fees for the same key, that is a real conflict and a
    # coin-flip would ship one of two numbers with no way to tell which. Keep the first and
    # report it rather than resolve it silently.
    seen, out, conflicts = {}, [], []
    for r in rows:
        k = (r['collegeName'].strip().lower(), r['course'], r['category'], r['quota'])
        if k in seen:
            if seen[k]['tuitionFee'] != r['tuitionFee']:
                conflicts.append((k, seen[k]['tuitionFee'], r['tuitionFee'],
                                  seen[k]['source'], r['source']))
            continue
        seen[k] = r
        out.append(r)

    json.dump(out, open(f'{RAW}/fees.sourced.json', 'w'), indent=1, ensure_ascii=False)

    print('\n  sourced fee files:')
    for f, n in per_file.items():
        print(f'    {n:>4}  {f}')
    print(f'\n  merged {len(out)} rows -> raw/fees.sourced.json  ({len(rows) - len(out)} duplicate keys)')
    if conflicts:
        print(f'\n  ! {len(conflicts)} CONFLICTING fees for the same college/course/quota — kept the first:')
        for (name, course, _, quota), a, b, sa, sb in conflicts[:8]:
            print(f'      {name[:38]:<40} {course} {quota}: {a:,} vs {b:,}')
    print(f'\n  by quota: {dict(collections.Counter(r["quota"] for r in out))}')


if __name__ == '__main__':
    main()
