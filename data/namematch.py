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
import re
import unicodedata

STOP = {
    'medical', 'college', 'institute', 'institution', 'sciences', 'science', 'of', 'and',
    'the', 'for', 'hospital', 'research', 'centre', 'center', 'university', 'school',
    'studies', 'health', 'foundation', 'trust', 'society', 'academy', 'a', 'in',
}
ABBR = {'govt': 'government', 'st': 'saint', 'dr': 'doctor', 'smt': 'shrimati'}

# Tokens that flip a college into a different institution entirely. If one name has one
# of these and the other does not, they are not the same college, however similar.
DISCIPLINE = {'dental', 'dentistry', 'ayurvedic', 'ayurveda', 'homoeopathic', 'homeopathic',
              'unani', 'siddha', 'naturopathy', 'nursing', 'veterinary', 'physiotherapy'}


def norm(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode()
    s = s.lower()
    s = re.sub(r'\(.*?\)', ' ', s)          # drop parentheticals
    s = re.sub(r'[^a-z0-9]+', ' ', s)       # punctuation -> space; kills "A.C.P.M." vs "ACPM"
    return s.strip()


def tokens(s):
    t = [ABBR.get(w, w) for w in norm(s).split()]
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
    da = DISCIPLINE & set(norm(a).split())
    db = DISCIPLINE & set(norm(b).split())
    return da != db


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
    """What's left of a name once the town is removed — the part that says WHICH college."""
    return set(tokens(s)) - place(s) - {w for w in norm(s).split() if len(w) <= 2}


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
        elif not hits:
            cell_toks = set(tokens(name))
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
                score = len(ctoks & cell_toks) / len(ctoks)
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
