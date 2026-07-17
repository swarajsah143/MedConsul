#!/usr/bin/env python3
"""
Split the college reconciliation work into one self-contained packet per state.

Each packet is everything an agent needs to reconcile ONE state and nothing else:
  unmatched  - our college records that found no NMC row (name drift, deemed, BDS, or
               genuinely absent from the 2023 registry)
  nmcPool    - NMC rows in that state that no college of ours claimed
  duplicates - clusters where several of our records resolve to one real college
  ambiguous  - near-ties the matcher refused to call

Pairing is mostly a local join against nmcPool (no web needed); only the leftovers need
research. Keeping each packet to one state means an agent never has to hold 848 colleges
in context to answer a question about 20.
"""
import json, os, collections

D = os.path.dirname(os.path.abspath(__file__))
RAW = f'{D}/raw'
PK = f'{RAW}/packets'
os.makedirs(PK, exist_ok=True)

unmatched = json.load(open(f'{RAW}/nmc_unmatched.json'))
new_cols = json.load(open(f'{RAW}/nmc_new_colleges.json'))
dupes = json.load(open(f'{RAW}/base_duplicates.json'))
ambig = json.load(open(f'{RAW}/nmc_ambiguous.json'))
stateless = {x['name'] for x in json.load(open(f'{RAW}/missing_state.json'))}

by_state = collections.defaultdict(lambda: {'unmatched': [], 'nmcPool': [],
                                            'duplicates': [], 'ambiguous': []})

for u in unmatched:
    by_state[u['state'] or 'UNKNOWN']['unmatched'].append({
        'name': u['name'], 'city': u.get('city', ''), 'courses': u['courses'],
        'statelessInSource': u['name'] in stateless,
    })
for n in new_cols:
    by_state[n['state'] or 'UNKNOWN']['nmcPool'].append(n)
for a in ambig:
    by_state[a['state'] or 'UNKNOWN']['ambiguous'].append(a)

# a dupe cluster belongs to whatever state its members are in
name_state = {u['name']: (u['state'] or 'UNKNOWN') for u in unmatched}
enr = {e['name']: e.get('state', 'UNKNOWN') for e in json.load(open(f'{RAW}/enriched_nmc.json'))}
for d in dupes:
    st = next((enr.get(c) or name_state.get(c) for c in d['candidates']
               if enr.get(c) or name_state.get(c)), 'UNKNOWN')
    by_state[st]['duplicates'].append(d)

index = []
for state, pkt in sorted(by_state.items()):
    n = len(pkt['unmatched']) + len(pkt['nmcPool']) + len(pkt['duplicates']) + len(pkt['ambiguous'])
    if not n:
        continue
    slug = state.lower().replace(' ', '-').replace('&', 'and')
    path = f'{PK}/{slug}.json'
    json.dump({'state': state, **pkt}, open(path, 'w'), indent=1, ensure_ascii=False)
    index.append({'state': state, 'slug': slug, 'path': path, 'items': n,
                  'unmatched': len(pkt['unmatched']), 'nmcPool': len(pkt['nmcPool']),
                  'duplicates': len(pkt['duplicates'])})

index.sort(key=lambda x: -x['items'])
json.dump(index, open(f'{PK}/index.json', 'w'), indent=1)
print(f'{len(index)} packets -> raw/packets/   ({sum(i["items"] for i in index)} items total)')
for i in index[:10]:
    print(f'  {i["state"]:<28} {i["items"]:>3} items  (unmatched {i["unmatched"]}, nmcPool {i["nmcPool"]}, dupes {i["duplicates"]})')
