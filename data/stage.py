#!/usr/bin/env python3
"""
Validate the fetched raw/*.json against the server's collection schemas and stage the
clean rows into out/.

The bulk endpoint rejects the ENTIRE batch on a single bad row, so a stray enum value or
a "12 March 2026" date would sink 5,000 good rows. This catches that here, drops only the
offending rows, and tells you exactly what it dropped.

It also strips `source` / `note` — fields the fetchers were told to carry for provenance,
which are not in the schema and would be rejected as unknown. Provenance is kept in a
parallel .sources.json file rather than thrown away.
"""
import json, os, re, sys, collections

D = os.path.dirname(os.path.abspath(__file__))
RAW, OUT = f'{D}/raw', f'{D}/out'

CATEGORIES = {'General', 'OBC', 'SC', 'ST', 'EWS', 'PwD'}
COURSES = {'MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS', 'BVSc'}
TYPES = {'Government', 'Private', 'Deemed'}
DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')

# collection -> (required fields, {field: validator})
RULES = {
    'fees': (
        ['collegeName', 'course', 'category', 'quota', 'tuitionFee'],
        {'course': lambda v: v in COURSES, 'category': lambda v: v in CATEGORIES,
         'tuitionFee': lambda v: isinstance(v, (int, float))},
    ),
    'announcements': (
        ['date', 'title', 'announcementType'],
        {'date': lambda v: isinstance(v, str) and bool(DATE.match(v))},
    ),
    'allotments': (
        ['counselling', 'round', 'instituteName', 'state', 'allIndiaRank', 'category', 'seatType', 'course'],
        {'category': lambda v: v in CATEGORIES, 'course': lambda v: v in COURSES,
         'seatType': lambda v: v in TYPES, 'allIndiaRank': lambda v: isinstance(v, int)},
    ),
    'checklistDocs': (
        ['name', 'section'],
        {'section': lambda v: v in {'online', 'physical'}},
    ),
    'stateDocs': (
        ['state', 'checklistType', 'documents'],
        {'checklistType': lambda v: v in {'Form Filling', 'Counselling', 'College Report', 'NRI Assistance'},
         'documents': lambda v: isinstance(v, list) and len(v) > 0},
    ),
    'counsellingQuotas': (['label', 'group', 'authority'], {}),
    'counsellingSections': (
        ['key', 'label'],
        {'key': lambda v: v in {'eligibility', 'application', 'domicile', 'counselling'}},
    ),
    'universities': (['name', 'state', 'type'], {}),
    'blogs': (['title', 'category'],
              {'category': lambda v: v in {'University', 'Research', 'Discovery', 'Admissions', 'Career'}}),
    'abroadUniversities': (['name', 'country'], {}),
    'knowledgeBase': (['title', 'content'], {}),
}

DROP = ('source', 'sourceUrl', 'note', 'year', '_note')  # provenance / stray keys not in the schemas


def stage(name):
    path = f'{RAW}/{name}.json'
    if not os.path.exists(path):
        return
    try:
        rows = json.load(open(path))
    except json.JSONDecodeError as e:
        print(f'  ✗ {name:<20} INVALID JSON: {e}')
        return
    if not isinstance(rows, list):
        print(f'  ✗ {name:<20} not a JSON array')
        return

    required, checks = RULES[name]
    clean, sources, dropped = [], [], collections.Counter()

    for r in rows:
        if not isinstance(r, dict):
            dropped['not-an-object'] += 1
            continue
        bad = next((f for f in required if r.get(f) in (None, '', [])), None)
        if bad:
            dropped[f'missing:{bad}'] += 1
            continue
        bad = next((f for f, ok in checks.items() if f in r and r[f] is not None and not ok(r[f])), None)
        if bad:
            dropped[f'invalid:{bad}={r.get(bad)!r}'] += 1
            continue
        if r.get('source'):
            sources.append({'ref': r.get('collegeName') or r.get('name') or r.get('title') or r.get('label'),
                            'source': r['source']})
        clean.append({k: v for k, v in r.items() if k not in DROP and v is not None})

    json.dump(clean, open(f'{OUT}/{name}.json', 'w'), indent=1, ensure_ascii=False)
    if sources:
        json.dump(sources, open(f'{OUT}/{name}.sources.json', 'w'), indent=1, ensure_ascii=False)

    cited = len(sources)
    flag = '✓' if not dropped else '!'
    print(f'  {flag} {name:<20} {len(clean):>5} clean / {len(rows):>5} fetched   ({cited} cited)')
    for reason, n in dropped.most_common(4):
        print(f'      dropped {n:>4}  {reason}')


for name in (sys.argv[1:] or RULES):
    stage(name)
