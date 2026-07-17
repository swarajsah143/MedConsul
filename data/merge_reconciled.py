#!/usr/bin/env python3
"""
Fold the per-state reconciliation results into the final colleges.json + closingRanks.json.

This is the dangerous step, and the danger is the MERGES.

Our source CSV spells one real college several ways ("Dr D Y Patil", "Dr DY Patil",
"Padmashree Dr D Y Patil, Nerul"). Those are duplicate college records on the site. Merging
them means picking ONE survivor and deleting the others — but the losers own closing-rank
rows, and closingRanks references a college by foreign key. Delete a college without moving
its rank rows and those rows are orphaned; the importer drops them and a student silently
loses the cutoffs for a college they were looking at.

So a merge here is always TWO operations, never one:
  1. collapse the duplicate college records into the canonical one (keeping the dropped
     spellings in `aliases`, which is what that field is for)
  2. REPOINT every closingRank row that named a dropped spelling at the canonical name

Merging also has to be idempotent w.r.t. the naturalKey (collegeId, year, round, course,
category, quota): once two colleges become one, two of their rank rows can collide on that
key. We keep the more lenient (higher) closing rank, matching build_base.py's dedupe.

Precedence for college fields, highest first:
  1. reconciled/*.json enrichment  (agent-researched + adversarially verified, cited)
  2. enriched_nmc.json             (official NMC registry, matched deterministically)
  3. colleges.base.json            (CSV-derived; city parsed out of the display name)
...except `type: Deemed`, which always wins — see match_nmc.py for why.
"""
import json, os, glob, collections

D = os.path.dirname(os.path.abspath(__file__))
RAW, OUT = f'{D}/raw', f'{D}/out'

base = json.load(open(f'{OUT}/colleges.base.json'))
ranks = json.load(open(f'{OUT}/closingRanks.json'))

VALID_TYPE = {'Government', 'Private', 'Deemed'}
FIELDS = ('state', 'city', 'type', 'established', 'totalSeats', 'affiliation', 'website')

# ---- gather enrichment, lowest-precedence source first -----------------------------
enrich = collections.defaultdict(dict)
sources = {}


def absorb(rows):
    for r in rows:
        n = (r.get('name') or '').strip()
        if not n:
            continue
        for k in FIELDS:
            v = r.get(k)
            if v not in (None, '', []):
                enrich[n][k] = v
        if r.get('source'):
            sources[n] = r['source']


absorb(json.load(open(f'{RAW}/enriched_nmc.json')))

# States whose adversarial verifier never ran (the run hit the account usage limit).
# Their ENRICHMENT is still usable — a wrong field value is visible and fixable. Their
# MERGES are not: a merge deletes college records and repoints their closing-rank rows,
# and the verifiers that DID run rejected a Kerala merge that would have silently
# downgraded a Deemed college to Private. An unreviewed merge is not worth that risk,
# so we hold them back and re-run those states' verifiers instead.
UNVERIFIED = set(json.load(open(f'{RAW}/unverified_states.json'))) \
    if os.path.exists(f'{RAW}/unverified_states.json') else set()

merges, new_colleges, unresolved_notes = [], [], {}
held_back = 0
for f in sorted(glob.glob(f'{RAW}/reconciled/*.json')):
    slug = os.path.basename(f)[:-5]
    try:
        d = json.load(open(f))
    except json.JSONDecodeError as e:
        print(f'  ! {os.path.basename(f)}: bad JSON ({e}) — skipped')
        continue
    absorb(d.get('enrichment', []))
    if slug in UNVERIFIED:
        held_back += len(d.get('merges', []))
    else:
        merges += d.get('merges', [])
    new_colleges += d.get('newColleges', [])
    for u in d.get('unresolved', []):
        unresolved_notes[u.get('name', '')] = u.get('why', '')

# ---- build the alias -> canonical map ----------------------------------------------
base_names = {c['name'] for c in base}
alias_of, bad_merges = {}, []

for m in merges:
    canon = (m.get('canonical') or '').strip()
    aliases = [a.strip() for a in (m.get('aliases') or []) if a and a.strip() != canon]
    if not canon or not aliases:
        continue
    if canon not in base_names:
        bad_merges.append({**m, '_why': 'canonical is not one of our colleges'})
        continue
    for a in aliases:
        if a not in base_names:
            continue                       # alias we never had — nothing to merge
        if a in alias_of and alias_of[a] != canon:
            bad_merges.append({**m, '_why': f'"{a}" already merged into "{alias_of[a]}"'})
            continue
        if a == canon:
            continue
        alias_of[a] = canon

# A canonical that is itself someone else's alias would build a chain; flatten it.
for _ in range(3):
    alias_of = {a: alias_of.get(c, c) for a, c in alias_of.items()}
alias_of = {a: c for a, c in alias_of.items() if a != c}

# ---- collapse colleges --------------------------------------------------------------
aliases_by_canon = collections.defaultdict(list)
for a, c in alias_of.items():
    aliases_by_canon[c].append(a)

final, unresolved = [], []
kept_names = set()

for c in base:
    name = c['name']
    if name in alias_of:
        continue                            # merged away; its data moves to the canonical

    e = enrich.get(name, {})
    # Deemed always wins (NMC calls every deemed university a "Trust").
    ctype = 'Deemed' if c['type'] == 'Deemed' else (e.get('type') or c['type'])

    row = {
        'name': name,
        'state': (e.get('state') or c['state'] or '').strip(),
        'city': (e.get('city') or c['city'] or '').strip(),
        'type': ctype,
        'coursesOffered': c['coursesOffered'],
        'source': 'neet-csv+nmc',
    }
    for k in ('established', 'totalSeats', 'affiliation', 'website'):
        if e.get(k):
            row[k] = e[k]

    # merged-away spellings become searchable aliases, and courses union upward
    al = sorted(set(aliases_by_canon.get(name, [])))
    if al:
        row['aliases'] = al
        courses = set(row['coursesOffered'])
        for a in al:
            courses |= set(next((b['coursesOffered'] for b in base if b['name'] == a), []))
        row['coursesOffered'] = sorted(courses)

    missing = [f for f in ('state', 'city', 'type') if not row.get(f)]
    if row['type'] not in VALID_TYPE:
        missing.append('type')
    if missing:
        unresolved.append({**row, '_missing': sorted(set(missing)),
                           '_why': unresolved_notes.get(name, '')})
        continue

    kept_names.add(name)
    final.append(row)

# ---- colleges the site was missing entirely ----------------------------------------
added = 0
for n in new_colleges:
    name = (n.get('name') or '').strip()
    if not name or name in base_names or name in kept_names:
        continue
    if n.get('type') not in VALID_TYPE or not n.get('state') or not n.get('city'):
        unresolved.append({**n, '_missing': ['state/city/type'], '_why': 'new college, incomplete'})
        continue
    row = {k: v for k, v in n.items()
           if k in ('name', 'state', 'city', 'type', 'established', 'totalSeats',
                    'affiliation', 'website', 'coursesOffered') and v not in (None, '', [])}
    row.setdefault('coursesOffered', ['MBBS'])
    row['source'] = 'nmc-ug-registry'
    kept_names.add(name)
    final.append(row)
    added += 1

final.sort(key=lambda r: r['name'])

# ---- REPOINT the rank rows of every merged-away college -----------------------------
# Without this, merging silently deletes a college's cutoffs.
repointed = 0
for r in ranks:
    canon = alias_of.get(r['collegeName'])
    if canon:
        r['collegeName'] = canon
        repointed += 1

# collapsing can collide two rows on the naturalKey — keep the more lenient rank,
# exactly as build_base.py does.
seen, deduped, collided = {}, [], 0
for x in ranks:
    k = (x['collegeName'], x['year'], x['round'], x['course'], x['category'], x['quota'])
    if k in seen:
        seen[k]['closingRank'] = max(seen[k]['closingRank'], x['closingRank'])
        collided += 1
    else:
        seen[k] = x
        deduped.append(x)

orphans = collections.Counter(x['collegeName'] for x in deduped if x['collegeName'] not in kept_names)

json.dump(final, open(f'{OUT}/colleges.json', 'w'), indent=1, ensure_ascii=False)
json.dump(deduped, open(f'{OUT}/closingRanks.json', 'w'), indent=1, ensure_ascii=False)
json.dump(unresolved, open(f'{OUT}/colleges.unresolved.json', 'w'), indent=1, ensure_ascii=False)
if bad_merges:
    json.dump(bad_merges, open(f'{OUT}/merges.rejected.json', 'w'), indent=1, ensure_ascii=False)

print(f'  base                {len(base)}')
print(f'  merged away         {len(alias_of)}  ({len(aliases_by_canon)} clusters -> aliases)')
if held_back:
    print(f'  merges HELD BACK    {held_back}  (from {len(UNVERIFIED)} states whose verifier never ran)')
print(f'  new from NMC        {added}')
print(f'  IMPORTABLE          {len(final)}   -> out/colleges.json')
print(f'  unresolved          {len(unresolved)}   -> out/colleges.unresolved.json (NOT imported)')
if bad_merges:
    print(f'  merges rejected     {len(bad_merges)}   -> out/merges.rejected.json')
print()
print(f'  closingRanks        {len(deduped)}   ({repointed} repointed onto a canonical college, '
      f'{collided} collapsed on the natural key)')
if orphans:
    tot = sum(orphans.values())
    print(f'  ORPHAN rank rows    {tot} across {len(orphans)} colleges  <- these will be DROPPED on import')
    for n, k in orphans.most_common(5):
        print(f'      {k:>4}  {n}')
print()
for f in ('type', 'city', 'established', 'totalSeats', 'affiliation', 'website', 'aliases'):
    have = sum(1 for c in final if c.get(f))
    print(f'  {f:<14} {have:>4}/{len(final)}  ({have * 100 // max(len(final), 1)}%)')
