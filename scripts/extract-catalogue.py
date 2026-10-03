#!/usr/bin/env python3
"""
Turn the 2026 catalogue spreadsheet into prisma/data/catalogue-2026.json.

    python3 scripts/extract-catalogue.py "<catalogue.xlsx>" prisma/data/catalogue-2026.json

No third-party dependency: an .xlsx is a zip of XML, and scripts/_xlsx.py reads
it with the standard library.

WHY THE SPREADSHEET AND NOT THE SIGNED PDF
------------------------------------------
Both describe the same 692 items and they agree on every count — same 10
quote-priced items, same 62 cold-chain items. The spreadsheet wins because it
carries Route as its own column, Provider Price as a number rather than a
formatted string, and Cold Shipping as an explicit Yes/No instead of a vector
badge with no text layer. It is also cleaner: extracting from the PDF left a
page heading glued to the end of a few product names ("with Pregnenolone 90
items Troch"), which the spreadsheet does not have.

prisma/data/formulary-2026.json stays as the record of what the signed document
says. This file is what the catalogue is built from.

THE SPREADSHEET IS A REAL SPREADSHEET
-------------------------------------
Ten sheets, three different header spellings for the same column (one still
says "Hallandale Cost"), headers on row 0 or row 1 depending on the sheet, and
a scattering of one-off typos: "Non Compounded", "cream", "CIV", and an "IM l
IV Injection" with a lowercase L where a pipe belongs. Each is normalised
below, and each normalisation is listed so the next person can see what was
changed rather than wondering whether the data was always this tidy.
"""
import json
import re
import sys
from collections import Counter

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from _xlsx import Workbook  # noqa: E402

# One logical column, several spellings across the ten sheets.
ALIASES = {
    "category": ["Product Category"],
    "klass":    ["Product Class"],
    "name":     ["Description", "Medication / Description"],
    "form":     ["Form"],
    "route":    ["Route"],
    "strength": ["Strength"],
    "package":  ["Package / Fill Volume"],
    "rx":       ["RX/ OTC", "RX/OTC"],
    "dea":      ["DEA Schedule"],
    "bud":      ["BUD"],
    "cost":     ["Provider Price", "Provider Cost", "Hallandale Cost"],
    "cold":     ["Cold Shipping Required"],
}

# Sheet name -> the category slug seeded by the product-categories migration.
CATEGORY_SLUGS = {
    "Weight Management": "weight-management",
    "HRT": "hrt",
    "TRT": "trt",
    "Sexual Health": "sexual-health",
    "Hair Loss": "hair-loss",
    "Pain Management": "pain-management",
    "Skin Care": "skin-care",
    "Wellness - Vitality": "wellness-vitality",
    "Wellness - Longevity": "wellness-longevity",
    "Supplies": "supplies",
}

EXPECTED_TOTAL = 692

# Typos, each seen in the source and each corrected to the spelling the same
# column uses everywhere else.
FIX_CLASS = {"Non Compounded": "Non-Compounded"}
FIX_DEA = {"CIV": "C-IV", "": "NC"}
FIX_ROUTE = {
    "IM |SQ Injection": "IM | SQ Injection",
    "IM l IV Injection": "IM | IV Injection",   # lowercase L, not a pipe
    "N/A": "",
}


def title_form(value):
    """`cream` appears three times where `Cream` appears eighty-four."""
    return value[:1].upper() + value[1:] if value else value


def parse_price(raw):
    """
    Returns (amount, quote_only).

    Four Orforglipron rows are priced "$16/ea" — a number with a unit stuck to
    it. Ten rows are blank, which is the spreadsheet's way of saying what the
    printed formulary spells "Quote".
    """
    value = (raw or "").strip()
    if not value:
        return None, True
    digits = re.sub(r"[^0-9.]", "", value)
    if not digits:
        return None, True
    return round(float(digits), 4), False


def slugify(*parts):
    joined = " ".join(p for p in parts if p)
    slug = re.sub(r"[^a-z0-9]+", "-", joined.lower()).strip("-")
    return slug[:90] or "item"


def main():
    src, out = sys.argv[1], sys.argv[2]
    wb = Workbook(src)

    items, notes = [], Counter()

    for sheet, part in wb.sheets:
        rows = list(wb.rows(part))
        header_row = next(
            (i for i, r in enumerate(rows[:6]) if any("Product Category" in c for c in r)),
            None,
        )
        if header_row is None:
            sys.exit(f"FAIL: no header row on sheet {sheet!r}")

        header = rows[header_row]
        index = {
            key: next((i for i, c in enumerate(header) if c.strip() in names), None)
            for key, names in ALIASES.items()
        }
        missing = [k for k, v in index.items() if v is None]
        if missing:
            sys.exit(f"FAIL: sheet {sheet!r} has no column for {missing}")

        for row in rows[header_row + 1:]:
            def cell(key):
                i = index[key]
                return row[i].strip() if i is not None and i < len(row) else ""

            name = cell("name")
            if not name:
                continue

            klass = cell("klass")
            if klass in FIX_CLASS:
                notes[f"class {klass!r} -> {FIX_CLASS[klass]!r}"] += 1
                klass = FIX_CLASS[klass]

            form = cell("form")
            if form and form != title_form(form):
                notes[f"form {form!r} -> {title_form(form)!r}"] += 1
                form = title_form(form)

            route = cell("route")
            if route in FIX_ROUTE:
                notes[f"route {route!r} -> {FIX_ROUTE[route]!r}"] += 1
                route = FIX_ROUTE[route]

            dea = cell("dea")
            if dea in FIX_DEA:
                notes[f"dea {dea!r} -> {FIX_DEA[dea]!r}"] += 1
                dea = FIX_DEA[dea]

            cold_raw = cell("cold").strip().lower()
            if cold_raw not in ("yes", "no"):
                notes[f"cold {cold_raw!r} -> No"] += 1
            cold = cold_raw == "yes"

            price, quote_only = parse_price(cell("cost"))

            items.append({
                "categorySlug": CATEGORY_SLUGS[sheet],
                "categoryName": sheet,
                "productClass": klass,
                "name": name,
                "form": form,
                "route": route,
                "strength": cell("strength"),
                "packageSize": cell("package"),
                "rxStatus": cell("rx"),
                "deaSchedule": dea,
                "bud": cell("bud"),
                "coldChain": cold,
                "providerPrice": price,
                "isQuoteOnly": quote_only,
            })

    if len(items) != EXPECTED_TOTAL:
        sys.exit(f"FAIL: {len(items)} rows, expected {EXPECTED_TOTAL}")

    # A distinct orderable item is a name in a form, by a route, at a strength,
    # in a pack. Fifteen pairs share everything but the form — a troche and a
    # capsule of the same combination at different prices — so dropping form
    # from the key would silently discard one of each pair.
    seen = Counter()
    for item in items:
        base = slugify(item["name"], item["form"], item["strength"], item["packageSize"])
        seen[base] += 1
        item["slug"] = base if seen[base] == 1 else f"{base}-{seen[base]}"

    collisions = sum(1 for c in seen.values() if c > 1)

    with open(out, "w") as fh:
        json.dump(items, fh, indent=1, ensure_ascii=False)
        fh.write("\n")

    print(f"{len(items)} items -> {out}")
    print(f"  {sum(1 for i in items if i['coldChain'])} cold-chain")
    print(f"  {sum(1 for i in items if i['isQuoteOnly'])} priced on quote")
    print(f"  {sum(1 for i in items if i['deaSchedule'].startswith('C-'))} controlled")
    print(f"  {collisions} slugs needed a suffix to stay unique")
    print("\n  by category:")
    for cat, n in Counter(i["categoryName"] for i in items).most_common():
        print(f"    {n:5}  {cat}")
    if notes:
        print("\n  source values normalised:")
        for note, n in notes.most_common():
            print(f"    {n:5}  {note}")


if __name__ == "__main__":
    main()
