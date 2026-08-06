#!/usr/bin/env python3
"""
extract_fees.py — the consolidated MedCounsel fee-extraction agent.

ONE driver that fills the fee gaps for every college in the "data gaps" workbook
using an OFFICIAL-FIRST, AGGREGATOR-FALLBACK strategy:

  For each college (in workbook row order):
    1. CACHE   — if a prior checkpoint already holds CONCRETE fees for it, reuse
                 them for free (official cache preferred over aggregator cache).
    2. OFFICIAL— crawl the college's own website + a site:-restricted web search,
                 and ask the LLM to pull structured fees. Use it if concrete.
    3. FALLBACK— otherwise web-search the fee aggregators (Shiksha, CollegeDunia,
                 Careers360, GetMyUni, CollegeDekho, ...) and extract from those.

It reuses every helper from the three sibling modules instead of duplicating them:
    extract_fees_from_sites.py  (fx)  — fetch / crawl / LLM extract / IO
    extract_fees_via_search.py  (sx)  — DuckDuckGo + aggregator ranking
    extract_fees_official.py    (ox)  — official-domain-restricted extraction

Output: ONE workbook — university name + full fee breakdown + which source it came
from — plus a resumable JSONL checkpoint and a CSV mirror.

Run inside the scratchpad venv that has:
    requests beautifulsoup4 lxml pypdf openpyxl ddgs

Examples:
    # pilot — first 40 colleges
    python extract_fees.py --limit 40
    # the rest, after approval
    python extract_fees.py --offset 40 --limit 0
"""
import argparse, importlib.util, json, os, re, sys, threading, time
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))


def _load(mod, fname):
    spec = importlib.util.spec_from_file_location(mod, os.path.join(HERE, fname))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


# Loading ox pulls in sx and fx transitively (ox imports sx; sx.fx is fx).
ox = _load("ox", "extract_fees_official.py")
sx = ox.sx
fx = ox.fx

FEE_KEYS = ("tuition_fee", "hostel_fee", "other_fees", "total_fee")
_EMPTY = {"", "null", "none", "n/a", "na", "not available", "-"}

# Extra fallback fee sources requested by the user. moksh16 has clean per-college
# pages (moksh16.com/<slug>) with real MBBS fee tables; neetcompanion is mostly a
# rank predictor, added at low trust in case any of its pages carry fees.
sx.FEE_DOMAINS.update({"moksh16.com": 7, "neetcompanion.com": 3})
MOKSH_BASE = "https://www.moksh16.com/"


def _moksh_slug(name):
    s = (name or "").lower().replace("&", " and ")
    s = re.sub(r"[.'\"(),/:]", " ", s)
    s = re.sub(r"\s+", "-", s.strip())
    return re.sub(r"-+", "-", s)


def try_moksh16(rec):
    """Directly probe the college's moksh16.com page for a fee table."""
    num, college, state, city, typ, site = rec
    url = MOKSH_BASE + _moksh_slug(college)
    try:
        res = fx._fetch_text(url, timeout=20)
        txt = res[1] or ""
    except Exception:
        return {}
    if not txt.strip() or not fx.AMOUNT_RE.search(txt):
        return {}
    data = fx.llm_extract(college, [(url, txt[:7000])])
    data["source_url"] = url
    return data


def has_fee(rec):
    """True iff the record carries at least one concrete fee figure."""
    if not rec:
        return False
    for k in FEE_KEYS:
        v = rec.get(k)
        if v and str(v).strip().lower() not in _EMPTY:
            return True
    return False


def _read_jsonl(path):
    out = {}
    if path and os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
                out[str(d.get("num"))] = d
            except Exception:
                pass
    return out


def _finalize(rec, source, num, college, state, city, typ, site):
    """Normalise a raw extraction dict into an output row with a Source label."""
    rec = dict(rec or {})
    rec.update({"num": str(num), "college": college, "state": state, "city": city,
                "type": typ, "website": site, "source": source})
    rec["found"] = has_fee(rec)
    return rec


# Set once the Groq daily token cap is detected — makes in-flight workers
# short-circuit fast (deferring their college) instead of wasting fetches.
_STOP = threading.Event()


def is_ratelimited(res):
    e = (res.get("error") or "").lower()
    return any(m in e for m in ("429", "rate", "daily_cap", "deferred_daily_cap"))


def resolve_one(rec, off_cache, srch_cache, do_official=True, do_search=True):
    """Official-first, aggregator-fallback resolution for a single college."""
    num, college, state, city, typ, site = rec
    fin = lambda r, s: _finalize(r, s, num, college, state, city, typ, site)

    if _STOP.is_set():
        return fin({"found": False, "error": "deferred_daily_cap"}, "None")

    # 1) cache — official concrete fees win, else aggregator concrete fees
    if has_fee(off_cache.get(num)):
        return fin(off_cache[num], "Official (cache)")
    if has_fee(srch_cache.get(num)):
        return fin(srch_cache[num], "Aggregator (cache)")

    # 2) live official (own website)
    o = {}
    if do_official and site:
        try:
            o = ox.process_one_official(rec)
        except Exception as e:
            o = {"found": False, "error": f"official_crash: {type(e).__name__}: {str(e)[:100]}"}
        if has_fee(o):
            return fin(o, "Official")

    # 3) moksh16 direct per-college page (high-yield, deterministic URL)
    if do_search:
        m = try_moksh16(rec)
        if has_fee(m):
            return fin(m, "moksh16")

    # 4) live aggregator search fallback (Shiksha / CollegeDunia / moksh16 / ...)
    s = {}
    if do_search:
        try:
            s = sx.process_one(rec)
        except Exception as e:
            s = {"found": False, "error": f"search_crash: {type(e).__name__}: {str(e)[:100]}"}
        if has_fee(s):
            return fin(s, "Aggregator")

    # 4) nothing concrete anywhere — keep the most informative failure
    best = o if (o.get("reason") or o.get("error")) else s
    return fin(best or {"found": False, "reason": "no_fee_found"}, "None")


# ------------------------------------------------------------------ sanitize
def _to_rupees(s):
    """Best-effort parse of a fee string to a rupee float (handles lakh/cr/K)."""
    if not s:
        return None
    t = str(s).lower().replace(",", "")
    m = re.search(r"(\d+(?:\.\d+)?)\s*(crore|cr|lakhs|lakh|k)?", t)
    if not m:
        return None
    v = float(m.group(1))
    unit = m.group(2) or ""
    tail = t.split(m.group(1), 1)[-1].lstrip()
    if unit in ("crore", "cr"):
        v *= 1e7
    elif unit in ("lakh", "lakhs") or tail[:1] == "l":
        v *= 1e5
    elif unit == "k":
        v *= 1e3
    return v


def sanitize(rec):
    """Clean obvious LLM-extraction noise before it reaches the workbook:
      * a tuition/hostel/total cell holding a LABEL (no digit) -> drop, note it,
      * a Government college with tuition > Rs 5L -> almost certainly an
        NRI/management-quota figure, not the govt-quota fee -> flag for review.
    Leaves 'other_fees' descriptive text alone (it's useful context)."""
    d = dict(rec)
    flags = []
    for k, label in (("tuition_fee", "tuition"), ("hostel_fee", "hostel"), ("total_fee", "total")):
        v = d.get(k)
        if v and not re.search(r"\d", str(v)):
            flags.append(f"{label} was label-only: {str(v)[:50]}")
            d[k] = None
    if "govern" in str(d.get("type") or "").lower():
        val = _to_rupees(d.get("tuition_fee"))
        if val and val > 500000:
            flags.append("tuition looks like NRI/mgmt quota (>Rs 5L), not govt quota — VERIFY")
            d["confidence"] = "low"
    if flags:
        note = (d.get("notes") or "").strip()
        d["notes"] = (note + " | " if note else "") + " ; ".join(flags)
    return d


# ------------------------------------------------------------------ output
OUT_COLS = ["#", "College", "State", "City", "Type", "Website",
            "Tuition Fee", "Hostel Fee", "Other Fees", "Total Fee", "Period",
            "Course", "Source", "Source URL", "Confidence", "Notes", "Status"]


def _cell(d, k):
    v = d.get(k)
    return "" if v is None else str(v)


def _status(d):
    if has_fee(d):
        return "FOUND"
    tail = d.get("reason") or d.get("error") or "no fee"
    return f"NOT FOUND ({tail})"


def write_outputs(results, out_xlsx, out_csv):
    import csv
    import openpyxl
    results = [sanitize(d) for d in results]
    results = sorted(results, key=lambda d: int(d["num"]) if str(d.get("num", "")).isdigit() else 0)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Fees"
    ws.append(OUT_COLS)

    def row(d):
        return [d.get("num", ""), d.get("college", ""), d.get("state", ""), d.get("city", ""),
                d.get("type", ""), d.get("website", ""),
                _cell(d, "tuition_fee"), _cell(d, "hostel_fee"), _cell(d, "other_fees"),
                _cell(d, "total_fee"), _cell(d, "period"), _cell(d, "course"),
                d.get("source", ""), _cell(d, "source_url") or _cell(d, "top_result"),
                _cell(d, "confidence"), _cell(d, "notes"), _status(d)]

    for d in results:
        ws.append(row(d))
    widths = [5, 42, 16, 14, 12, 32, 20, 18, 30, 18, 12, 8, 18, 32, 11, 32, 24]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = w
    ws.freeze_panes = "A2"
    wb.save(out_xlsx)

    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(OUT_COLS)
        for d in results:
            w.writerow(row(d))


# ------------------------------------------------------------------ runner
def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", default="/home/swaraj-sah/Downloads/MedCounsel-data-gaps-websites-updated.xlsx")
    ap.add_argument("--outdir", default="/home/swaraj-sah/Downloads")
    ap.add_argument("--tag", default="first40", help="output basename tag, e.g. 'first40' or 'all'")
    ap.add_argument("--offset", type=int, default=0, help="0-based start index into the target list")
    ap.add_argument("--limit", type=int, default=40, help="number of colleges to process (0 = all remaining)")
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--llm-rpm", type=int, default=28)
    ap.add_argument("--fetch-pages", type=int, default=2)
    ap.add_argument("--model", default="llama-3.1-8b-instant")
    ap.add_argument("--no-official", action="store_true", help="skip the official-site pass (aggregators only)")
    ap.add_argument("--no-search", action="store_true", help="skip the aggregator fallback (official only)")
    ap.add_argument("--off-ckpt", default="/home/swaraj-sah/Downloads/fee_official_checkpoint.jsonl")
    ap.add_argument("--srch-ckpt", default="/home/swaraj-sah/Downloads/fee_search_checkpoint.recovered.jsonl")
    ap.add_argument("--checkpoint", default=None)
    args = ap.parse_args()

    # wire the shared LLM extractor
    fx.EXTRACT_MODEL = args.model
    fx.LIMITER = fx.RateLimiter(args.llm_rpm)
    if not fx.EXTRACT_KEY:
        print("ERROR: no extraction key (set AI_API_KEY in repo .env, or data/.env.extract)", file=sys.stderr)
        sys.exit(1)
    print(f"[fees] extraction key: {'SEPARATE (dedicated)' if fx.USING_SEPARATE_KEY else 'shared with app'} "
          f"| model={fx.EXTRACT_MODEL} | base={fx.EXTRACT_BASE}", flush=True)

    ckpt = args.checkpoint or os.path.join(args.outdir, f"fee_combined_{args.tag}.jsonl")
    out_xlsx = os.path.join(args.outdir, f"MedCounsel-fees-{args.tag}.xlsx")
    out_csv = os.path.join(args.outdir, f"MedCounsel-fees-{args.tag}.csv")

    off_cache = _read_jsonl(args.off_ckpt)
    srch_cache = _read_jsonl(args.srch_ckpt)

    targets = fx.load_targets(args.input, "all")     # every college that has a website
    window = targets[args.offset: (args.offset + args.limit) if args.limit else None]

    done = _read_jsonl(ckpt)                          # this run's own resume state
    todo = [t for t in window if str(t[0]) not in done]

    cache_hits = sum(1 for t in window
                     if has_fee(off_cache.get(str(t[0]))) or has_fee(srch_cache.get(str(t[0]))))
    print(f"[fees] window={len(window)} (offset {args.offset}, limit {args.limit or 'all'}) | "
          f"cache-with-fees={cache_hits} | already-done-this-run={len(done)} | todo={len(todo)}", flush=True)

    lock = threading.Lock()
    ck = open(ckpt, "a", encoding="utf-8")
    completed = found_ct = deferred = 0
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(resolve_one, t, off_cache, srch_cache,
                          not args.no_official, not args.no_search): t for t in todo}
        for fut in as_completed(futs):
            t = futs[fut]
            try:
                res = fut.result()
            except Exception as e:
                res = _finalize({"found": False, "error": f"crash: {type(e).__name__}: {str(e)[:110]}"},
                                "None", t[0], t[1], t[2], t[3], t[4], t[5])
            with lock:
                # Daily token cap: DON'T checkpoint — leave the college for the next
                # resume run — and signal in-flight workers to short-circuit.
                if is_ratelimited(res):
                    deferred += 1
                    if not _STOP.is_set():
                        _STOP.set()
                        print(f"[fees] Groq daily token cap hit — deferring the rest. "
                              f"Re-run the SAME command later to resume (work is checkpointed).", flush=True)
                    continue
                ck.write(json.dumps(res, ensure_ascii=False) + "\n")
                ck.flush()
                done[res["num"]] = res
                completed += 1
                if res.get("found"):
                    found_ct += 1
                if completed % 5 == 0 or completed == len(todo):
                    rate = completed / max(time.time() - t0, 1)
                    eta = (len(todo) - completed - deferred) / max(rate, 1e-6) / 60
                    print(f"[fees] {completed}/{len(todo)} live | found {found_ct} | deferred {deferred} | "
                          f"{rate*60:.1f}/min | ETA {eta:.1f}m | {res.get('college', '')[:34]} -> "
                          f"{res.get('source') if res.get('found') else _status(res)[:40]}", flush=True)
    ck.close()
    if deferred:
        print(f"[fees] {deferred} colleges deferred on the daily cap — re-run to resume.", flush=True)

    # assemble the full window (cached + freshly-done) and write outputs
    rows = []
    for t in window:
        num = str(t[0])
        if num in done:
            rows.append(done[num])
        else:
            rows.append(resolve_one(t, off_cache, srch_cache, False, False))  # cache-only fill
    write_outputs(rows, out_xlsx, out_csv)

    total_found = sum(1 for d in rows if has_fee(d))
    by_src = {}
    for d in rows:
        if has_fee(d):
            by_src[d.get("source", "?")] = by_src.get(d.get("source", "?"), 0) + 1
    print(f"\n[fees] COMPLETE window={len(rows)} found={total_found} "
          f"({100*total_found/max(len(rows),1):.0f}%) | by source: {by_src}", flush=True)
    print(f"[fees] Excel: {out_xlsx}\n[fees] CSV:   {out_csv}\n[fees] checkpoint: {ckpt}", flush=True)


if __name__ == "__main__":
    main()
