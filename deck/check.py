"""Check Cadence-Capstone.pptx without PowerPoint. Uses only the standard library.

    python3 check.py

Fails if any XML part is malformed, a relationship points at a missing part, a slide has no
speaker notes, any text uses an em or en dash, or a slide names a font outside the three the
README asks people to install.
"""

import posixpath
import re
import sys
import zipfile
from xml.dom import minidom

DECK = __file__.rsplit("/", 1)[0] + "/Cadence-Capstone.pptx"
FONTS = {"Instrument Serif", "Inter", "JetBrains Mono"}
DASHES = {"—": "em dash", "–": "en dash"}


def texts(xml: str) -> list[str]:
    return [node.firstChild.data for node in minidom.parseString(xml).getElementsByTagName("a:t") if node.firstChild]


def rels(zf: zipfile.ZipFile, part: str) -> dict[str, str]:
    folder, name = posixpath.split(part)
    path = f"{folder}/_rels/{name}.rels"
    if path not in zf.namelist():
        return {}
    out = {}
    for rel in minidom.parseString(zf.read(path)).getElementsByTagName("Relationship"):
        if rel.getAttribute("TargetMode") == "External":
            continue
        out[rel.getAttribute("Id")] = posixpath.normpath(posixpath.join(folder, rel.getAttribute("Target")))
    return out


def main() -> int:
    problems = []
    zf = zipfile.ZipFile(DECK)
    names = set(zf.namelist())

    xml_parts = [n for n in names if n.endswith((".xml", ".rels"))]
    for name in xml_parts:
        try:
            minidom.parseString(zf.read(name))
        except Exception as error:  # noqa: BLE001
            problems.append(f"{name}: not well-formed XML ({error})")

    for name in xml_parts:
        if name.endswith(".rels"):
            continue
        for rid, target in rels(zf, name).items():
            if target not in names:
                problems.append(f"{name}: {rid} points at missing {target}")

    pres_rels = rels(zf, "ppt/presentation.xml")
    order = [pres_rels[s.getAttribute("r:id")] for s in minidom.parseString(zf.read("ppt/presentation.xml")).getElementsByTagName("p:sldId")]

    fonts_seen = set()
    for number, slide in enumerate(order, 1):
        slide_xml = zf.read(slide).decode()
        fonts_seen |= set(re.findall(r'<a:latin typeface="([^"]+)"', slide_xml))
        notes = [t for t in rels(zf, slide).values() if "notesSlides" in t]
        note_text = " ".join(texts(zf.read(notes[0]).decode())) if notes else ""
        if len(note_text.split()) < 4:
            problems.append(f"slide {number}: no speaker notes")
        for text in texts(slide_xml) + [note_text]:
            for dash, label in DASHES.items():
                if dash in text:
                    problems.append(f"slide {number}: {label} in {text[:60]!r}")

    stray = fonts_seen - FONTS
    if stray:
        problems.append(f"fonts outside the install list: {sorted(stray)}")

    print(f"{len(xml_parts)} XML parts parsed, {len(order)} slides, fonts used: {sorted(fonts_seen)}")
    for problem in problems:
        print(f"FAIL {problem}")
    if not problems:
        print("OK: every slide has notes, no dashes, all parts well-formed and linked.")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
