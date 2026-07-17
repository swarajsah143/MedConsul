#!/usr/bin/env python3
"""
Merge the CSV-derived college base with the fetched enrichment into the final
colleges.json the importer consumes.

Precedence, highest first:
  1. resolved_states.json  — the targeted fix for the 39 colleges the source CSV left stateless
  2. enriched{0..5}.json   — per-shard fetched metadata
  3. colleges.base.json    — name/state/courses from the CSV, city parsed from the name

`type` and `state` are REQUIRED by the schema. Anything still missing one after the
merge cannot be imported, and is written to colleges.unresolved.json rather than being
given a made-up value.
"""
import json, os, glob, collections

D = os.path.dirname(os.path.abspath(__file__))
OUT, RAW = f'{D}/out', f'{D}/raw'

base = json.load(open(f'{OUT}/colleges.base.json'))

# Collect enrichment, later sources winning on a per-field basis.
enrich = collections.defaultdict(dict)
sources = {}
for f in sorted(glob.glob(f'{RAW}/enriched*.json')) + [f'{RAW}/resolved_states.json']:
    if not os.path.exists(f):
        continue
    try:
        rows = json.load(open(f))
    except json.JSONDecodeError as e:
        print(f'  ! {os.path.basename(f)} is not valid JSON ({e}) — skipped')
        continue
    for r in rows:
        n = r.get('name')
        if not n:
            continue
        for k, v in r.items():
            if k in ('name', 'source'):
                continue
            if v not in (None, '', []):          # never let a null overwrite a real value
                enrich[n][k] = v
        if r.get('source'):
            sources[n] = r['source']

VALID_TYPE = {'Government', 'Private', 'Deemed'}
final, unresolved = [], []

for c in base:
    e = enrich.get(c['name'], {})
    row = {
        'name':           c['name'],
        'state':          e.get('state') or c['state'].strip(),
        'city':           e.get('city') or c['city'],
        'type':           e.get('type') or c['type'],
        'coursesOffered': c['coursesOffered'],
    }
    for k in ('established', 'totalSeats', 'affiliation', 'website'):
        if e.get(k):
            row[k] = e[k]
    if sources.get(c['name']):
        row['sourceUrl'] = sources[c['name']]

    if row['type'] not in VALID_TYPE or not row['state'] or not row['city']:
        unresolved.append({**row, '_missing': [
            f for f in ('state', 'city', 'type')
            if not row.get(f) or (f == 'type' and row['type'] not in VALID_TYPE)
        ]})
    else:
        final.append(row)

# sourceUrl is not in the schema — strip it from what we import, keep it in an audit file.
audit = [dict(r) for r in final]
for r in final:
    r.pop('sourceUrl', None)

json.dump(final,      open(f'{OUT}/colleges.json', 'w'),            indent=1, ensure_ascii=False)
json.dump(audit,      open(f'{OUT}/colleges.sources.json', 'w'),    indent=1, ensure_ascii=False)
json.dump(unresolved, open(f'{OUT}/colleges.unresolved.json', 'w'), indent=1, ensure_ascii=False)

n = len(base)
print(f'  base            {n}')
print(f'  importable      {len(final)}   -> out/colleges.json')
print(f'  UNRESOLVED      {len(unresolved)}   -> out/colleges.unresolved.json (missing a required field; NOT imported)')
if unresolved:
    miss = collections.Counter(f for u in unresolved for f in u['_missing'])
    print(f'    missing:      {dict(miss)}')
print()
for f in ('type', 'established', 'totalSeats', 'affiliation', 'website'):
    have = sum(1 for c in final if c.get(f))
    print(f'  {f:<14}  {have:>4}/{len(final)}  ({have*100//max(len(final),1)}%)')
cited = sum(1 for a in audit if a.get('sourceUrl'))
print(f'  {"cited source":<14}  {cited:>4}/{len(final)}')
