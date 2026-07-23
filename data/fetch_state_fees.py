#!/usr/bin/env python3
"""
Scrapes AUTHORITATIVE per-state MBBS fee GO/notification PDFs -> staged fee rows.

Unlike Careers360 (self-declared aggregator), these are statutory fee-regulator / directorate
Government Orders, so the rows are stamped with the GO PDF URL as `source` and are authoritative.

Each state is one CONFIG entry (url, quota label, and how to pull tuition out of the PDF). Most GOs
render a bordered table (S.No | Institute | Tuition | Hostel | Security …) that pdfplumber reads;
those use table_rows(). A couple render the fee as free text lines and get a bespoke `parser`.

Rules kept from the pipeline: tuition range-checked [1L..60L]; a row with no clean tuition is
DROPPED, never guessed; the college-name → collegeId match happens later (this stages `collegeName`).

Output: data/raw/fees.states.json
Usage:  python3 data/fetch_state_fees.py
"""
import io
import json
import os
import re
import warnings

import pdfplumber
import requests

warnings.filterwarnings("ignore")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"}
OUT = os.path.join(os.path.dirname(__file__), "raw", "fees.states.json")
MIN_FEE, MAX_FEE = 100_000, 6_000_000       # private MBBS tuition band (govt colleges use careers360)


def to_num(x):
    d = re.sub(r"[^\d]", "", str(x or ""))
    return int(d) if d else None


def table_rows(pdf, cfg):
    """Generic bordered-table extractor: a data row starts with a serial number, name in col
    `name_col`, tuition in col `fee_col`."""
    out = []
    for pg in pdf.pages:
        for t in pg.extract_tables():
            for row in t:
                cells = [(c or "").replace("\n", " ").strip() for c in row]
                if len(cells) <= cfg["fee_col"]:
                    continue
                if not re.fullmatch(r"\d{1,3}", cells[0] or ""):
                    continue
                name = cells[cfg["name_col"]]
                fee = to_num(cells[cfg["fee_col"]])
                if name and len(name) > 4 and fee and MIN_FEE <= fee <= MAX_FEE:
                    out.append((name, fee))
    return out


CONFIGS = [
    {
        "state": "Uttar Pradesh",
        "quota": "Uttar Pradesh State Quota",
        "url": "https://dgme.up.gov.in/assets/admin/news/UG 2021 Fee Struchure.pdf",
        "name_col": 1, "fee_col": 2,
        "note": "UP DGME GO I/120293/2021 — non-minority private MBBS colleges",
    },
    # More states plug in here as their GO tables are confirmed text-parseable.
]


def main():
    rows, seen = [], set()
    for cfg in CONFIGS:
        print(f"--- {cfg['state']}: {cfg['url'].split('/')[-1]}")
        try:
            r = requests.get(cfg["url"], headers=UA, timeout=90, verify=False)
            r.raise_for_status()
            with pdfplumber.open(io.BytesIO(r.content)) as pdf:
                pairs = (cfg["parser"](pdf, cfg) if "parser" in cfg else table_rows(pdf, cfg))
        except Exception as e:
            print(f"   ERR {e}")
            continue
        n = 0
        for name, fee in pairs:
            name = re.sub(r"\s+", " ", name).strip().rstrip(",")
            key = (cfg["state"], name.lower())
            if key in seen:
                continue
            seen.add(key)
            rows.append({
                "collegeName": name, "course": "MBBS", "category": "General",
                "quota": cfg["quota"], "tuitionFee": fee,
                "_state": cfg["state"], "source": cfg["url"],
            })
            n += 1
        print(f"   -> {n} fee rows")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(rows, f, indent=1)
    print(f"\nwrote {len(rows)} authoritative state-fee rows -> {OUT}")
    for r in rows[:5]:
        print(f"   {r['collegeName'][:44]:45} {r['_state']:14} ₹{r['tuitionFee']:,}")


if __name__ == "__main__":
    main()
