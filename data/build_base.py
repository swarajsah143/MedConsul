import csv, json, re, collections, os

SRC = '/Users/avin/projects/clients/neet/data'
OUT = '/Users/avin/projects/clients/MedConsul/data/out'
os.makedirs(OUT, exist_ok=True)

rows = list(csv.DictReader(open(f'{SRC}/neet_cutoffs.csv')))

# The source CSV leaves State blank on 189 rows across 39 colleges (GMERS, Eluru, Kadapa…).
# `state` is required on colleges, and quota is built from it ("<State> State Quota"), so a
# blank there produced a bogus " State Quota". Backfill from the fetched, cited resolution.
RESOLVED = '/Users/avin/projects/clients/MedConsul/data/raw/resolved_states.json'
fix = {}
if os.path.exists(RESOLVED):
    fix = {r['name']: r['state'] for r in json.load(open(RESOLVED)) if r.get('state')}
for r in rows:
    if not r['State'].strip():
        r['State'] = fix.get(r['College'], '').strip()

still_blank = sorted({r['College'] for r in rows if not r['State'].strip()})

# ---- mappings from CSV vocabulary -> MedConsul schema enums ----
CATEGORY = {'OPEN':'General','OBC':'OBC','SC':'SC','ST':'ST','EWS':'EWS'}
ROUND    = {'Round 1':1,'Round 2':2,'Round 3':3,'Stray':4}  # Stray Vacancy = round 4

def quota_of(r):
    q = r['Quota']
    if q == 'AIQ':    return 'All India Quota (AIQ)'
    if q == 'Deemed': return 'Deemed Quota'
    if q == 'State':  return f"{r['State']} State Quota"
    return q

def city_of(name):
    # 779/848 names end in ", City"; take the trailing segment, strip parentheticals
    if ',' in name:
        c = name.rsplit(',', 1)[1].strip()
    else:
        m = re.match(r'^(AIIMS|JIPMER)\s+(.+)$', name)
        c = m.group(2).strip() if m else ''
    c = re.sub(r'\s*\(.*?\)\s*', ' ', c).strip()
    return c

def type_of(name, quotas):
    l = name.lower()
    if 'Deemed' in quotas: return 'Deemed'
    if re.search(r'\bgovernment\b|\bgovt\b|aiims|jipmer|esic|armed forces|\bstate\b', l):
        return 'Government'
    return None  # unknown -> must come from a real source, not a guess

# ---- colleges ----
by_name = collections.defaultdict(lambda: {'states':set(),'quotas':set(),'courses':set()})
for r in rows:
    b = by_name[r['College']]
    b['states'].add(r['State']); b['quotas'].add(r['Quota']); b['courses'].add(r['Course'])

colleges = []
for name, b in sorted(by_name.items()):
    colleges.append({
        'name': name,
        'state': sorted(b['states'])[0],
        'city': city_of(name),
        'type': type_of(name, b['quotas']),
        'coursesOffered': sorted(b['courses']),
    })

# ---- closingRanks (collegeId resolved AFTER colleges are imported) ----
ranks, skipped = [], []
for r in rows:
    if r['Category'] not in CATEGORY or r['Round'] not in ROUND:
        skipped.append(r); continue
    ranks.append({
        'collegeName': r['College'],          # placeholder -> becomes collegeId
        'year': int(r['Year']),
        'round': ROUND[r['Round']],
        'course': r['Course'],
        'category': CATEGORY[r['Category']],
        'quota': quota_of(r),
        'closingRank': int(r['Closing Rank']),
    })

# dedupe on the schema's naturalKey (collegeId,year,round,course,category,quota)
seen, deduped = {}, []
for x in ranks:
    k = (x['collegeName'], x['year'], x['round'], x['course'], x['category'], x['quota'])
    if k in seen:
        seen[k]['closingRank'] = max(seen[k]['closingRank'], x['closingRank'])
    else:
        seen[k] = x; deduped.append(x)

# ---- rankBands ----
m2r = json.load(open(f'{SRC}/marks_to_rank.json'))
bands = [{'year':int(y),'marksMin':b['marksMin'],'marksMax':b['marksMax'],
          'rankMin':b['rankMin'],'rankMax':b['rankMax']}
         for y, bs in m2r['historicalMarksToRank'].items() for b in bs]

json.dump(colleges, open(f'{OUT}/colleges.base.json','w'), indent=1, ensure_ascii=False)
json.dump(deduped, open(f'{OUT}/closingRanks.json','w'), indent=1, ensure_ascii=False)
json.dump(bands,   open(f'{OUT}/rankBands.json','w'), indent=1, ensure_ascii=False)

print(f'colleges      {len(colleges)}')
print(f'  city known  {sum(1 for c in colleges if c["city"])}  missing {sum(1 for c in colleges if not c["city"])}')
print(f'  type known  {sum(1 for c in colleges if c["type"])}  MISSING {sum(1 for c in colleges if not c["type"])}  <- need real source')
print(f'closingRanks  {len(deduped)}  (from {len(rows)} rows; {len(rows)-len(ranks)} unmappable, {len(ranks)-len(deduped)} dupes merged)')
bad_quota = sum(1 for x in deduped if x['quota'].startswith(' '))
print(f'  blank-state quota rows: {bad_quota}  <- must be 0')
print(f'rankBands     {len(bands)}  years={sorted(m2r["historicalMarksToRank"])}')
if still_blank:
    print(f'\n  WARNING: {len(still_blank)} college(s) still have no state; their rows are unimportable:')
    for n in still_blank[:5]: print(f'    - {n}')
