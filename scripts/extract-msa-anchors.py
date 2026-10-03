#!/usr/bin/env python3
"""
Find the e-signature anchor tags in the MSA template and record where they are.

    python3 scripts/extract-msa-anchors.py assets/msa/msa-2026-template.pdf \
        lib/msa-anchors.json

WHY A BUILD STEP
----------------
The template carries twenty text tags — \\c_legalname\\, \\c_sig\\, \\m_date\\
and so on — which is the convention SignEasy and DocuSign both scan a document
for. They are the right anchors for us too: they mark exactly where a value
belongs, in the designer's own layout.

pdf-lib can draw at a coordinate but cannot find text, and `pdftotext
-bbox-layout` can find text but not draw. So the coordinates are extracted once
here, checked into the repo, and read at runtime. Re-run it whenever the
template is reissued; the generator asserts every anchor it needs is present,
so a moved tag fails loudly rather than printing a client's name into the
margin.

COORDINATES ARE PDF-SPACE, NOT SCREEN-SPACE. pdftotext reports y from the TOP
of the page; pdf-lib draws from the BOTTOM. The conversion happens here, once,
so nothing downstream has to remember which way up it is.
"""
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

# Case-insensitive on purpose. The 2026 FINAL template introduced
# \c_sig_exA\ and its three siblings on the Exhibit A acceptance page; a
# lowercase-only pattern skipped them silently, and a skipped anchor is an
# unfilled field nobody notices until a partner has signed an agreement whose
# acceptance block is blank.
TAG = re.compile(r"^\\([A-Za-z0-9_]+)\\$")

# The first page that can move when the partner's own schedule is inserted.
# Contents entries pointing before this are in the agreement body, which is
# always ahead of the insert.
FIRST_EXHIBIT_PAGE = 14


def main():
    pdf, out = sys.argv[1], sys.argv[2]

    xml = subprocess.run(
        ["pdftotext", "-bbox-layout", pdf, "-"],
        capture_output=True, text=True, check=True,
    ).stdout
    root = ET.fromstring(xml.replace('xmlns="http://www.w3.org/1999/xhtml"', ""))

    anchors = {}
    pages = []
    footers = []
    toc = []

    for index, page in enumerate(root.iter("page"), start=1):
        height = float(page.get("height"))
        width = float(page.get("width"))
        pages.append({"page": index, "width": width, "height": height})

        # The running footer, so the generator can renumber it. A 66-page
        # template that becomes a 20-page agreement must not keep telling the
        # signer it is page 13 of 66.
        words = list(page.iter("word"))
        for i, word in enumerate(words):
            if (word.text or "").strip() != "Page":
                continue
            tail = [(w.text or "").strip() for w in words[i : i + 4]]
            if len(tail) == 4 and tail[2] == "of":
                footers.append({
                    "page": index,
                    "x": round(float(word.get("xMin")), 2),
                    "y": round(height - float(word.get("yMax")), 2),
                    "height": round(float(word.get("yMax")) - float(word.get("yMin")), 2),
                    "endX": round(float(words[i + 3].get("xMax")), 2),
                })
                break

        # The contents page, so the generator can renumber it too.
        #
        # Every entry ends in the page it points at, and those numbers are
        # baked artwork. Inserting the partner's own pricing ahead of the
        # formulary moves everything after it, and a contract whose contents
        # page points one page short is a defect of the same kind as a footer
        # still claiming "of 66" — it is just harder to notice.
        #
        # LINE-AWARE, NOT SHAPE-AWARE. A first attempt took every right-hand
        # integer on the page and picked up the section numbers ("11
        # Confidentiality 9") as well as the destinations. So words are
        # grouped into lines by their baseline and only the LAST number on
        # each line is a destination — which is what a leader-dotted contents
        # line means by construction.
        #
        # Only destinations at or past the first exhibit are kept. Everything
        # in the body is ahead of the insert and cannot move, and recording a
        # number that never changes invites a future edit to "fix" it.
        if any((w.text or "").strip() == "CONTENTS" for w in words):
            lines = {}
            for word in words:
                key = round(float(word.get("yMin")), 1)
                lines.setdefault(key, []).append(word)

            for _, line_words in lines.items():
                line_words.sort(key=lambda w: float(w.get("xMin")))
                numeric = [w for w in line_words if (w.text or "").strip().isdigit()]
                if not numeric:
                    continue
                last = numeric[-1]
                target = int((last.text or "").strip())
                if target < FIRST_EXHIBIT_PAGE or target > len(list(root.iter("page"))):
                    continue
                y_max = float(last.get("yMax"))
                toc.append({
                    "page": index,
                    "target": target,
                    "x": round(float(last.get("xMin")), 2),
                    "y": round(height - y_max, 2),
                    "endX": round(float(last.get("xMax")), 2),
                    "height": round(y_max - float(last.get("yMin")), 2),
                })

        for word in page.iter("word"):
            match = TAG.match((word.text or "").strip())
            if not match:
                continue

            x_min = float(word.get("xMin"))
            y_min = float(word.get("yMin"))
            y_max = float(word.get("yMax"))

            anchors[match.group(1)] = {
                "page": index,
                "x": round(x_min, 2),
                # pdftotext measures down from the top; pdf-lib measures up
                # from the bottom. Convert once, here.
                "y": round(height - y_max, 2),
                "width": round(float(word.get("xMax")) - x_min, 2),
                "height": round(y_max - y_min, 2),
            }

    if not anchors:
        sys.exit("FAIL: no \\tag\\ anchors found — is this the tagged template?")

    with open(out, "w") as fh:
        json.dump(
            {"pageCount": len(pages), "anchors": anchors, "footers": footers, "toc": toc},
            fh,
            indent=1,
        )
        fh.write("\n")

    print(
        f"{len(anchors)} anchors, {len(footers)} page footers and {len(toc)} "
        f"contents entries across {len(pages)} pages -> {out}\n"
    )
    for name, a in sorted(anchors.items(), key=lambda kv: (kv[1]["page"], -kv[1]["y"])):
        print(f"  p{a['page']:<3} {name:<16} x={a['x']:<7} y={a['y']:<7} w={a['width']}")


if __name__ == "__main__":
    main()
