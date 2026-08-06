#!/usr/bin/env python3
"""
extract_fees_via_search.py — MedCounsel fee-gap filler (web-search strategy).

For each college still MISSING fees, this:
  1. web-searches DuckDuckGo for "<college> <city> MBBS/BDS fees",
  2. keeps result snippets + fetches the top fee-aggregator pages
     (CollegeDunia / Shiksha / Careers360 / GetMyUni / CollegeDekho / ...),
  3. asks the Groq LLM to pull structured tuition/hostel/other fees,
  4. checkpoints each result (resumable),
  5. writes a clean workbook: university name + fee breakdown.

Reuses the fetch/LLM helpers from extract_fees_from_sites.py.
Run in the scratchpad venv (needs: ddgs, plus the deps of the sibling script).
"""
import argparse, importlib.util, json, os, re, sys, threading, time
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("fx", os.path.join(HERE, "extract_fees_from_sites.py"))
fx = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fx)

try:
    from ddgs import DDGS
except Exception:
    from duckduckgo_search import DDGS  # older name

# aggregator domains that publish per-college fee tables (higher = more trusted)
FEE_DOMAINS = {
    "collegedunia.com": 6, "shiksha.com": 6, "careers360.com": 6, "getmyuni.com": 5,
    "collegedekho.com": 5, "collegeandfees.com": 5, "edufever.com": 4, "mbbscouncil.com": 4,
    "medicaldialogues.in": 3, "successmantra.in": 3, "aglasem.com": 3, "collegevidya.com": 3,
    "buddy4study.com": 2, "prepp.in": 2, "collegesearch.in": 4, "targetadmission.com": 3,
    "medicalcounselling.in": 3, "neetcounselling.in": 3,
}

def domain_of(url):
    m = re.search(r"https?://([^/]+)", url or "")
    d = (m.group(1) if m else "").lower().replace("www.", "")
    return d

def dq(name):
    return '"' + name.replace('"', "").strip() + '"'

# -------- DuckDuckGo with rate-limit backoff -------------------------------
DDG_LOCK = threading.Lock()
_last_call = [0.0]
DDG_MIN_GAP = float(os.environ.get("DDG_MIN_GAP", "1.2"))  # seconds between queries (global)

def ddg_search(query, max_results=8, retries=5):
    for attempt in range(retries):
        with DDG_LOCK:                       # serialize + space out DDG queries
            gap = DDG_MIN_GAP - (time.time() - _last_call[0])
            if gap > 0:
                time.sleep(gap)
            _last_call[0] = time.time()
        try:
            with DDGS() as d:
                return list(d.text(query, region="in-en", max_results=max_results))
        except Exception as e:
            msg = str(e).lower()
            if "rate" in msg or "429" in msg or "202" in msg or "timeout" in msg:
                time.sleep(min(5 * (attempt + 1) + attempt * 3, 40))
                continue
            if attempt < 2:
                time.sleep(2)
                continue
            return []
    return []

def rank_results(results):
    scored = []
    for r in results:
        url = r.get("href") or r.get("url") or ""
        title = r.get("title") or ""
        body = r.get("body") or ""
        d = domain_of(url)
        score = FEE_DOMAINS.get(d, 0)
        blob = (title + " " + body).lower()
        if "fee" in blob:
            score += 2
        if any(k in blob for k in ("mbbs", "bds", "tuition", "hostel", "₹", "lakh", "rs")):
            score += 1
        scored.append((score, url, title, body))
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored

def process_one(rec, fetch_pages=2):
    num, college, state, city, typ, site = rec
    out = {"num": num, "college": college, "state": state, "city": city,
           "type": typ, "website": site}
    course = "BDS" if "dental" in college.lower() else "MBBS"
    query = f"{dq(college)} {city} {course} fees structure"
    results = ddg_search(query, max_results=8)
    if not results:
        # one retry with a looser query
        results = ddg_search(f"{college} {city} {course} fees", max_results=8)
    if not results:
        out.update({"found": False, "reason": "no_search_results"})
        return out
    ranked = rank_results(results)

    pages = []
    # 1) snippets block (title + body of top 6 results) — often contains the fee already
    snip = "\n".join(f"- {t.strip()} | {b.strip()}" for _s, _u, t, b in ranked[:6] if (t or b))
    pages.append(("web-search-snippets", snip[:4000]))
    # 2) fetch the top fee-aggregator result pages
    fetched = 0
    tried = []
    for sc, url, _t, _b in ranked:
        if fetched >= fetch_pages:
            break
        if sc <= 0:
            continue
        d = domain_of(url)
        if d in tried:
            continue
        tried.append(d)
        try:
            res = fx._fetch_text(url, timeout=18)
            txt = res[1]
            if txt and txt.strip():
                pages.append((url, txt[:7000]))
                fetched += 1
        except Exception:
            continue

    joined = "\n".join(t for _u, t in pages)
    if not fx.AMOUNT_RE.search(joined):
        out.update({"found": False, "reason": "no_fee_figures_in_results",
                    "top_result": ranked[0][1] if ranked else None})
        return out
    data = fx.llm_extract(college, pages)
    out.update(data)
    out["top_result"] = ranked[0][1] if ranked else None
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="/home/swaraj-sah/Downloads/MedCounsel-data-gaps-websites-updated.xlsx")
    ap.add_argument("--outdir", default="/home/swaraj-sah/Downloads")
    ap.add_argument("--scope", choices=["missing", "all"], default="missing")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--llm-rpm", type=int, default=30)
    ap.add_argument("--fetch-pages", type=int, default=1)
    ap.add_argument("--model", default="llama-3.1-8b-instant",
                    help="Groq extraction model (8b-instant = higher free-tier throughput)")
    ap.add_argument("--checkpoint", default=None)
    args = ap.parse_args()

    fx.EXTRACT_MODEL = args.model
    fx.LIMITER = fx.RateLimiter(args.llm_rpm)
    if not fx.EXTRACT_KEY:
        print("ERROR: no extraction key (set data/.env.extract or EXTRACT_AI_API_KEY)",
              file=sys.stderr); sys.exit(1)
    print(f"[fees-search] extraction key: "
          f"{'SEPARATE (dedicated)' if fx.USING_SEPARATE_KEY else 'shared with app (!)'}",
          flush=True)

    ckpt = args.checkpoint or os.path.join(args.outdir, "fee_search_checkpoint.jsonl")
    out_xlsx = os.path.join(args.outdir, "MedCounsel-fees-extracted.xlsx")
    out_csv = os.path.join(args.outdir, "MedCounsel-fees-extracted.csv")

    targets = fx.load_targets(args.input, args.scope)
    if args.limit:
        targets = targets[: args.limit]

    done = {}
    if os.path.exists(ckpt):
        for line in open(ckpt, encoding="utf-8"):
            line = line.strip()
            if line:
                try:
                    d = json.loads(line); done[d["num"]] = d
                except Exception:
                    pass
    todo = [t for t in targets if t[0] not in done]
    print(f"[fees-search] targets={len(targets)} done={len(done)} todo={len(todo)} "
          f"scope={args.scope} extract_model={fx.EXTRACT_MODEL}", flush=True)

    def is_ratelimited(res):
        e = (res.get("error") or "").lower()
        return "429" in e or "rate" in e or "daily_cap" in e

    lock = threading.Lock()
    ck = open(ckpt, "a", encoding="utf-8")
    completed = found_ct = deferred = 0
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(process_one, t, args.fetch_pages): t for t in todo}
        for fut in as_completed(futs):
            t = futs[fut]
            try:
                res = fut.result()
            except Exception as e:
                res = {"num": t[0], "college": t[1], "state": t[2], "city": t[3],
                       "type": t[4], "website": t[5], "found": False,
                       "error": f"worker_crash: {type(e).__name__}: {str(e)[:110]}"}
            with lock:
                if is_ratelimited(res):
                    # Do NOT checkpoint — leave for the next resume run.
                    deferred += 1
                    if deferred % 10 == 1:
                        print(f"[fees-search] deferring rate-limited college "
                              f"(daily token cap?) — {res.get('college','')[:34]}. "
                              f"Re-run the same command later to resume.", flush=True)
                    continue
                ck.write(json.dumps(res, ensure_ascii=False) + "\n"); ck.flush()
                done[res["num"]] = res
                completed += 1
                if res.get("found"):
                    found_ct += 1
                if completed % 10 == 0 or completed == len(todo):
                    rate = completed / max(time.time() - t0, 1)
                    eta = (len(todo) - completed - deferred) / max(rate, 1e-6) / 60
                    print(f"[fees-search] {completed}/{len(todo)} | found {found_ct} "
                          f"({100*found_ct/max(completed,1):.0f}%) | deferred {deferred} | "
                          f"{rate*60:.1f}/min | ETA {eta:.1f}m | {res.get('college','')[:32]} -> "
                          f"{'FOUND' if res.get('found') else res.get('reason') or res.get('error') or 'no'}",
                          flush=True)
    ck.close()
    if deferred:
        print(f"\n[fees-search] {deferred} colleges deferred (hit the daily token cap). "
              f"Re-run the SAME command tomorrow to resume — done work is checkpointed.", flush=True)
    fx.write_outputs(list(done.values()), out_xlsx, out_csv)
    total_found = sum(1 for d in done.values() if d.get("found"))
    print(f"\n[fees-search] COMPLETE processed={len(done)} found={total_found} "
          f"({100*total_found/max(len(done),1):.0f}%)", flush=True)
    print(f"[fees-search] Excel: {out_xlsx}\n[fees-search] CSV: {out_csv}\n"
          f"[fees-search] checkpoint: {ckpt}", flush=True)

if __name__ == "__main__":
    main()
