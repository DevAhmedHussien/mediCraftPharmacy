"""Minimal XLSX reader: zipfile + XML, no third-party dependency."""
import zipfile, re, xml.etree.ElementTree as ET

M = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

def col_index(ref):
    letters = re.match(r"([A-Z]+)", ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1

class Workbook:
    def __init__(self, path):
        self.z = zipfile.ZipFile(path)
        self.shared = []
        if "xl/sharedStrings.xml" in self.z.namelist():
            root = ET.fromstring(self.z.read("xl/sharedStrings.xml"))
            for si in root:
                self.shared.append("".join(t.text or "" for t in si.iter(M + "t")))
        wb = ET.fromstring(self.z.read("xl/workbook.xml"))
        rels = ET.fromstring(self.z.read("xl/_rels/workbook.xml.rels"))
        rmap = {r.get("Id"): r.get("Target") for r in rels}
        self.sheets = [(sh.get("name"), "xl/" + rmap[sh.get(R + "id")].lstrip("/"))
                       for sh in wb.find(M + "sheets")]

    def rows(self, part):
        root = ET.fromstring(self.z.read(part))
        for row in root.iter(M + "row"):
            cells, width = {}, 0
            for c in row.iter(M + "c"):
                ref, t = c.get("r"), c.get("t")
                i = col_index(ref)
                v = c.find(M + "v")
                if t == "s" and v is not None:
                    value = self.shared[int(v.text)]
                elif t == "inlineStr":
                    node = c.find(M + "is")
                    value = "".join(x.text or "" for x in node.iter(M + "t")) if node is not None else ""
                else:
                    value = v.text if v is not None else ""
                cells[i] = (value or "").strip()
                width = max(width, i + 1)
            yield [cells.get(i, "") for i in range(width)]
