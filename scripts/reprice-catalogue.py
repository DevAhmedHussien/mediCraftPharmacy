#!/usr/bin/env python3
"""
Carry a reissued formulary's Provider Cost into the catalogue.

    python3 scripts/reprice-catalogue.py \
        prisma/data/catalogue-2026.json \
        prisma/data/formulary-2026.json \
        prisma/data/formulary-2027.json \
        prisma/data/catalogue-2027.json

WHY NOT RE-RUN extract-catalogue.py
-----------------------------------
The 2027 reissue (MSA v2027.1, 20 November 2026) came as the signed PDF only.
Its Schedule A-1 is the 2026 formulary item for item — same 692 rows, same
order, same strength, package, BUD, DEA and cold-chain columns — with 193
Provider Costs raised. The spreadsheet that accompanied it is a different
list (577 finished products with MC-nnn codes and no categories), not a
reissue of the catalogue workbook. So the catalogue keeps every field it had
and takes only the new prices.

ROWS ARE MATCHED BY POSITION WITHIN A CATEGORY, and the match is checked:
every row must have the same price in the catalogue and the OLD formulary
(to the cent, since the PDF prints cents and the spreadsheet carried four
decimals). A row whose price did not change keeps the catalogue's own value,
so $3.3333 is not rounded to $3.33 by a reissue that never touched it.
"""
import json
import sys
from collections import defaultdict


def cost(raw):
    """(amount, quote_only) from a printed Provider Cost: $1,234.50, $16/ea, Quote."""
    if raw == "Quote":
        return None, True
    return round(float(raw.replace("$", "").replace(",", "").replace("/ea", "")), 4), False


def by_category(rows, key):
    groups = defaultdict(list)
    for row in rows:
        groups[key(row)].append(row)
    return groups


def main():
    catalogue_path, old_path, new_path, out = sys.argv[1:5]
    catalogue = json.load(open(catalogue_path))
    old = json.load(open(old_path))
    new = json.load(open(new_path))

    if not (len(catalogue) == len(old) == len(new)):
        sys.exit(f"FAIL: {len(catalogue)} catalogue, {len(old)} old, {len(new)} new rows")

    # The workbook spells "Wellness - Vitality"; the PDF "Wellness · Vitality".
    cat = by_category(catalogue, lambda r: r["categoryName"].replace(" - ", " · "))
    before = by_category(old, lambda r: r["category"])
    after = by_category(new, lambda r: r["category"])

    if set(cat) != set(before) or set(before) != set(after):
        sys.exit("FAIL: the three files do not have the same categories")

    changed = 0
    for name, items in cat.items():
        if not (len(items) == len(before[name]) == len(after[name])):
            sys.exit(f"FAIL: {name} has a different number of rows")

        for item, was, now in zip(items, before[name], after[name]):
            if (was["product"], was["strength"]) != (now["product"], now["strength"]):
                sys.exit(f"FAIL: {name}: {was['product']} {was['strength']} moved")

            was_price, was_quote = cost(was["cost"])
            if was_quote != item["isQuoteOnly"] or (
                not was_quote and round(item["providerPrice"], 2) != was_price
            ):
                sys.exit(f"FAIL: {name}: {item['name']} does not match the old formulary")

            if now["cost"] == was["cost"]:
                continue

            item["providerPrice"], item["isQuoteOnly"] = cost(now["cost"])
            changed += 1

    with open(out, "w") as fh:
        json.dump(catalogue, fh, indent=1, ensure_ascii=False)
        fh.write("\n")

    print(f"{len(catalogue)} items, {changed} repriced → {out}")


if __name__ == "__main__":
    main()
