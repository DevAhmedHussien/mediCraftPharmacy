#!/usr/bin/env python3
"""
Extract Schedule A-1 — the 2026 Partner Formulary — from the signed MSA PDF.

    python3 scripts/extract-formulary.py <msa.pdf> prisma/data/formulary-2026.json

Requires poppler (`brew install poppler`) for pdftotext and pdftoppm.

WHY THIS IS A SCRIPT AND NOT A ONE-OFF
--------------------------------------
The formulary is reissued each year and 692 prices are not something to retype.
Re-running this against next year's PDF is the update path, and the parse
verifies itself against the document's own per-category counts, so a layout
change that breaks extraction fails loudly instead of quietly producing 503
rows that look plausible.

TWO THINGS THE TEXT LAYER GETS WRONG, AND HOW EACH IS HANDLED
-------------------------------------------------------------
1. Column offsets drift a character or two per page, and Provider Cost is
   right-aligned so it drifts most. Slicing by the header's own offsets
   silently dropped 189 of 692 rows. Records are anchored on the PRICE — always
   the last token of a record's first line — and the remaining fields are
   sliced from the page header, where a character of drift is absorbed by
   trimming.

2. The COLD column contains a vector badge with no text at all. A layout
   extraction fills that column with page running-header text that has bled
   sideways, which looks like data and is not. MSA §1.4 gives the flag
   contractual weight, and 35 rows carry a refrigerated BUD *without* the
   badge — so inferring it from the dating text would produce 35 false
   positives. It is read from the rendered page instead: the badge is
   saturated blue, everything else in that column is a grey dash on a white or
   very pale row, and the two are perfectly separated (630 rows at exactly 0
   blue pixels, 62 rows at 549-613).
"""
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from collections import Counter

FIRST_PAGE, LAST_PAGE = 21, 63

HEADERS = ["P R O D U CT", "FORM / ROUTE", "S T R E N GT H", "PAC K AG E",
           "RX / DEA", "BUD", "COLD", "COST"]

# Six price shapes appear in Schedule A-1: $9.99, $99.99, $999.99, $9,999.99,
# $99/ea and "Quote". Requiring two decimals missed the four Orforglipron rows,
# which are priced per each with no cents.
PRICE = re.compile(r"(\$[\d,]+(?:\.\d{2})?(?:/ea)?|Quote)\s*$")

# A section opener: two-digit ordinal then a letter. Two categories are
# initialisms ("02 HRT"), so requiring Title Case folded 216 items into the
# wrong section. The page running header ("01 · WEIGHT MANAG EMENT") fails
# because a bullet follows the number.
CATEGORY = re.compile(r"^\s{2,}(0[1-9]|10)\s+[A-Z][A-Za-z]")

CATEGORY_NAMES = {
    "01": "Weight Management", "02": "HRT", "03": "TRT",
    "04": "Sexual Health", "05": "Hair Loss", "06": "Pain Management",
    "07": "Skin Care", "08": "Wellness · Vitality",
    "09": "Wellness · Longevity", "10": "Supplies",
}

# The document's own contents page. The parse is wrong unless it reproduces
# these exactly.
EXPECTED = {
    "Weight Management": 116, "HRT": 115, "TRT": 101, "Sexual Health": 90,
    "Hair Loss": 39, "Pain Management": 15, "Skin Care": 50,
    "Wellness · Vitality": 69, "Wellness · Longevity": 43, "Supplies": 54,
}

CLASS = re.compile(r"^(COMPOUNDED|NON-COMPOUNDED|SUPPLY)$")
FOOTER = re.compile(r"MediCraft Pharmacy|Page \d+ of \d+|Compounded medications are not")

# The BUD column is where the running header bleeds sideways. Keep only the
# leading run that is a valid dating expression; the column has a small closed
# vocabulary, so anything after it is not dating.
BUD_VALUE = re.compile(
    r"^(—|Mfr\. expiry|Per label|(?:\d+ days (?:RT|Refrig|Frozen)\s*)+(?:USP <797>)?)"
)

DPI = 150
SCALE = DPI / 72.0
BADGE_PIXELS = 100  # Between the two clusters, which are 0 and 549+.


def column_bounds(header):
    return [header.index(h) if h != "COST" else header.rindex(h) for h in HEADERS]


def cut(line, cols, upto):
    """Fields 0..6, stopping before the price."""
    fields = []
    for i in range(7):
        start = cols[i]
        end = cols[i + 1] if i + 1 < 7 else upto
        fields.append(line[start:end].strip() if start < len(line) else "")
    return fields


def parse_rows(pdf):
    text = subprocess.run(
        ["pdftotext", "-layout", "-f", str(FIRST_PAGE), "-l", str(LAST_PAGE), pdf, "-"],
        capture_output=True, text=True, check=True).stdout

    records, category, cols, current = [], None, None, None

    def flush():
        nonlocal current
        if current and current["product"]:
            records.append(current)
        current = None

    for raw in text.split("\n"):
        if "P R O D U CT" in raw and "COST" in raw:
            cols = column_bounds(raw)
            continue
        if not raw.strip() or FOOTER.search(raw):
            continue

        opener = CATEGORY.match(raw)
        if opener and not PRICE.search(raw):
            category = CATEGORY_NAMES[opener.group(1)]
            continue

        if cols is None:
            continue

        priced = PRICE.search(raw)
        if priced:
            flush()
            f = cut(raw, cols, priced.start())
            current = {
                "category": category, "product": f[0], "klass": None,
                "form": f[1], "strength": f[2], "package": f[3],
                "rxDea": f[4], "bud": f[5], "cold": None, "cost": priced.group(1),
            }
            continue

        if current is None:
            continue

        f = cut(raw, cols, len(raw))
        if CLASS.match(f[0]):
            current["klass"] = f[0]
            f[0] = ""
        for key, value in zip(
            ["product", "form", "strength", "package", "rxDea", "bud", "cold"], f
        ):
            if value and key != "cold":
                current[key] = (current[key] + " " + value).strip()

    flush()

    for r in records:
        for k in ("product", "form", "strength", "package", "rxDea", "bud"):
            r[k] = re.sub(r"\s+", " ", r[k]).strip()
        m = BUD_VALUE.match(r["bud"])
        r["bud"] = m.group(1).strip() if m else ""
        if r["bud"] == "—":
            r["bud"] = ""

    return records


def read_ppm(path):
    with open(path, "rb") as fh:
        data = fh.read()
    parts, i = [], 0
    while len(parts) < 4:
        while data[i:i + 1].isspace():
            i += 1
        if data[i:i + 1] == b"#":
            while data[i:i + 1] != b"\n":
                i += 1
            continue
        j = i
        while not data[j:j + 1].isspace():
            j += 1
        parts.append(data[i:j])
        i = j
    return int(parts[1]), int(parts[2]), data[i + 1:]


def is_badge(r, g, b):
    """Saturated blue. Not a grey dash, not a pale alternating row stripe."""
    return b > 120 and b - r > 60 and b - g > 40


def scan_badges(pdf):
    """Blue-pixel count in the COLD column for every priced row, in document order."""
    found = []

    for page in range(FIRST_PAGE, LAST_PAGE + 1):
        xml = subprocess.run(
            ["pdftotext", "-bbox-layout", "-f", str(page), "-l", str(page), pdf, "-"],
            capture_output=True, text=True, check=True).stdout
        root = ET.fromstring(xml.replace('xmlns="http://www.w3.org/1999/xhtml"', ""))

        words = [
            (float(w.get("xMin")), float(w.get("yMin")), float(w.get("xMax")),
             float(w.get("yMax")), (w.text or "").strip())
            for w in root.iter("word")
        ]
        header = [w for w in words if w[4] == "COLD"]
        rows = [w for w in words if PRICE.match(w[4])]
        if not header or not rows:
            continue

        cx0, cx1 = header[0][0] - 10, header[0][2] + 14
        ppm = f"/tmp/_formulary_{page}"
        subprocess.run(["pdftoppm", "-r", str(DPI), "-f", str(page), "-l", str(page),
                        "-singlefile", pdf, ppm], check=True)
        width, height, px = read_ppm(ppm + ".ppm")

        for _, ymin, _, ymax, token in sorted(rows, key=lambda t: t[1]):
            x0, x1 = int(cx0 * SCALE), int(cx1 * SCALE)
            y0, y1 = int((ymin - 3) * SCALE), int((ymax + 3) * SCALE)
            hits = 0
            for y in range(max(0, y0), min(height, y1)):
                base = y * width * 3
                for x in range(max(0, x0), min(width, x1)):
                    o = base + x * 3
                    if is_badge(px[o], px[o + 1], px[o + 2]):
                        hits += 1
            found.append((token, hits))

        subprocess.run(["rm", "-f", ppm + ".ppm"], check=True)

    return found


def main():
    pdf, out = sys.argv[1], sys.argv[2]

    records = parse_rows(pdf)
    badges = scan_badges(pdf)

    if len(badges) != len(records):
        sys.exit(f"FAIL: {len(records)} parsed rows but {len(badges)} rendered rows")

    # Both sequences are in document order, so they zip — and the price token is
    # carried through as a checksum on that assumption rather than a hope.
    for record, (token, hits) in zip(records, badges):
        if token != record["cost"]:
            sys.exit(f"FAIL: row alignment lost at {record['product']!r} ({token} vs {record['cost']})")
        record["cold"] = hits > BADGE_PIXELS

    got = Counter(r["category"] for r in records)
    problems = [f"{c}: got {got.get(c, 0)}, document says {n}"
                for c, n in EXPECTED.items() if got.get(c, 0) != n]
    if problems:
        sys.exit("FAIL: category counts do not match the formulary's contents page\n  "
                 + "\n  ".join(problems))

    with open(out, "w") as fh:
        json.dump(records, fh, indent=1, ensure_ascii=False)
        fh.write("\n")

    print(f"{len(records)} items → {out}")
    print(f"  {sum(1 for r in records if r['cold'])} cold-chain")
    print(f"  {sum(1 for r in records if r['cost'] == 'Quote')} priced on quote")
    print(f"  {sum(1 for r in records if 'C-' in r['rxDea'])} controlled")
    for c, n in EXPECTED.items():
        print(f"  {got[c]:4}  {c}")


if __name__ == "__main__":
    main()
