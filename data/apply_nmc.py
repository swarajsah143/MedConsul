#!/usr/bin/env python3
"""
Fold the NMC metadata into out/colleges.json, additively.

This deliberately does NOT go through merge_colleges.py. That script rebuilds the college
list from colleges.base.json (the raw CSV projection, where `type` is null for most rows)
and layers the enriched*.json shards on top — and those shards no longer exist. Re-running
it today would therefore drop `type` for hundreds of colleges and regress the data we
already have. out/colleges.json is now the source of truth; this only adds to it.

Two rules, both of which exist to make the operation safe to re-run and impossible to
regress:

  1. Only ever FILL A BLANK. An existing non-null value is never overwritten. The 29
     original colleges carry hand-curated metadata; a bulk regulator import should not
     silently rewrite it.

  2. `type` is REPORTED, NEVER CHANGED. It is currently 100% populated. NMC publishes a
     `management` (Trust / Society / State Govt / Central Govt), which does not map cleanly
     onto our Government/Private/Deemed — deemed-university status in particular is not a
     management category at all. Mapping one to the other would corrupt a complete column
     to fix nothing. Disagreements are printed for a human to adjudicate.
"""
import json, os, collections

D = os.path.dirname(os.path.abspath(__file__))
COLLEGES = f'{D}/out/colleges.json'
ENRICH = f'{D}/raw/nmc_enrich.json'

FILLABLE = ('established', 'totalSeats', 'affiliation', 'website')

if not os.path.exists(ENRICH):
    raise SystemExit('  raw/nmc_enrich.json not found — run: python3 fetch_nmc.py --list --match')

colleges = json.load(open(COLLEGES))
enrich = {r['name']: r for r in json.load(open(ENRICH))}

before = {f: sum(1 for c in colleges if c.get(f)) for f in FILLABLE}
filled = collections.Counter()
kept = collections.Counter()
sources = []

for c in colleges:
    e = enrich.get(c['name'])
    if not e:
        continue
    for f in FILLABLE:
        if e.get(f) in (None, '', []):
            continue
        if c.get(f) in (None, '', []):
            c[f] = e[f]
            filled[f] += 1
        elif c[f] != e[f]:
            kept[f] += 1  # ours already had a value and it differs — rule 1: leave it
    if e.get('source'):
        sources.append({'name': c['name'], 'source': e['source']})

json.dump(colleges, open(COLLEGES, 'w'), indent=1, ensure_ascii=False)
json.dump(sources, open(f'{D}/out/colleges.nmc-sources.json', 'w'), indent=1, ensure_ascii=False)

n = len(colleges)
print(f'  colleges  {n}\n')
print(f'  {"field":<14}{"before":>8}{"filled":>8}{"after":>8}   coverage')
for f in FILLABLE:
    after = sum(1 for c in colleges if c.get(f))
    print(f'  {f:<14}{before[f]:>8}{filled[f]:>8}{after:>8}   {after * 100 // n}%')

if kept:
    print(f'\n  left alone (we already had a different value): {dict(kept)}')
print(f'\n  provenance -> out/colleges.nmc-sources.json')
print(f'  next: node import.mjs colleges     (upserts on name; safe to re-run)')
