#!/usr/bin/env python3
"""
extract_fees_official.py — fee extraction restricted to each college's OWN website.

Unlike extract_fees_via_search.py (which trusts aggregators like CollegeDunia),
this only accepts fee text that lives on the college's official domain (the
`Website` column of the gaps workbook). For each college it:
  1. runs a `site:<official-domain>` web search to locate deep fee pages / PDFs,
  2. also crawls the official homepage (on-domain fee/admission/prospectus links),
  3. keeps ONLY pages whose domain matches the official site,
  4. asks the Groq LLM to extract structured tuition/hostel/other fees,
  5. checkpoints each result (resumable), writes a clean workbook.

Yield is far lower than the aggregator strategy — many official sites simply do
not publish concrete fees — but every figure it returns is officially sourced.

Run in the scratchpad venv (needs: ddgs + the sibling scripts' deps).
"""
import argparse, importlib.util, json, os, re, sys, threading, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))

def _load(mod, fname):
    spec = importlib.util.spec_from_file_location(mod, os.path.join(HERE, fname))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m

sx = _load("sx", "extract_fees_via_search.py")   # ddg_search, domain_of, dq, rank helpers
fx = sx.fx                                        # low-level fetch + LLM helpers

# --------------------------------------------------------------- domain matching
_CCTLD_SLD = {"edu", "ac", "gov", "nic", "co", "org", "res", "net", "gen", "mil"}

def reg_domain(netloc_or_url):
    net = sx.domain_of(netloc_or_url) if "://" in (netloc_or_url or "") else \
        (netloc_or_url or "").lower().replace("www.", "")
    net = net.split(":")[0]
    labels = [x for x in net.split(".") if x]
    if len(labels) >= 3 and labels[-2] in _CCTLD_SLD and len(labels[-1]) <= 3:
        return ".".join(labels[-3:])
    if len(labels) >= 2:
        return ".".join(labels[-2:])
    return net

def same_site(url, official_reg):
    d = sx.domain_of(url)
    return bool(official_reg) and (d == official_reg or d.endswith("." + official_reg))

# --------------------------------------------------------------- per-college
def process_one_official(rec, fetch_pages=3):
    num, college, state, city, typ, site = rec
    out = {"num": num, "college": college, "state": state, "city": city,
           "type": typ, "website": site, "source_type": "official"}
    official_reg = reg_domain(site)
    if not official_reg:
        out.update({"found": False, "reason": "no_official_domain"})
        return out
    course = "BDS" if "dental" in college.lower() else "MBBS"

    pages, seen = [], set()

    def add(url, text):
        if not text or not text.strip():
            return
        key = url.split("#")[0]
        if key in seen:
            return
        seen.add(key)
        pages.append((url, text[:7000]))

    # --- (1) site:-restricted web search to find deep official fee pages -------
    off_results = []
    for q in (f"{sx.dq(college)} {course} fee structure site:{official_reg}",
              f"fee structure hostel fee site:{official_reg}"):
        for r in sx.ddg_search(q, max_results=8):
            url = r.get("href") or ""
            if same_site(url, official_reg):
                off_results.append(r)
        if len(off_results) >= 3:
            break
    # snippets from official results only
    if off_results:
        snip = "\n".join(f"- {(r.get('title') or '').strip()} | {(r.get('body') or '').strip()}"
                         for r in off_results[:6])
        add("official-search-snippets", snip[:3500])
    fetched = 0
    for r in off_results:
        if fetched >= fetch_pages:
            break
        try:
            res = fx._fetch_text(r["href"], timeout=18)
            if res[1] and res[1].strip():
                add(res[0], res[1]); fetched += 1
        except Exception:
            pass

    # --- (2) on-domain crawl of the official homepage -------------------------
    try:
        crawl, status = fx.gather_pages(site, None, max_fetches=7)
    except Exception as e:
        crawl, status = [], f"crawl_err:{type(e).__name__}"
    out["crawl_status"] = status
    for u, t in crawl:
        if same_site(u, official_reg):
            add(u, t)

    reachable = [(u, t) for (u, t) in pages if not u.startswith("official-search")]
    if not pages or (not reachable and not off_results):
        out.update({"found": False, "reason": "official_site_unreachable"})
        return out
    joined = "\n".join(t for _u, t in pages)
    if not fx.AMOUNT_RE.search(joined):
        out.update({"found": False, "reason": "no_fee_figures_on_official_site",
                    "pages_seen": len(pages)})
        return out

    data = fx.llm_extract(college, pages)
    out.update(data)
    out["source_type"] = "official"
    out["pages_seen"] = len(pages)
    # The model sometimes returns found=true with every fee field null. Treat a row
    # as genuinely found ONLY when at least one concrete fee value is present.
    feevals = [out.get(k) for k in ("tuition_fee", "hostel_fee", "other_fees", "total_fee")]
    has_fee = any(v and str(v).strip().lower() not in ("", "null", "none", "n/a", "not available")
                  for v in feevals)
    out["found"] = bool(has_fee)
    if not has_fee and not out.get("reason"):
        out["reason"] = "no_concrete_fee_extracted"
    # guard: if the LLM cited a non-official source, flag it
    su = out.get("source_url") or ""
    if su and su != "official-search-snippets" and not same_site(su, official_reg):
        out["notes"] = ((out.get("notes") or "") + " [source_url not on official domain]").strip()
    return out

# --------------------------------------------------------------- runner
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="/home/swaraj-sah/Downloads/MedCounsel-data-gaps-websites-updated.xlsx")
    ap.add_argument("--outdir", default="/home/swaraj-sah/Downloads")
    ap.add_argument("--scope", choices=["missing", "all"], default="all")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--llm-rpm", type=int, default=30)
    ap.add_argument("--fetch-pages", type=int, default=3)
    ap.add_argument("--model", default="llama-3.1-8b-instant")
    ap.add_argument("--checkpoint", default=None)
    args = ap.parse_args()

    fx.EXTRACT_MODEL = args.model
    fx.LIMITER = fx.RateLimiter(args.llm_rpm)
    if not fx.EXTRACT_KEY:
        print("ERROR: no extraction key (set data/.env.extract or EXTRACT_AI_API_KEY)",
              file=sys.stderr); sys.exit(1)
    print(f"[fees-official] extraction key: "
          f"{'SEPARATE (dedicated)' if fx.USING_SEPARATE_KEY else 'shared with app (!)'} "
          f"base={fx.EXTRACT_BASE}", flush=True)

    ckpt = args.checkpoint or os.path.join(args.outdir, "fee_official_checkpoint.jsonl")
    out_xlsx = os.path.join(args.outdir, "MedCounsel-fees-official.xlsx")
    out_csv = os.path.join(args.outdir, "MedCounsel-fees-official.csv")

    targets = fx.load_targets(args.input, args.scope)   # scope=all -> every college w/ a website
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
    print(f"[fees-official] targets={len(targets)} done={len(done)} todo={len(todo)} "
          f"scope={args.scope} extract_model={fx.EXTRACT_MODEL}", flush=True)

    def is_ratelimited(res):
        e = (res.get("error") or "").lower()
        return "429" in e or "rate" in e or "daily_cap" in e

    lock = threading.Lock()
    ck = open(ckpt, "a", encoding="utf-8")
    completed = found_ct = deferred = 0
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(process_one_official, t, args.fetch_pages): t for t in todo}
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
                    deferred += 1
                    if deferred % 10 == 1:
                        print(f"[fees-official] deferring rate-limited college "
                              f"(daily cap?) — {res.get('college','')[:34]}. Re-run to resume.",
                              flush=True)
                    continue
                ck.write(json.dumps(res, ensure_ascii=False) + "\n"); ck.flush()
                done[res["num"]] = res
                completed += 1
                if res.get("found"):
                    found_ct += 1
                if completed % 10 == 0 or completed == len(todo):
                    rate = completed / max(time.time() - t0, 1)
                    eta = (len(todo) - completed - deferred) / max(rate, 1e-6) / 60
                    print(f"[fees-official] {completed}/{len(todo)} | official-found {found_ct} "
                          f"({100*found_ct/max(completed,1):.0f}%) | deferred {deferred} | "
                          f"{rate*60:.1f}/min | ETA {eta:.1f}m | {res.get('college','')[:30]} -> "
                          f"{'FOUND' if res.get('found') else res.get('reason') or res.get('error') or 'no'}",
                          flush=True)
    ck.close()
    fx.write_outputs(list(done.values()), out_xlsx, out_csv)
    total_found = sum(1 for d in done.values() if d.get("found"))
    print(f"\n[fees-official] COMPLETE processed={len(done)} official-found={total_found} "
          f"({100*total_found/max(len(done),1):.0f}%)", flush=True)
    print(f"[fees-official] Excel: {out_xlsx}\n[fees-official] CSV: {out_csv}\n"
          f"[fees-official] checkpoint: {ckpt}", flush=True)
    if deferred:
        print(f"[fees-official] {deferred} deferred on daily token cap — re-run same command to resume.",
              flush=True)

if __name__ == "__main__":
    main()
