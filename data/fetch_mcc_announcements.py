#!/usr/bin/env python3
"""
Scrapes MCC (Medical Counselling Committee) UG notices -> announcements rows.

Source: mcc.nic.in — the All-India-Quota (AIQ) authority. There is no API; every notice,
schedule, seat matrix and result is a PDF on the government CDN (cdnbbsr.s3waas.gov.in),
linked from two server-rendered HTML pages:

    /ug-medical-counselling/   the live "Latest News / Current Events" list
    /archive-ug/               the multi-year archive tables (Title | Year | View)

We only need the anchor text + href, so no PDF is opened. The DATE is recovered from the
CDN filename, which is stamped YYYYMMDD... (e.g. .../uploads/2026/05/20260527102506.pdf ->
2026-05-27). A title like "... dated 31.12.2025" wins over the filename when present,
because MCC sometimes re-uploads an older notice under a new filename.

Rows with no derivable date are DROPPED, never guessed — announcements.date is sorted
lexicographically, so a wrong date silently sorts to the wrong place forever.

Output: data/raw/announcements.mcc.json  (announcements schema; state="" means AIQ/MCC)
Usage:  python3 data/fetch_mcc_announcements.py
"""
import json
import os
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"}
LANDING = "https://mcc.nic.in/ug-medical-counselling/"
ARCHIVE = "https://mcc.nic.in/archive-ug/"
OUT = os.path.join(os.path.dirname(__file__), "raw", "announcements.mcc.json")

# Title -> announcementType. Order matters: first match wins.
TYPE_RULES = [
    (re.compile(r"seat\s*matrix", re.I),                      "Seat Matrix"),
    (re.compile(r"merit\s*list", re.I),                       "Merit List"),
    (re.compile(r"\b(result|allot(ment|ted))\b", re.I),       "Result"),
    (re.compile(r"\b(schedule|revised\s*schedule)\b", re.I),  "Counselling Schedule"),
    (re.compile(r"\b(registration|commencement|choice\s*filling)\b", re.I), "Registration"),
]

# "dated 31.12.2025" / "dated 31-12-2025" / "dated 31/12/2025"
DATED_RE = re.compile(r"dated\s*:?\s*(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})", re.I)
# CDN filename stamp: /uploads/YYYY/MM/YYYYMMDD......
STAMP_RE = re.compile(r"/uploads/(\d{4})/(\d{2})/(\d{8})")
# fallback: /uploads/YYYY/MM/ with no parseable day
YM_RE = re.compile(r"/uploads/(\d{4})/(\d{2})/")


def classify(title):
    for rx, label in TYPE_RULES:
        if rx.search(title):
            return label
    return "Public Notice"


def date_from(title, href):
    """Return YYYY-MM-DD or None. Never guesses a day."""
    m = DATED_RE.search(title or "")
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"
    m = STAMP_RE.search(href or "")
    if m:
        stamp = m.group(3)
        y, mo, d = int(stamp[0:4]), int(stamp[4:6]), int(stamp[6:8])
        # sanity: the stamp must agree with the folder year and be a real-ish date
        if str(y) == m.group(1) and 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"
    return None


def fetch(url, tries=3):
    for i in range(tries):
        try:
            r = requests.get(url, headers=UA, timeout=60)
            r.raise_for_status()
            return r.text
        except Exception as e:
            if i == tries - 1:
                raise
            print(f"  retry {i+1} for {url}: {e}", file=sys.stderr)
            time.sleep(2 * (i + 1))


def harvest(html, source_url):
    """Yield (title, href) for every PDF anchor that carries real link text."""
    soup = BeautifulSoup(html, "html.parser")
    seen_href = {}
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if ".pdf" not in href.lower() and "s3waas" not in href.lower():
            continue
        text = a.get_text(strip=True)
        # Archive rows repeat the same PDF as [title] + [View(8 MB)] + [empty].
        # Keep the longest, most descriptive text per href.
        if not text or re.fullmatch(r"(accessible version\s*:?)?\s*view\s*\(.*?\)", text, re.I):
            text = ""
        prev = seen_href.get(href, "")
        if len(text) > len(prev):
            seen_href[href] = text
    for href, text in seen_href.items():
        if text:
            yield text, href


def main():
    rows, dropped = {}, 0
    for url in (LANDING, ARCHIVE):
        print(f"fetching {url} ...")
        html = fetch(url)
        n = 0
        for title, href in harvest(html, url):
            if href.startswith("/"):
                href = "https://mcc.nic.in" + href
            date = date_from(title, href)
            if not date:
                dropped += 1
                continue
            title = re.sub(r"\s+", " ", title).strip()
            key = (date, title)              # announcements naturalKey = date + title
            if key in rows:
                continue
            rows[key] = {
                "date": date,
                "title": title[:300],
                "announcementType": classify(title),
                "state": "",                  # blank = All India / MCC
                "shortDescription": "MCC All India Quota (AIQ) UG counselling notice.",
                "documentLabel": "MCC UG notice (PDF)",
                "documentUrl": href,
                "source": url,
            }
            n += 1
        print(f"  -> {n} dated notices")

    out = sorted(rows.values(), key=lambda r: r["date"], reverse=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(out, f, indent=1)

    by_type, by_year = {}, {}
    for r in out:
        by_type[r["announcementType"]] = by_type.get(r["announcementType"], 0) + 1
        by_year[r["date"][:4]] = by_year.get(r["date"][:4], 0) + 1
    print(f"\nwrote {len(out)} announcements -> {OUT}")
    print(f"dropped (no derivable date): {dropped}")
    print("by type: " + ", ".join(f"{k}={v}" for k, v in sorted(by_type.items())))
    print("by year: " + ", ".join(f"{k}={v}" for k, v in sorted(by_year.items(), reverse=True)))


if __name__ == "__main__":
    main()
