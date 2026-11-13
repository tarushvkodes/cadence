# Cadence capstone deck

`Cadence-Capstone.pptx` is the slide deck for our Purdue CS 110 AI Solutions Showcase talk. `Cadence-Capstone.pdf` is the same deck for quick viewing. Every slide has its script in the speaker notes. The same script, with the speaker split and time targets, is in [`docs/SCRIPT.md`](../docs/SCRIPT.md). The sources are in [`docs/REFERENCES.md`](../docs/REFERENCES.md).

## Open and edit the deck

Every slide is real text and shapes, so you can edit anything. Screenshots are pictures in rounded frames.

The deck uses three free Google Fonts: **Instrument Serif** for titles, **Inter** for body text, and **JetBrains Mono** for the terminal commands on slide 26.

- **Google Slides.** Upload the `.pptx` to Google Drive and open it with Google Slides. All three fonts are Google Fonts, so Slides should find them by name. We have not tested this import ourselves, so check a few slides after you open it.
- **PowerPoint or Keynote.** Install the three fonts first, from [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif), [Inter](https://fonts.google.com/specimen/Inter), and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono). Without them, the app swaps in other fonts and text can wrap differently.

### Add the demo film

Slide 19 has a dashed box where the film goes.

1. Delete the dashed box.
2. In PowerPoint or Keynote, insert `video/out/cadence-demo.mp4` with **Insert > Video**. In Google Slides, upload the MP4 to Google Drive first, then use **Insert > Video > Google Drive**.
3. Size the video to the box's old position: 8.3 in wide, 0.75 in from the left, 1.95 in from the top.

## Rebuild the deck

You need Node.js 20 or newer, Python 3.11 or newer, and LibreOffice for the PDF and the slide images.

```sh
cd deck
npm install
npm run build
python3 check.py
```

`npm run build` writes `Cadence-Capstone.pptx`, `../docs/SCRIPT.md`, and `../docs/REFERENCES.md`, and prints how long each part runs at 140 words a minute. `check.py` fails if any XML part is malformed, a slide has no speaker notes, any text has an em or en dash, or a slide uses a font outside the three above.

To render the PDF and one PNG per slide into `out/slides/`:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python render.py
```

Headless LibreOffice on macOS finds fonts through its own fontconfig, which skips `~/Library/Fonts`. `render.py` writes a temporary `fonts.conf` that adds the macOS font folders, so the PDF uses the real fonts.

A rebuild overwrites `Cadence-Capstone.pptx`. If you change words in the slide files, rebuild. If you edit the `.pptx` by hand instead, don't rebuild afterwards, or you lose those edits.

### Refresh the screenshots

The screenshots come from the app. With `npm run dev` running at the repo root, run `npm run screens` there. Then, in `deck/`:

```sh
.venv/bin/python assets.py --screens ../.audit/screens
npm run build
```

## How the build is organized

| Path | Contents |
| --- | --- |
| `build.mjs` | Defines the three slide layouts, builds every slide, and writes the deck and both docs. |
| `slides/*.mjs` | One file per part of the talk. Each slide spec holds its layout code, its speaker, and its notes. |
| `lib/tokens.mjs` | Colors, fonts, and the grid, taken from the app's light theme in `src/ui/palette.ts`. |
| `lib/draw.mjs` | Shared shapes: cards, screenshot frames, the cycle ring, and the comparison marks. |
| `lib/sources.mjs` | Every cited source. Slides cite sources by key, and the build fails on an unknown key. |
| `lib/finish.mjs` | Writes the Cadence palette into the theme, rounds screenshot corners, and rounds the ring's line caps. |
| `lib/docs.mjs` | Writes `docs/SCRIPT.md` and `docs/REFERENCES.md`. |
| `assets.py` | Crops and downscales the app screenshots into `assets/`. |
| `check.py` | Checks the built `.pptx` with the Python standard library only. |
| `render.py` | Renders the PDF and the slide PNGs through LibreOffice. |
