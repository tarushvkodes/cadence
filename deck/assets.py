"""Copy, crop, and downscale the app screenshots the deck uses into deck/assets/.

The screenshots come from `npm run screens`, which writes them to .audit/screens/.

    .venv/bin/python assets.py --screens ../.audit/screens
"""

import argparse
import pathlib

from PIL import Image

MAX_WIDTH = 2400

# name -> (source file, crop box in source pixels or None for the whole frame)
ASSETS = {
    "today.png": ("today-light-hd.png", None),
    "onboarding.png": ("onboarding-light-desktop.png", (300, 250, 2580, 1675)),
    "promises.png": ("onboarding-promises-light-desktop.png", (400, 330, 2480, 1630)),
    "guide-empty.png": ("guide-empty-light-desktop.png", None),
    "guide-plan.png": ("guide-plan-week-light-desktop.png", (560, 120, 2320, 1220)),
    "plan-ghosts.png": ("plan-suggestions-light-hd.png", (192, 0, 3648, 2160)),
    "day1.png": ("today-period-day-1-light-desktop.png", None),
    "rough.png": ("guide-rough-morning-light-desktop.png", (560, 150, 2320, 1250)),
    "safety.png": ("guide-safety-light-desktop.png", (560, 200, 2320, 1300)),
    "safety-notes.png": ("guide-safety-notes-light-desktop.png", (560, 100, 2320, 1200)),
    "dial-range.png": ("today-light-hd.png", (780, 380, 1760, 1630)),
    "learn-hero.png": ("learn-light-desktop.png", (360, 200, 2160, 950)),
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--screens", required=True, type=pathlib.Path)
    args = parser.parse_args()
    out = pathlib.Path(__file__).parent / "assets"
    out.mkdir(exist_ok=True)
    for name, (source, box) in ASSETS.items():
        image = Image.open(args.screens / source).convert("RGB")
        if box:
            image = image.crop(box)
        if image.width > MAX_WIDTH:
            image = image.resize((MAX_WIDTH, round(image.height * MAX_WIDTH / image.width)), Image.LANCZOS)
        image.save(out / name, optimize=True)
        print(f"{name}: {image.width}x{image.height} from {source}")


if __name__ == "__main__":
    main()
