#!/usr/bin/env python3
"""
Shared college-name matching primitives.

Extracted from match_nmc.py so the allotment parser can reuse the SAME vetoes. Every rule
in here exists because a naive matcher got a real row wrong:

  discipline_clash  "dental" is the only token separating "Sri Ramachandra Dental College"
                    from "Sri Ramachandra Medical College". Stopword it and the pair scores
                    1.0, and MBBS seats get written onto a BDS college.
  place_clash       There are ~15 colleges literally called "Government Medical College".
                    The town is the whole identity, and token-set similarity throws it away
                    (one town token against four generic ones), so it is compared separately
                    and treated as a veto.
  identity_clash    ...but a shared town proves nothing on its own: "AIIMS Guwahati" and
                    "Gauhati Medical College, Guwahati" are in one city and are different
                    institutions. Only the identity tokens ({aiims} vs {gauhati}) separate
                    them, so those are compared with the town removed.
"""
import difflib
import functools
import re
import unicodedata

STOP = {
    'medical', 'college', 'institute', 'institution', 'sciences', 'science', 'of', 'and',
    'the', 'for', 'hospital', 'research', 'centre', 'center', 'university', 'school',
    'studies', 'health', 'foundation', 'trust', 'society', 'academy', 'a', 'in',
}
ABBR = {'govt': 'government', 'st': 'saint', 'dr': 'doctor', 'smt': 'shrimati'}

# Indian cities that were officially RENAMED. Two documents about the same college will each
# use whichever name was current when they were written — KEA's fee notification says Belgaum,
# our college table (from the NMC registry) says Belagavi — and no amount of fuzzy matching
# bridges "belgaum"/"belagavi" (0.66 similar) or "gulbarga"/"kalaburagi" (0.32). They are not
# spelling drift; they are different words for one place, so they need a lookup, not a
# threshold. Both sides normalise to one form, so which side wins does not matter.
CITY_ALIAS = {
    'bengaluru': 'bangalore', 'belagavi': 'belgaum', 'kalaburagi': 'gulbarga',
    'ballari': 'bellary', 'mysuru': 'mysore', 'mangaluru': 'mangalore',
    'shivamogga': 'shimoga', 'hubballi': 'hubli', 'tumakuru': 'tumkur',
    'vijayapura': 'bijapur', 'chikkamagaluru': 'chikmagalur', 'chamarajanagara': 'chamarajanagar',
    'kozhikode': 'calicut', 'thiruvananthapuram': 'trivandrum', 'puducherry': 'pondicherry',
    'vadodara': 'baroda', 'prayagraj': 'allahabad', 'varanasi': 'banaras',
    'kanpur': 'cawnpore', 'thrissur': 'trichur', 'kollam': 'quilon',
    'alappuzha': 'alleppey', 'kochi': 'cochin', 'ujjain': 'ujjaini',
}
ABBR = {**ABBR, **CITY_ALIAS}

# Disciplines that flip a college into a different institution entirely. If one name says one
# of these and the other does not, they are not the same college, however similar.
#
# These are CANONICAL LABELS, not spellings. The clash test compares the two sets, so every
# way a source writes a discipline has to land on ONE label or two spellings of the same
# discipline ("DENT.COLL" vs "Dental College") would read as a clash and refuse a correct
# match. The spellings are in _MARKER_EXACT / _MARKER_PREFIX below.
DISCIPLINE = {'dental', 'ayurveda', 'homeopathy', 'unani', 'siddha', 'naturopathy',
              'nursing', 'veterinary', 'physiotherapy'}

# Exact tokens. Anything here is matched WHOLE, never as a prefix.
#
# 'siddha' is the reason this table exists at all: six real medical colleges are named
# Siddhartha ("Sri Siddhartha Medical College, Tumkur", "Siddhartha Medical College,
# Vijayawada", "Autonomous State Medical College, Siddharthnagar"), and a prefix rule would
# read every one of them as a Siddha college and veto its own correct match.
#
# 'denta' is not a typo: MCC's PDFs break words across cell wraps, so the seat matrix really
# does contain "S.C.B. MEDICAL COLL(DENTA L)".
_MARKER_EXACT = {
    'dent': 'dental', 'denta': 'dental', 'dentl': 'dental', 'dc': 'dental',
    'siddha': 'siddha', 'siddhas': 'siddha',
    'unani': 'unani',
    'vety': 'veterinary',
    'physio': 'physiotherapy',
}

# Prefix tokens. A prefix rule is what catches the glued forms — norm() cannot split
# "DentalCollege", and "Governm ent DentalCo llege" (a real cell) tokenises to 'dentalco'.
# Each prefix below is a word no non-medical-discipline name starts with; the risky ones
# (siddha-, dent- on its own) are in _MARKER_EXACT instead.
_MARKER_PREFIX = (
    ('dental', 'dental'), ('dentis', 'dental'),
    ('ayurved', 'ayurveda'),
    ('homoeopath', 'homeopathy'), ('homeopath', 'homeopathy'),
    ('naturopath', 'naturopathy'),
    ('nursing', 'nursing'),
    ('veterinar', 'veterinary'),
    ('physiotherap', 'physiotherapy'),
)

# "DC" means Dental College in an institute name ("DC, RIMS, Imphal", "GOVT. DC & RESEARCH
# INSt., BELLARY", "TAMILNADU GOVT D.C. & HOSP", "M.G.D.C. & HOSPITAL, PUDUCHERRY", "GDC")
# and District Collector or a road name in a postal address. Two real MEDICAL colleges carry
# one:
#   "HASSAN INST. MEDICAL SCIENCES, HASSAN , K R PURAM, BEHIND DC OFFICE"
#   "Gmc, Bahraich, K.D.C Road Bahraich -271801"
# and name_region() cannot trim either address off (both are glued with a comma AND a space,
# not the comma-no-space the trim keys on). Reading those as dental would veto two links that
# are correct today, so a DC standing next to an address word is ignored. Every other DC in
# the corpus is a dental college.
_DC_ADDRESS_NEIGHBOUR = {
    'office', 'offices', 'behind', 'opp', 'opposite', 'near', 'beside', 'quarters',
    'bungalow', 'road', 'circle', 'gate', 'stand', 'colony', 'chowk', 'compound',
}

_CAMEL = re.compile(r'(?<=[a-z])(?=[A-Z])')


def _discipline_words(s):
    """Tokenise for discipline detection ONLY, keeping what norm() throws away.

    norm() deletes parentheticals before anything else can read them, which is how
    "S.C.B. MEDICAL COLL(DENTAL), CUTTACK" used to reach the matcher looking like a plain
    medical college and cross onto "SCB Medical College, Cuttack". Discipline is a veto, so
    it has to be read from the RAW string: parenthetical contents kept, camel-case split
    ("DentalCollege" -> "Dental College"), punctuation folded to spaces, and initials glued
    back the same way tokens() does it so "D.C." arrives as one token.
    """
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode()
    s = _CAMEL.sub(' ', s)
    s = re.sub(r'[^a-z0-9]+', ' ', s.lower())
    return _join_runs(s.split())


def _marker(w):
    if w in _MARKER_EXACT:
        return _MARKER_EXACT[w]
    for pre, label in _MARKER_PREFIX:
        if w.startswith(pre):
            return label
    return None


@functools.lru_cache(maxsize=100_000)
def disciplines(s):
    """The canonical set of disciplines a name claims.

    Cached: the fuzzy loop asks the same cell about all ~800 colleges in a row, and every
    college name is asked about once per cell.
    """
    words = _discipline_words(s)
    out = set()
    for i, (w, acronym) in enumerate(words):
        d = _marker(w)
        # A DOTTED acronym ending in DC is a dental college too — "M.G.D.C. & HOSPITAL,
        # PUDUCHERRY" is Mahatma Gandhi Dental College, and it is filing BDS allotments onto
        # Pondicherry Institute of MEDICAL Sciences today.
        #
        # Dotted only, and that restriction is load-bearing: -DC is also how Indian addresses
        # abbreviate a Development Corporation, and "Government Medical College & Hospital,
        # Baramati, Plot No P107 MIDC area ..." is a MEDICAL college sitting in an MIDC
        # (Maharashtra Industrial Development Corporation) estate. MIDC/GIDC are written as
        # one word; the dental ones are spelt out letter by letter.
        #
        # This lives here rather than in _marker() on purpose: it decides the veto only, and
        # must not reach identity(), where dropping 'mgdc' would leave that name with no
        # identity at all.
        if d is None and acronym and len(w) <= 5 and w.endswith('dc'):
            d = 'dental'
        if d is None:
            continue
        if d == 'dental' and w.endswith('dc') and (
                {x for x, _ in words[max(0, i - 1):i]} | {x for x, _ in words[i + 1:i + 2]}
        ) & _DC_ADDRESS_NEIGHBOUR:
            continue                      # District Collector / K.D.C Road, not Dental College
        out.add(d)
    return frozenset(out)                 # cached: hand back something a caller cannot mutate


def norm(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode()
    s = s.lower()
    s = re.sub(r'\(.*?\)', ' ', s)          # drop parentheticals
    s = re.sub(r'[^a-z0-9]+', ' ', s)       # punctuation -> space; kills "A.C.P.M." vs "ACPM"
    return s.strip()


def _join_runs(words):
    """_join_initials, but each token is tagged with whether it came from an initials run.

    Only the discipline scan needs the tag; see the DC rule in disciplines().
    """
    out, run = [], []
    for w in words:
        if len(w) == 1 and w.isalpha():
            run.append(w)
            continue
        if run:
            out.append((''.join(run), True) if len(run) > 1 else (run[0], False))
            run = []
        out.append((w, False))
    if run:
        out.append((''.join(run), True) if len(run) > 1 else (run[0], False))
    return out


def _join_initials(words):
    """Glue a run of single letters back into the acronym it was before normalisation.

    norm() turns punctuation into spaces, so "A.C.P.M." becomes "a c p m" while the other
    list spells the same college "ACPM" -> "acpm". Every one of those letters is then dropped
    for being too short, and the name collapses to just its city — at which point the identity
    veto (rightly) refuses to match on a bare town. That is why "A.C.P.M. MEDICAL COLLEGE,
    DHULE" would not meet "ACPM Medical College, Dhule", and the same for M.I.M.S.R., B.K.L.
    Walawalkar and Dr. N.Y. Tasgaonkar.
    """
    return [w for w, _ in _join_runs(words)]


def tokens(s):
    t = [ABBR.get(w, w) for w in _join_initials(norm(s).split())]
    return [w for w in t if w not in STOP and len(w) > 1]


def key(s):
    """Order-insensitive fingerprint: sorted significant tokens."""
    return ' '.join(sorted(tokens(s)))


def sim(a, b):
    ta, tb = set(tokens(a)), set(tokens(b))
    if not ta or not tb:
        return 0.0
    jac = len(ta & tb) / len(ta | tb)                              # token overlap
    seq = difflib.SequenceMatcher(None, key(a), key(b)).ratio()    # char-level, order-free
    return max(jac, seq)


def discipline_clash(a, b):
    return disciplines(a) != disciplines(b)


def place(s):
    """The city-ish tail of a display name — the part after the last comma."""
    s = re.sub(r'\s*[—-]\s*(nri|management|deemed).*$', '', s, flags=re.I)   # quota suffixes
    tail = s.rsplit(',', 1)[1] if ',' in s else ''
    return {w for w in norm(tail).split() if len(w) > 2 and w not in STOP}


def place_clash(a, b, acity, bcity):
    """True if the two names point at demonstrably different towns."""
    pa = place(a) | {w for w in norm(acity).split() if len(w) > 2}
    pb = place(b) | {w for w in norm(bcity).split() if len(w) > 2}
    if not pa or not pb:
        return False                      # one side is silent -> cannot contradict
    if pa & pb:
        return False                      # they share a town token -> agree
    # No shared token. Allow known spelling drift (bangalore/bengaluru), else it is a clash.
    return not any(difflib.SequenceMatcher(None, x, y).ratio() >= 0.8 for x in pa for y in pb)


def identity(s):
    """What's left of a name once the town is removed — the part that says WHICH college.

    DISCIPLINE words are stripped too. "dental" is load-bearing as a VETO (it is the only thing
    separating Sri Ramachandra's dental college from its medical one), but it says which FIELD
    a college is in, never WHICH college — every dental college has it. Leaving it in identity
    let it corroborate a match it should have had no vote in: "Y.M.T. Dental College, Navi
    Mumbai" (a private college absent from our table) matched "Government Dental College and
    Hospital, Mumbai" on the shared tokens {dental, mumbai}, and a private college's fees would
    have been filed under a government one. Strip it and the identities are {ymt} vs
    {government} — no overlap, correctly refused.

    Abbreviated spellings are stripped on the same grounds: 'dent' in "DR. R. AHMED DENT.COLL"
    says field, not identity, exactly as 'dental' does.
    """
    return ({t for t in tokens(s) if _marker(t) is None} - place(s)
            - {w for w in norm(s).split() if len(w) <= 2})


def identity_clash(a, b):
    ia, ib = identity(a), identity(b)
    if not ia and not ib:
        return False            # both are pure place names -> nothing to contradict
    if not ia or not ib:
        return True             # one side is generic ("Medical College, Tvm") -> can't corroborate
    if ia & ib:
        return False
    # No shared identity token. Allow spelling drift (bengaluru/bangalore), so demand a close pair.
    return not any(difflib.SequenceMatcher(None, x, y).ratio() >= 0.85 for x in ia for y in ib)


# ---- resolving a free-text institute cell against the real college table ------------
#
# MCC prints the institute as "<Name>, <City>,<POSTAL ADDRESS>, <State>, <PIN>" in round-1
# files and as a bare "<Name>, <City>" in round-2/3 files:
#
#   AIIMS, New Delhi,AIIMS ANSARI NAGAR EAST AUROBINDO MARG NEW DELHI 110029, Delhi (NCT), 110029
#   AIIMS, Jodhpur,BASNI PHASE - II, JODHPUR-342005, Rajasthan, 342005
#   AIIMS, New Delhi
#
# Splitting that on the FIRST comma yields "AIIMS" for all of them and silently welds 20
# separate AIIMS campuses into one institute — 7,881 allotment rows' worth. The city lives
# in the SECOND segment, so the name region has to run up to the address, not up to the
# first comma.

_ADDR = re.compile(r',(?=\S)')   # MCC glues the address on with a comma and NO space


def covers(tok, cell_toks):
    """Is this college token present in the cell, allowing for spelling drift?

    MCC and the NMC registry spell the same college differently far more often than they
    agree: "Deogarh"/"Deoghar", "Bengaluru"/"Bangalore", "Rajarajeswari"/"Raja Rajeswari".
    Exact set-intersection scores all of those 0 and leaves ~72,000 real allotment rows with
    no college. The drift threshold is the same 0.85 the identity veto already trusts, and it
    is applied per token, so a near-miss on one word cannot drag an unrelated college over
    the line by itself.
    """
    if tok in cell_toks:
        return True
    return any(difflib.SequenceMatcher(None, tok, c).ratio() >= 0.85 for c in cell_toks)


def coverage(ctoks, cell_toks):
    """What fraction of the COLLEGE's name the cell accounts for.

    Coverage, not Jaccard: the cell carries extra words (campus, university, abbreviations)
    that would unfairly dilute a symmetric overlap ratio.
    """
    return sum(1 for t in ctoks if covers(t, cell_toks)) / len(ctoks)


def name_region(cell):
    """The '<Name>, <City>' head of an institute cell, with the postal address removed.

    The address is welded on with a comma-and-no-space, while the name/city separator is a
    normal comma-and-space. That quirk is consistent across every MCC file we parse, but it
    is only used to TRIM — never to identify. Identification is done by matching against the
    real college table, so a formatting surprise costs us a match, not a wrong match.
    """
    s = re.sub(r'\s+', ' ', (cell or '')).strip()
    head = _ADDR.split(s)[0].strip().rstrip(',').strip()
    return head or s


class CollegeIndex:
    """Resolves an MCC institute cell onto a real row in out/colleges.json.

    Deliberately conservative: when two colleges are equally good candidates, it returns
    None rather than guessing. An unresolved allotment keeps its printed institute name and
    simply carries no collegeId — a missing link. A WRONG link would silently file AIIMS
    Patna's ranks under AIIMS New Delhi, which is far worse than a missing one.
    """

    def __init__(self, colleges):
        self.colleges = colleges
        self.by_key = {}
        for c in colleges:
            for variant in [c['name']] + list(c.get('aliases') or []):
                k = key(variant)
                if k:
                    self.by_key.setdefault(k, []).append(c)
        self._cache = {}

    def _candidates(self, state):
        if not state:
            return self.colleges
        return [c for c in self.colleges if c.get('state') == state] or self.colleges

    def resolve(self, cell, state=None):
        """-> (college | None, display_name). display_name is never truncated."""
        name = name_region(cell)
        ck = (name, state)
        if ck in self._cache:
            return self._cache[ck]

        result = (None, name)

        # 1. exact fingerprint. Conclusive on its own, but still veto a discipline flip so an
        #    exact-looking dental/medical pair can never slip through.
        hits = [c for c in self.by_key.get(key(name), []) if not discipline_clash(name, c['name'])]
        if state:
            narrowed = [c for c in hits if c.get('state') == state]
            hits = narrowed or hits
        if len(hits) == 1:
            result = (hits[0], name)

        # 2. fuzzy. Score by how much of the COLLEGE's name the cell covers, not by Jaccard:
        #    the cell carries extra words (city, campus) that would unfairly dilute an overlap
        #    ratio. Every veto from the NMC match applies here too.
        #
        #    Score against the WHOLE cell, address and all — not the trimmed name. Sources do
        #    not agree on where the town goes: MCC prints "<Name>, <City>,<address>" (town in
        #    the second segment, kept by the trim) but KEA prints "<Name>,<address>,<CITY>"
        #    (town at the very end, thrown away by it). Trimming first left "GOVERNMENT DENTAL
        #    COLLEGE" with no town at all and nothing to tell Bangalore's from Bellary's. Extra
        #    address words cannot inflate the score — coverage only asks how much of the
        #    COLLEGE's name the cell accounts for — and identity_clash still reads the trimmed
        #    name, so a street name cannot masquerade as a college's identity.
        elif not hits:
            cell_toks = set(tokens(cell))
            best, runner = None, 0.0
            for c in self._candidates(state):
                cname = c['name']
                if discipline_clash(name, cname):
                    continue
                # NB: place_clash() is deliberately NOT applied here. It reads the town off
                # the text after the LAST comma, and an MCC cell's last segment is often an
                # alias ("...Safdarjung Hospital New Delhi, VMMC"), so it vetoes perfect
                # matches. The town is enforced by the score instead: the city is a token of
                # the college's own name, so "AIIMS, Patna" covers {aiims,patna} fully but
                # covers {aiims,new,delhi} only 1-in-3 and never clears the threshold.
                if identity_clash(name, cname):
                    continue
                ctoks = set(tokens(cname))
                if not ctoks:
                    continue
                score = coverage(ctoks, cell_toks)
                if best is None or score > best[0]:
                    best, runner = (score, c), (best[0] if best else 0.0)
                elif score > runner:
                    runner = score
            # Demand a strong match AND a clear winner. Two colleges tied at the same score
            # means the cell genuinely does not say which one — so we decline to choose.
            if best and best[0] >= 0.6 and best[0] - runner >= 0.15:
                result = (best[1], name)

        self._cache[ck] = result
        return result


# ---- self-test: python3 namematch.py --selftest -------------------------------------
#
# Every case below is a real string from the corpus this matcher runs on (MCC allotment
# PDFs, the KEA/state seat matrices, out/colleges.json), not an invented one. The file has
# no test framework and no fixtures on purpose: the discipline veto is the difference
# between MBBS ranks and BDS ranks landing on the same college page, so the check has to be
# runnable anywhere the pipeline is, with nothing installed and no data on disk.
#
# The MUST-KEEP-WORKING half of the table matters as much as the bug half. The three
# crossings were fixed by widening what counts as a discipline marker, and widening a VETO
# is exactly how you lose links that are correct today.

_SELFTEST_COLLEGES = [
    {'name': 'SCB Medical College, Cuttack', 'state': 'Odisha'},
    {'name': 'North Bengal Medical College, Darjeeling', 'state': 'West Bengal'},
    {'name': 'Sri Siddhartha Medical College, Tumkur', 'state': 'Karnataka'},
    {'name': 'Siddhartha Medical College, Vijayawada', 'state': 'Andhra Pradesh'},
    {'name': 'ESIC Dental College, Gulbarga', 'state': 'Karnataka'},
    {'name': 'ESIC Medical College, Gulbarga', 'state': 'Karnataka'},
    {'name': 'Tamil Nadu Government Dental College and Hospital, Chennai', 'state': 'Tamil Nadu'},
    {'name': 'Hassan Institute of Medical Sciences, Hassan', 'state': 'Karnataka'},
    {'name': 'ACPM Medical College, Dhule', 'state': 'Maharashtra'},
    {'name': 'AIIMS New Delhi', 'state': 'Delhi'},
    {'name': 'AIIMS Patna', 'state': 'Bihar'},
    {'name': 'AIIMS Guwahati', 'state': 'Assam'},
    {'name': 'Gauhati Medical College, Guwahati', 'state': 'Assam'},
    {'name': 'Bangalore Medical College and Research Institute (BMCRI)', 'state': 'Karnataka'},
    {'name': 'Government Dental College and Research Institute, Bangalore', 'state': 'Karnataka'},
    {'name': 'Burdwan Dental College & Hospital, Burdwan', 'state': 'West Bengal'},
    {'name': 'Government Medical College, Baramati', 'state': 'Maharashtra'},
]

# (cell, expected college name or None, why)
_SELFTEST_RESOLVE = [
    # --- the bug: abbreviated / parenthetical / glued DENTAL used to be invisible, so a
    #     dental institute crossed onto its medical namesake. All three are real cells.
    ('S.C.B. MEDICAL COLL(DENTAL), CUTTACK', None,
     'parenthetical DENTAL: norm() deleted it before the veto could read it'),
    ('S.C.B. MEDICAL COLL(DENTA L)', None,
     'same, with MCC-PDF wrap breaking DENTAL into "DENTA L"'),
    ('NORTH BENGAL DENT.COLL', None,
     'DENT.COLL is dental; must not cross onto North Bengal MEDICAL College'),
    ('Sri Siddhartha DentalCollege, Tumkur', None,
     'glued DentalCollege; must not cross onto Sri Siddhartha MEDICAL College'),
    # --- control that was already correct, and must stay correct
    ('SCB Dental College', None, 'spelt-out dental vs medical: declined before the fix too'),
    ('ESIC Dental College, Gulbarga', 'ESIC Dental College, Gulbarga',
     'the dental one still resolves to the DENTAL college, not the medical one in the same town'),
    ('ESIC Medical College, Gulbarga', 'ESIC Medical College, Gulbarga',
     'and the medical one to the medical college'),
    # --- must keep working: ordinary medical-to-medical
    ('AIIMS, New Delhi,AIIMS ANSARI NAGAR EAST AUROBINDO MARG NEW DELHI 110029, Delhi (NCT), 110029',
     'AIIMS New Delhi', 'MCC round-1 cell with the address glued on'),
    ('AIIMS, Patna', 'AIIMS Patna', 'bare round-2 cell; must not collapse into another AIIMS'),
    ('A.C.P.M. MEDICAL COLLEGE, DHULE', 'ACPM Medical College, Dhule',
     'initials glued back into the acronym'),
    ('Bangalore Medical College and Research Institute', 'Bangalore Medical College and Research Institute (BMCRI)',
     'parenthetical acronym on the college side'),
    ('Gauhati Medical College, Guwahati', 'Gauhati Medical College, Guwahati',
     'shares a town with AIIMS Guwahati; identity keeps them apart'),
    ('HASSAN INST. MEDICAL SCIENCES, HASSAN , K R PURAM, BEHIND DC OFFICE', None,
     'unresolved before AND after: its identity is nothing but its own town, so identity_clash '
     'refuses it whatever the discipline says. The DC-in-an-address guard is asserted on '
     'discipline_clash above, where it is the thing being tested'),
    ('Siddhartha Medical College, Vijayawada', 'Siddhartha Medical College, Vijayawada',
     'Siddhartha is a name, not the Siddha discipline'),
    # --- must keep working: dental-to-dental (the veto has to agree with itself)
    ('TAMILN ADU GOVT D.C. & HOSP, CHENNA I', 'Tamil Nadu Government Dental College and Hospital, Chennai',
     'D.C. is Dental College; it must reach the DENTAL college, not be vetoed off it. '
     '(Real cell, PDF wrap and all - 10 allotment rows.)'),
    ('Burdwan Dental College & Hospital, Burdwan', 'Burdwan Dental College & Hospital, Burdwan',
     'plain dental-to-dental'),
    ('GOVT. DC & RESEARCH INSt., BANGALORE', 'Government Dental College and Research Institute, Bangalore',
     'abbreviated dental college matching its spelt-out self'),
    ('Government Medical College & Hospital, Baramati, Plot No P107 MIDC area Opposite Women '
     'Hospital Baramati Taluka Baramati District Pune', 'Government Medical College, Baramati',
     'a real 2026 seat-matrix cell: MIDC in the address must not veto a medical college'),
]

# (a, b, must_clash, why)
_SELFTEST_CLASH = [
    ('S.C.B. MEDICAL COLL(DENTAL), CUTTACK', 'SCB Medical College, Cuttack', True, 'bug 1'),
    ('NORTH BENGAL DENT.COLL', 'North Bengal Medical College', True, 'bug 2'),
    ('Sri Siddhartha DentalCollege, Tumkur', 'Sri Siddhartha Medical College, Tumkur', True, 'bug 3'),
    ('SCB Dental College', 'SCB Medical College', True, 'control (already worked)'),
    ('ESIC Dental College, Gulbarga', 'ESIC Medical College, Gulbarga', True,
     'same trust, same town, different discipline'),
    ('NORTH BENGAL DENT.COLL', 'North Bengal Dental College', False,
     'DENT.COLL and Dental College are the SAME discipline - abbreviations must canonicalise'),
    ('Governm ent DentalCo llege and Hospital Paithna', 'Government Dental College and Hospital, Nalanda',
     False, 'a PDF wrap inside DentalCollege is still dental on both sides'),
    ('Amrita School of Dentistry, Kochi', 'Amrita Institute of Dental Sciences, Kochi', False,
     'Dentistry and Dental are one discipline'),
    ('Autonomous State Medical College, Siddharthnagar', 'Autonomous State Medical College, Siddharth Nagar',
     False, 'Siddhartha/Siddharthnagar must never read as the Siddha discipline'),
    ('HASSAN INST. MEDICAL SCIENCES, HASSAN , K R PURAM, BEHIND DC OFFICE',
     'Hassan Institute of Medical Sciences, Hassan', False, 'District Collector, not Dental College'),
    ('Gmc, Bahraich, K.D.C Road Bahraich -271801', 'Government Medical College, Bahraich', False,
     'K.D.C Road is a road, not a Dental College'),
    ('M.G.D.C. & HOSPITAL, PUDUCHERRY', 'Pondicherry Institute of Medical Sciences', True,
     'M.G.D.C. is Mahatma Gandhi DENTAL College; it files BDS rows onto PIMS today'),
    ('Government Medical College & Hospital, Baramati, Plot No P107 MIDC area Opposite Women '
     'Hospital Baramati Taluka Baramati District Pune', 'Government Medical College, Baramati',
     False, 'MIDC is an industrial estate, not a dental college - the -DC rule is dotted-only'),
    ('AIIMS, New Delhi', 'AIIMS New Delhi', False, 'no discipline on either side'),
    ('Government Ayurvedic College, Nagpur', 'Government Ayurveda College, Nagpur', False,
     'ayurvedic/ayurveda are one discipline'),
    ('Government Homoeopathic Medical College', 'Government Homeopathic Medical College', False,
     'the two spellings of homoeopathy are one discipline'),
    ('Government Ayurvedic College, Nagpur', 'Government Medical College, Nagpur', True,
     'ayurveda still vetoes against allopathy'),
]


def _selftest():
    idx = CollegeIndex(_SELFTEST_COLLEGES)
    fails = 0
    # Every spelling has to canonicalise onto a label DISCIPLINE knows about, or a marker
    # would silently become its own private discipline and clash with every other spelling.
    stray = ((set(_MARKER_EXACT.values()) | {lab for _, lab in _MARKER_PREFIX}) - DISCIPLINE)
    if stray:
        fails += 1
        print(f'  FAIL markers canonicalise to labels outside DISCIPLINE: {sorted(stray)}')
    print('discipline_clash')
    for a, b, want, why in _SELFTEST_CLASH:
        got = discipline_clash(a, b)
        ok = got == want
        fails += not ok
        print(f'  {"ok  " if ok else "FAIL"} clash={got!s:5} want={want!s:5} '
              f'{sorted(disciplines(a))} vs {sorted(disciplines(b))}  [{why}]')
        if not ok:
            print(f'       a={a!r}\n       b={b!r}')
    print('resolve')
    for cell, want, why in _SELFTEST_RESOLVE:
        got = idx.resolve(cell)[0]
        got = got['name'] if got else None
        ok = got == want
        fails += not ok
        print(f'  {"ok  " if ok else "FAIL"} {cell[:52]!r} -> {got!r}  [{why}]')
        if not ok:
            print(f'       wanted {want!r}')
    total = len(_SELFTEST_CLASH) + len(_SELFTEST_RESOLVE)
    print(f'\n{total - fails}/{total} passed')
    return 1 if fails else 0


if __name__ == '__main__':
    import sys
    if '--selftest' in sys.argv:
        raise SystemExit(_selftest())
    raise SystemExit('usage: namematch.py --selftest')
