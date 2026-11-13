"""Render Cadence-Capstone.pptx through LibreOffice to Cadence-Capstone.pdf, then one PNG per slide.

    .venv/bin/python render.py                     # PNGs in out/slides/
    .venv/bin/python render.py --png-dir DIR       # PNGs somewhere else

Set SOFFICE if LibreOffice is not at the default macOS path.
"""

import argparse
import os
import pathlib
import shutil
import subprocess
import tempfile

import pymupdf

HERE = pathlib.Path(__file__).resolve().parent
DECK = HERE / "Cadence-Capstone.pptx"
PDF = HERE / "Cadence-Capstone.pdf"
SOFFICE = os.environ.get("SOFFICE", "/Applications/LibreOffice.app/Contents/MacOS/soffice")
FONT_DIRS = ["~/Library/Fonts", "/Library/Fonts", "/System/Library/Fonts"]


def fontconfig(tmp: pathlib.Path) -> dict[str, str]:
    """Headless LibreOffice finds fonts through its bundled fontconfig, which skips the macOS font folders."""
    bundled = pathlib.Path(SOFFICE).resolve().parents[1] / "Resources" / "fonts" / "truetype"
    dirs = "".join(f"<dir>{pathlib.Path(d).expanduser()}</dir>" for d in [*FONT_DIRS, str(bundled)])
    conf = tmp / "fonts.conf"
    conf.write_text(f'<?xml version="1.0"?><fontconfig>{dirs}<cachedir>{tmp / "fc-cache"}</cachedir></fontconfig>')
    return {**os.environ, "FONTCONFIG_FILE": str(conf)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--png-dir", type=pathlib.Path, default=HERE / "out" / "slides")
    parser.add_argument("--width", type=int, default=1920)
    args = parser.parse_args()

    with tempfile.TemporaryDirectory() as tmp:
        profile = pathlib.Path(tmp) / "profile"
        subprocess.run(
            [SOFFICE, f"-env:UserInstallation={profile.as_uri()}", "--headless", "--convert-to", "pdf", "--outdir", tmp, str(DECK)],
            check=True,
            capture_output=True,
            timeout=600,
            env=fontconfig(pathlib.Path(tmp)),
        )
        shutil.copy(pathlib.Path(tmp) / PDF.name, PDF)

    args.png_dir.mkdir(parents=True, exist_ok=True)
    for old in args.png_dir.glob("slide-*.png"):
        old.unlink()
    doc = pymupdf.open(PDF)
    for number, page in enumerate(doc, 1):
        zoom = args.width / page.rect.width
        page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom)).save(args.png_dir / f"slide-{number:02d}.png")
    print(f"{PDF.name}: {len(doc)} pages. PNGs in {args.png_dir}")


if __name__ == "__main__":
    main()
