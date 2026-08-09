#!/usr/bin/env python3
"""
Parse MCC's published NEET-UG 2026 Round-1 Seat Matrix PDF into normalised rows.

Input : mcc-seatmatrix-2026.pdf              (298 pages, one wide landscape table)
Output: raw/seat_matrix.2026.json            normalised rows (written only with --write)
        raw/seat_matrix.2026.rejected.json   quarantined rows + why (written only with --write)

This is the *authoritative* count of how many seats exist per institute/quota/course/category
for Round 1. It is the denominator behind every closing-rank and predictor number, so a row
that is silently mis-attributed here corrupts what students plan around. The rule throughout
is therefore: quarantine, never guess. An unresolved row is recoverable; a wrongly-matched
one is not.

This script does NOT touch MongoDB and does NOT do college matching. Mapping instituteCode /
instituteName onto the `colleges` collection is a separate, reviewable step.


WHY GEOMETRY (pdfplumber) AND NOT `pdftotext -layout`
-----------------------------------------------------
Both approaches were built and their outputs compared row-for-row. They agree exactly on all
3493 rows, so this is not a correctness argument — it is a fragility argument. Measured on
this PDF:

  * The table is drawn with real ruling rects: 9 vertical separators at x =
    51.1 127.8 327.0 588.7 680.2 745.9 823.9 881.9 954.7 -- **byte-identical on all 298
    pages** (1 distinct signature over 298 pages) -- plus one horizontal rule per logical
    row. So row segmentation and column assignment are both *read off the page*, exactly,
    with zero heuristics.
  * The rules yield 3494 row bands = 3493 data rows + the PDF's own TOTAL footer.
  * Assigning each word to the column containing its horizontal centre leaves **0 unassigned
    words** and **0 words straddling a column boundary** anywhere in the table body.
  * The column header row reads ('StateName', 'InstituteType', 'Institute', 'Quota',
    'Branch', 'Category', 'TotalSeats', 'SeatGender') in identical cells on all 298 pages,
    which this script re-asserts rather than assumes.

The `pdftotext -layout` route has to *reconstruct* all of that from spacing, and every hazard
in the task brief is a symptom of exactly that:

  * per-page column offsets -- pdftotext re-derives column x-positions per page from the
    widest cell, so the 8 offsets drift page to page and must be relearned from each page's
    header line. Under geometry the offsets are constant and verifiable.
  * single-space column collisions -- e.g. page 53 renders
    `Delhi University Quota BDS (BDS)` with a *single* space between the Quota and Branch
    cells, so no amount of whitespace-splitting can separate them; the layout parser must
    recover the split by matching against a learned vocabulary of branch names. Under
    geometry the word 'BDS' starts at x=682.3, past the x=680.2 rule, and falls out for
    free.
  * wrapped cells -- a logical row spans 1..7 text lines with the columns vertically centred
    independently of one another, so the layout parser must infer each row's vertical extent
    by counting non-blank lines around an anchor and solving a constraint system. Under
    geometry a row is simply the band between two horizontal rules.
  * page furniture -- title + header must be located and skipped by string matching. Under
    geometry they are above the first body rule.

So: same answer today, far fewer ways to be wrong when MCC reflows the 2027 file. Geometry is
the only extraction path implemented here. `sm.txt`-style layout text is accepted only as an
explicit opt-in cross-check target, not as a source.


HAZARDS THIS PARSER HANDLES EXPLICITLY
--------------------------------------
PIN code before the institute code
    `Autonomous State Medical College Society Ghazipur, R.T.I. Ground, Ghazipur (U.P)
    (233001) (200556)` contains TWO bracketed 6-digit groups. 233001 is Ghazipur's postal
    PIN sitting inside the address; 200556 is the MCC institute code. The code is always the
    LAST bracketed 6-digit group and always terminates the cell -- verified: 3493/3493 rows
    end in `(\\d{6})`, and taking the last group yields 606 distinct codes (taking the first
    would wrongly yield 607). Only 4 rows / 1 institute are affected, which is precisely why
    this is worth pinning down instead of leaving to chance.

Quota strings clipped by the PDF itself
    Five quota values are *prefix-truncated in the source file* -- the renderer clips the
    cell to the row height and the remaining characters are not present in the PDF at all
    (confirmed at char level: no words are dropped by this parser, 0 unassigned). Example:
    the cell on page 53 contains literally `Delhi NCR Children/Widows of` and nothing more.
    Two of the five are ambiguous (they are a prefix of more than one longer value observed
    elsewhere), so they are NOT auto-expanded. Every affected row is emitted verbatim with
    `quotaTruncated: true` and `quotaCandidates: [...]`, and the run report lists them.
    Canonicalising these is a decision for the import step, with the evidence in hand.

B.Sc. Nursing is not in the repo's COURSES enum
    server/src/schema/collections.ts COURSES = MBBS BDS BAMS BHMS BUMS BSMS BNYS BVSc. The
    68 B.Sc. Nursing rows (368 seats) are real and are emitted with
    `courseInEnum: false` rather than dropped or coerced -- the same treatment
    parse_mcc_allotments.py gives them. Whoever imports decides.


RECONCILIATION (hard gate)
--------------------------
The PDF prints its own TOTAL footer: 31728. The script asserts

    sum(totalSeats over every emitted row) == TOTAL footer read from the PDF == 31728

and exits non-zero if that fails, or if any row is quarantined, or if any structural
invariant below is violated. Verified on this file:

    3493 rows | 606 institutes | 31728 seats
    MBBS 27292 | BDS 4068 | B.Sc. Nursing 368
    SeatGender: Both 3415, Female Only 78
    Category: {OP,BC,EW,SC,ST} x {NO,PH}, 10 combinations

Usage:
    python3 parse_mcc_seat_matrix.py [path/to/mcc-seatmatrix-2026.pdf]     # DRY RUN (default)
    python3 parse_mcc_seat_matrix.py ... --write                           # emit the JSON
    python3 parse_mcc_seat_matrix.py ... --report                          # full vocabularies
"""
import argparse
import collections
import json
import os
import re
import sys

try:
    import pdfplumber
except ImportError:
    sys.exit('pip install pdfplumber')

D = os.path.dirname(os.path.abspath(__file__))
RAW = f'{D}/raw'

DEFAULT_PDF = f'{RAW}/mcc-seatmatrix-2026.pdf'
OUT = f'{RAW}/seat_matrix.2026.json'
REJECTS = f'{RAW}/seat_matrix.2026.rejected.json'

# The PDF's own footer, and the shape of the 2026 Round-1 file. These are assertions, not
# configuration: if MCC republishes a corrected matrix these SHOULD fail loudly rather than
# let a changed file through under the old name. Override deliberately via --expect-*.
EXPECT_SEATS = 31728
EXPECT_ROWS = 3493
EXPECT_INSTITUTES = 606

HEADER = ('StateName', 'InstituteType', 'Institute', 'Quota',
          'Branch', 'Category', 'TotalSeats', 'SeatGender')
NCOL = len(HEADER)

# MCC's codes -> this repo's vocabulary (server/src/schema/collections.ts).
CATEGORY = {'OP': 'General', 'BC': 'OBC', 'EW': 'EWS', 'SC': 'SC', 'ST': 'ST'}
PWD = {'NO': False, 'PH': True}
COURSE = {'MBBS': 'MBBS', 'BDS': 'BDS', 'BSCN': 'B.Sc. Nursing'}
COURSES_ENUM = {'MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS', 'BVSc'}
SEAT_GENDER = {'Both', 'Female Only'}

CATEGORY_RE = re.compile(r'^(OP|BC|EW|SC|ST) (NO|PH)$')
BRANCH_RE = re.compile(r'^(.+?) \((MBBS|BDS|BSCN)\)$')
SEATS_RE = re.compile(r'^\d+$')
# The institute code: a bracketed 6-digit group that TERMINATES the cell. Anchoring to the
# end is what makes the Ghazipur PIN (233001) unambiguous -- see HAZARDS above.
CODE_RE = re.compile(r'\((\d{6})\)$')

# Ruling-rect geometry. A rect thinner than this in one axis is a rule, not a cell fill.
RULE_PX = 2.0
# Two rules closer than this are the same rule drawn twice (the PDF duplicates borders on
# most pages: page 1 has 9 vertical rects, every other page has 18).
DEDUPE_PX = 1.5
# Words whose baselines are within this are on the same visual line of a wrapped cell.
LINE_PX = 3.0
# A word must clear a column rule by this much to count as unambiguously inside a column.
EDGE_PX = 0.3


def _dedupe(vals, tol=DEDUPE_PX):
    out = []
    for v in sorted(vals):
        if not out or v - out[-1] > tol:
            out.append(v)
    return out


def _cell_text(words):
    """Reassemble a possibly multi-line (wrapped) cell in reading order."""
    lines = collections.defaultdict(list)
    for w in sorted(words, key=lambda w: (w['top'], w['x0'])):
        key = next((k for k in lines if abs(k - w['top']) <= LINE_PX), w['top'])
        lines[key].append(w)
    parts = []
    for key in sorted(lines):
        parts += [w['text'] for w in sorted(lines[key], key=lambda w: w['x0'])]
    return re.sub(r'\s+', ' ', ' '.join(parts)).strip()


def extract_cells(path):
    """Read the PDF's ruling rects and return one 8-tuple of cell strings per row band.

    Everything here is derived from the page and then asserted, so a reflowed 2027 file
    fails loudly instead of yielding plausible-looking garbage.
    """
    rows, footer = [], None
    with pdfplumber.open(path) as pdf:
        npages = len(pdf.pages)
        xsig = None
        for pno, page in enumerate(pdf.pages, 1):
            rects = page.rects
            vx = _dedupe(r['x0'] for r in rects if (r['x1'] - r['x0']) < RULE_PX)
            hy = _dedupe(r['top'] for r in rects if (r['bottom'] - r['top']) < RULE_PX)
            if len(vx) != NCOL + 1:
                sys.exit(f'page {pno}: expected {NCOL + 1} column rules, found {len(vx)}')
            sig = tuple(round(x, 1) for x in vx)
            if xsig is None:
                xsig = sig
            elif sig != xsig:
                # Not fatal by construction -- columns are re-read per page -- but on this
                # file the geometry is constant, and a change means the layout moved.
                sys.exit(f'page {pno}: column geometry changed {xsig} -> {sig}')

            words = page.extract_words()

            def column_of(w):
                xc = (w['x0'] + w['x1']) / 2
                for j in range(NCOL):
                    if vx[j] < xc < vx[j + 1]:
                        return j
                return None

            # The column-header row: locate it by its own text, not by a magic y, then treat
            # everything below the first rule under it as body. This is what skips the page
            # furniture (the repeated 'Seat Matrix for Round 1 ...' title sits above it).
            hdr = [w for w in words if w['text'] == 'StateName']
            if len(hdr) != 1:
                sys.exit(f'page {pno}: found {len(hdr)} StateName header cells, expected 1')
            hdr_bottom = hdr[0]['bottom']
            hcells = [[] for _ in range(NCOL)]
            for w in words:
                c = (w['top'] + w['bottom']) / 2
                if hdr[0]['top'] - LINE_PX < c < hdr_bottom + LINE_PX:
                    j = column_of(w)
                    if j is not None:
                        hcells[j].append(w)
            got = tuple(_cell_text(c) for c in hcells)
            if got != HEADER:
                sys.exit(f'page {pno}: header {got} != {HEADER}')

            bands = [y for y in hy if y > hdr_bottom]
            if len(bands) < 2:
                sys.exit(f'page {pno}: no body rows below the header')

            placed = [[[] for _ in range(NCOL)] for _ in range(len(bands) - 1)]
            for w in words:
                c = (w['top'] + w['bottom']) / 2
                if not (bands[0] < c < bands[-1]):
                    continue                     # title / header / below-table furniture
                j = column_of(w)
                if j is None:
                    sys.exit(f'page {pno}: word {w["text"]!r} falls on a column rule')
                if any(w['x0'] < x - EDGE_PX and w['x1'] > x + EDGE_PX for x in vx[1:-1]):
                    sys.exit(f'page {pno}: word {w["text"]!r} straddles a column rule')
                b = max(i for i in range(len(bands) - 1) if bands[i] < c)
                placed[b][j].append(w)

            for i, cells in enumerate(placed):
                vals = [_cell_text(c) for c in cells]
                if vals[0] == 'TOTAL':
                    if footer is not None:
                        sys.exit(f'page {pno}: a second TOTAL footer row')
                    footer = int(vals[6])
                    continue
                rows.append({'page': pno, 'top': round(bands[i], 2), 'vals': vals})

    if footer is None:
        sys.exit('no TOTAL footer row found -- cannot reconcile')
    return rows, footer, npages


def normalise(raw_rows):
    """Map raw cells onto the repo vocabulary. Anything unmappable is quarantined."""
    # The quota vocabulary is learned from the file itself so the truncation check needs no
    # hardcoded list: a value is clipped iff some OTHER observed value extends it.
    quota_vocab = {r['vals'][3] for r in raw_rows}
    extends = {q: sorted(x for x in quota_vocab if x != q and x.startswith(q + ' '))
               for q in quota_vocab}

    out, rejected = [], []
    for r in raw_rows:
        state, itype, inst, quota, branch, cat, seats, gender = r['vals']
        where = {'page': r['page'], 'top': r['top'], 'raw': r['vals']}

        def reject(why):
            rejected.append(dict(where, reason=why))

        m = CODE_RE.search(inst)
        if not m:
            reject('institute cell does not end in a 6-digit (code)')
            continue
        code = m.group(1)
        name = inst[:m.start()].strip().rstrip(',').strip()
        if not name:
            reject('institute name empty after stripping the code')
            continue

        mc = CATEGORY_RE.match(cat)
        if not mc:
            reject(f'unrecognised category {cat!r}')
            continue

        mb = BRANCH_RE.match(branch)
        if not mb:
            reject(f'unrecognised branch {branch!r}')
            continue

        if not SEATS_RE.match(seats) or int(seats) <= 0:
            reject(f'unrecognised TotalSeats {seats!r}')
            continue
        if gender not in SEAT_GENDER:
            reject(f'unrecognised SeatGender {gender!r}')
            continue
        if not state or not itype or not quota:
            reject('blank StateName / InstituteType / Quota')
            continue

        course = COURSE[mb.group(2)]
        rec = {
            'state': state,
            'instituteType': itype,
            'instituteName': name,
            'instituteCode': code,
            'quota': quota,
            'course': course,
            'category': CATEGORY[mc.group(1)],
            'pwd': PWD[mc.group(2)],
            'seatGender': gender,
            'totalSeats': int(seats),
            # --- provenance / caveats, for the import step to act on ---
            'sourcePage': r['page'],
            'courseInEnum': course in COURSES_ENUM,
        }
        if extends[quota]:
            rec['quotaTruncated'] = True
            rec['quotaCandidates'] = extends[quota]
        out.append(rec)
    return out, rejected


def report(rows, rejected, footer, npages, verbose):
    seats = sum(r['totalSeats'] for r in rows)
    codes = collections.defaultdict(set)
    for r in rows:
        codes[r['instituteCode']].add(r['instituteName'])

    print(f'pages                 {npages}')
    print(f'rows                  {len(rows)}')
    print(f'institutes (codes)    {len(codes)}')
    print(f'seats                 {seats}')
    print(f'PDF TOTAL footer      {footer}')
    print(f'quarantined rows      {len(rejected)}')

    def vocab(key, weight=None):
        c = collections.Counter()
        for r in rows:
            c[r[key]] += 1 if weight is None else r[weight]
        return c

    print('\n-- course (rows / seats)')
    cs = vocab('course', 'totalSeats')
    for k, v in vocab('course').most_common():
        flag = '' if k in COURSES_ENUM else '   <- NOT in COURSES enum'
        print(f'   {v:5d} rows {cs[k]:6d} seats  {k}{flag}')
    print('\n-- category x pwd (rows / seats)')
    cc = collections.Counter()
    ss = collections.Counter()
    for r in rows:
        k = (r['category'], r['pwd'])
        cc[k] += 1
        ss[k] += r['totalSeats']
    for k, v in cc.most_common():
        print(f'   {v:5d} rows {ss[k]:6d} seats  {k[0]}{" PwD" if k[1] else ""}')
    print('\n-- seatGender')
    for k, v in vocab('seatGender').most_common():
        print(f'   {v:5d} rows  {k}')
    print('\n-- instituteType')
    for k, v in vocab('instituteType').most_common():
        print(f'   {v:5d} rows  {k}')

    trunc = [r for r in rows if r.get('quotaTruncated')]
    if trunc:
        print(f'\n-- quota values CLIPPED BY THE PDF ({len(trunc)} rows) -- not auto-expanded')
        seen = {}
        for r in trunc:
            seen.setdefault(r['quota'], (0, r['quotaCandidates']))
            seen[r['quota']] = (seen[r['quota']][0] + 1, r['quotaCandidates'])
        for q, (n, cand) in sorted(seen.items()):
            amb = 'AMBIGUOUS' if len(cand) > 1 else 'unambiguous'
            print(f'   {n:5d} rows  {q!r}  [{amb}]')
            for c in cand:
                print(f'            -> {c!r}')

    if verbose:
        print('\n-- state')
        for k, v in vocab('state').most_common():
            print(f'   {v:5d} rows  {k}')
        print('\n-- quota (verbatim, as printed)')
        for k, v in vocab('quota').most_common():
            print(f'   {v:5d} rows  {k}')

    if rejected:
        print(f'\n-- QUARANTINED ({len(rejected)})')
        for r in rejected:
            print(f'   p{r["page"]} @{r["top"]}: {r["reason"]}')
            print(f'      {r["raw"]}')
    return seats


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[1])
    ap.add_argument('pdf', nargs='?', default=DEFAULT_PDF)
    ap.add_argument('--out', default=OUT)
    ap.add_argument('--write', action='store_true',
                    help='actually write the JSON (default is a dry run)')
    ap.add_argument('--report', action='store_true',
                    help='print the full state/quota vocabularies too')
    ap.add_argument('--expect-seats', type=int, default=EXPECT_SEATS)
    ap.add_argument('--expect-rows', type=int, default=EXPECT_ROWS)
    ap.add_argument('--expect-institutes', type=int, default=EXPECT_INSTITUTES)
    a = ap.parse_args()

    if not os.path.exists(a.pdf):
        sys.exit(f'missing {a.pdf} -- pass the path to mcc-seatmatrix-2026.pdf')

    raw_rows, footer, npages = extract_cells(a.pdf)
    rows, rejected = normalise(raw_rows)
    seats = report(rows, rejected, footer, npages, a.report)

    # ---- reconciliation gate -------------------------------------------------------
    codes = {r['instituteCode'] for r in rows}
    bad_code = collections.defaultdict(set)
    for r in rows:
        bad_code[r['instituteCode']].add(r['instituteName'])
    problems = []
    if seats != footer:
        problems.append(f'seat sum {seats} != PDF TOTAL footer {footer}')
    if seats != a.expect_seats:
        problems.append(f'seat sum {seats} != expected {a.expect_seats}')
    if len(rows) != a.expect_rows:
        problems.append(f'row count {len(rows)} != expected {a.expect_rows}')
    if len(codes) != a.expect_institutes:
        problems.append(f'institute count {len(codes)} != expected {a.expect_institutes}')
    for c, names in bad_code.items():
        if len(names) > 1:
            problems.append(f'institute code {c} maps to {len(names)} names: {sorted(names)}')
    if rejected:
        problems.append(f'{len(rejected)} rows quarantined')

    if problems:
        print('\nRECONCILIATION FAILED')
        for p in problems:
            print(f'  - {p}')
        if a.write:
            with open(REJECTS, 'w') as f:
                json.dump(rejected, f, indent=1)
            print(f'\nwrote {REJECTS} ({len(rejected)} rows)')
        return 1

    print(f'\nRECONCILED: {len(rows)} rows, {len(codes)} institutes, '
          f'{seats} seats == PDF TOTAL footer')
    if a.write:
        with open(a.out, 'w') as f:
            json.dump(rows, f, indent=1)
        print(f'wrote {a.out}')
        if os.path.exists(REJECTS):
            os.remove(REJECTS)
    else:
        print(f'DRY RUN -- nothing written. Re-run with --write to emit {a.out}')
        print('\nsample record:')
        print(json.dumps(rows[0], indent=1))
    return 0


if __name__ == '__main__':
    sys.exit(main())
