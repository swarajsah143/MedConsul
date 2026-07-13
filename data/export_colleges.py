#!/usr/bin/env python3
"""
Export the enriched colleges back out of the database into out/colleges.json.

This exists because the enrichment — the `type` and the backfilled `state` for ~780 of
the 848 colleges — was produced by a one-off fetch fan-out whose per-shard outputs were
never committed. The result of that work survived only inside the local MongoDB, which
made a laptop wipe an unrecoverable data loss and made the pipeline non-reproducible:
re-running build_base.py + merge_colleges.py today would drop every college whose `type`
the fan-out had resolved, because the enriched*.json files it merges are gone.

Running this turns the database back into the missing merge artifact, so out/colleges.json
can be committed and import.mjs can rebuild any environment from git alone.
"""
import json, os, subprocess

D = os.path.dirname(os.path.abspath(__file__))
URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/medcounsel')

# Only the fields the colleges schema actually accepts; `id`/`_id` are minted per
# environment, so exporting them would pin prod's rows to this laptop's ObjectIds.
FIELDS = ['name', 'state', 'city', 'type', 'coursesOffered',
          'established', 'totalSeats', 'affiliation', 'website']

js = f'''
const out = db.colleges.find({{}}, {{_id: 0}}).sort({{name: 1}}).toArray();
print(JSON.stringify(out));
'''
raw = subprocess.run(['mongosh', URI, '--quiet', '--eval', js],
                     capture_output=True, text=True, check=True).stdout

rows = json.loads(raw[raw.index('['):raw.rindex(']') + 1])
clean = [{k: c[k] for k in FIELDS if c.get(k) not in (None, '', [])} for c in rows]

path = f'{D}/out/colleges.json'
json.dump(clean, open(path, 'w'), indent=1, ensure_ascii=False)

print(f'  exported      {len(clean)}  -> out/colleges.json')
for f in ('state', 'city', 'type', 'established', 'totalSeats', 'website'):
    n = sum(1 for c in clean if c.get(f))
    print(f'    {f:<13} {n:>4}/{len(clean)}  ({n * 100 // max(len(clean), 1)}%)')
