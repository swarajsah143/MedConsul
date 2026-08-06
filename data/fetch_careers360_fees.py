#!/usr/bin/env python3
"""
Extracts MBBS fee rows from the Careers360 public article (static HTML tables).

    https://medicine.careers360.com/articles/mbbs-fees   (robots allows /articles/)

This is an AGGREGATOR, self-declared source — NOT a statutory fee regulator. Every row is
stamped source="careers360 (self-declared)" and is meant as fast coverage to be VERIFIED /
overwritten later by the authoritative statutory scrape. We never overwrite an existing
(authoritative) fee row on import.

Two table shapes are recognised:
  - Deemed/private  : columns include Management (₹) and/or NRI ($)  -> quota rows Management/NRI
  - Government       : column "Annual Fee for AIQ Candidates"        -> quota "All India Quota (AIQ)"

Numbers are cleaned hard (strip ₹/$/commas/spaces and OCR tails like "8580m") and range-checked
[1,000 .. 5,000,000]; anything outside is dropped, never guessed.

Output: data/raw/fees.careers360.json  (staged fee rows keyed by collegeName)
Usage:  python3 data/fetch_careers360_fees.py
"""
import json
import os
import re

import requests
from bs4 import BeautifulSoup

UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"}
URL = "https://medicine.careers360.com/articles/mbbs-fees"
OUT = os.path.join(os.path.dirname(__file__), "raw", "fees.careers360.json")
SRC = "careers360 (self-declared)"

MIN_FEE, MAX_FEE = 1000, 5_000_000


def clean_num(v):
    if v is None:
        return None
    s = str(v).replace(",", "").replace("₹", "").replace("$", "").strip()
    m = re.search(r"\d[\d]*", s)          # first run of digits ("8580m" -> 8580, "-" -> None)
    if not m:
        return None
    n = int(m.group(0))
    return n if MIN_FEE <= n <= MAX_FEE else None


def clean_name(v):
    return re.sub(r"\s+", " ", str(v or "")).strip().rstrip(",").strip()


def header_of(table):
    """Merge the first up-to-2 header rows column-wise (Careers360 deemed table 0 splits
    'Annual Fees' into a Management (₹) / NRI ($) second row)."""
    trs = table.find_all("tr")[:2]
    merged = []
    for tr in trs:
        cells = [c.get_text(strip=True) for c in tr.find_all(["td", "th"])]
        for i, c in enumerate(cells):
            if i < len(merged):
                merged[i] = (merged[i] + " " + c).strip()
            else:
                merged.append(c)
    return merged


def is_fee_table(hdr):
    j = " ".join(hdr).lower()
    has_name = any(k in j for k in ["institute", "college"])
    has_fee = "fee" in j or "management" in j or "nri" in j
    return has_name and has_fee


def main():
    r = requests.get(URL, headers=UA, timeout=60)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")

    rows, seen = [], set()
    tables = soup.find_all("table")
    kept_tables = 0
    for t in tables:
        hdr = header_of(t)
        if not is_fee_table(hdr):
            continue
        hj = [h.lower() for h in hdr]
        # locate columns
        name_i = next((i for i, h in enumerate(hj) if "institute" in h or "college" in h), 0)
        aiq_i = next((i for i, h in enumerate(hj) if "aiq" in h), None)
        mgmt_i = next((i for i, h in enumerate(hj) if "management" in h), None)
        nri_i = next((i for i, h in enumerate(hj) if "nri" in h), None)
        hostel_i = next((i for i, h in enumerate(hj) if "hostel" in h), None)
        # Deemed/private tables have "annual fee structure" but no AIQ column — that number IS
        # the (management/tuition) fee, so label it Management Quota, never AIQ.
        deemed_i = None
        if aiq_i is None and mgmt_i is None and nri_i is None:
            deemed_i = next((i for i, h in enumerate(hj)
                             if "annual fee" in h and i != hostel_i), None)
        if aiq_i is None and mgmt_i is None and nri_i is None and deemed_i is None:
            continue
        # Skip tables whose (possibly multi-row) header width doesn't match the data width —
        # e.g. the tiny deemed table where "College"+"Management" collapsed into one header
        # cell, which misaligns every value. Better to lose 4 colleges than ship wrong fees.
        body = t.find_all("tr")[1:]
        first_data = next((tr for tr in body if tr.find_all(["td", "th"])), None)
        if first_data and len(first_data.find_all(["td", "th"])) != len(hdr):
            continue
        # A fee column must never coincide with the name column.
        if name_i in (aiq_i, mgmt_i, nri_i, deemed_i):
            continue
        kept_tables += 1

        for tr in t.find_all("tr")[1:]:
            cells = [c.get_text(strip=True) for c in tr.find_all(["td", "th"])]
            if len(cells) <= name_i:
                continue
            name = clean_name(cells[name_i])
            if not name or len(name) < 4 or name.lower() in ("institute", "college"):
                continue
            hostel = clean_num(cells[hostel_i]) if hostel_i is not None and hostel_i < len(cells) else None

            def emit(quota, fee_i):
                if fee_i is None or fee_i >= len(cells):
                    return
                fee = clean_num(cells[fee_i])
                if fee is None:
                    return
                key = (name.lower(), quota)
                if key in seen:
                    return
                seen.add(key)
                row = {"collegeName": name, "course": "MBBS", "category": "General",
                       "quota": quota, "tuitionFee": fee, "source": SRC}
                if hostel:
                    row["hostelFee"] = hostel
                rows.append(row)

            emit("All India Quota (AIQ)", aiq_i)
            emit("Management Quota", mgmt_i)
            emit("NRI Quota", nri_i)
            emit("Management Quota", deemed_i)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(rows, f, indent=1)

    by_q = {}
    for r in rows:
        by_q[r["quota"]] = by_q.get(r["quota"], 0) + 1
    print(f"fee tables parsed : {kept_tables}")
    print(f"fee rows extracted: {len(rows)}  ({len(set(r['collegeName'].lower() for r in rows))} distinct colleges)")
    print("by quota: " + ", ".join(f"{k}={v}" for k, v in by_q.items()))
    print(f"wrote -> {OUT}")
    print("sample:")
    for r in rows[:6]:
        print(f"   {r['collegeName'][:40]:41} {r['quota']:22} ₹{r['tuitionFee']}")


if __name__ == "__main__":
    main()
