# Cadence demo film

A motion-graphics demo of Cadence for the CS 110 presentation, built in [Remotion](https://www.remotion.dev/). Every shot of the app is the real app, replaying its recorded agent sessions; nothing on screen is mocked up. Cadence runs in the browser, so the film shows it the way people would use it: on a phone for the personal moments (setup, the dial, the check-in, asking the Guide, a rough morning, the safety case), and on a laptop where a wide view teaches better (approving suggestions and the week plan, the evidence labels, the system prompt).

**The narration is a recorded reading.** A narrator read the settled script in one take, and `npm run voice:recorded` cuts that reading into the film's lines. The repository also keeps an earlier pipeline that speaks the script in a cloned voice (`npm run voice`); the film does not use it now.

There are three cuts, all on the same picture and timing:

| File | Audio | Use it when |
| --- | --- | --- |
| `out/cadence-demo.mp4` | Narration, captions, quiet music, interface sounds | Playing the demo as is |
| `out/cadence-demo-music.mp4` | Music and interface sounds, no voice, no captions | Narrating live from `NARRATION.md` |
| `out/cadence-demo-silent.mp4` | None | Adding your own audio in an editor |

Renders are not committed. The commands below rebuild them. `out/v1/` holds version 1's three cuts, when you have them, for comparison.

## How it is made

1. **Script.** `voice/script.ts` is the narration, one entry per line of the settled script with a stable id: what is said (`say`, word for word) and what the captions show (`caption`, with numbers written as numbers). Everything about the voice derives from it.
2. **Voice.** `voice/recorded.ts` cleans the reading (`voice/enhance.sh`, with noise removal capped at 18 dB because full removal smeared consonants on this recording), finds each script line in it from whisper.cpp's word times, cuts between lines at the quietest point, and writes one file per line to `public/voice/lines/` plus the lengths and word times to `src/data/voice.json`. Where the narrator's words differ from the script, the line's `read` entry in `voice/script.ts` holds what was said, and the captions follow it. It then transcribes every cut line and prints the differences. `voice/build.ts` is the earlier cloned-voice builder; it writes the same files.
3. **Capture.** `capture/` builds the app, serves it with `vite preview`, and drives each demo flow in Chromium through Playwright, as a 1440 x 900 laptop window at 2x or a 390 x 844 phone at 3x with touch input. Time is fake: Playwright's clock runs the app's timers, and every CSS and Web Animations animation is paused and stepped to the same virtual time, so each frame is exact and the replays are deterministic. Every frame is a full-resolution screenshot piped into ffmpeg. Each take also saves the rects of the elements the film points at, every click, and a few watched values (such as which tool step is running) to `src/data/captures/<take>.json`.
4. **Timeline.** `src/timeline.ts` lays the lines end to end with a set silence between lines, a longer breath where a new beat starts, and holds where the picture needs time to be read. Every scene, the captions, `NARRATION.md` and the music's cue sheet read it.
5. **Picture.** `src/scenes/` holds one scene per chapter. `src/kit/` holds the shared pieces: the laptop window, the phone (drawn in code, unbranded) and the camera (`AppShot`, `Phone`, `camera.ts`), the pointer and the touch indicator, callouts pinned to app rects, the step titles, captions, and the cycle ring motif. Colours come from the app's own `src/ui/palette.ts`; the glass is the app's own `Glass` component and `glass.css`.
6. **Sound.** `audio/` synthesizes the music bed and the interface sounds in TypeScript. Nothing is sampled.

## Build it from a clean clone

You need Node 20.19 or newer, ffmpeg, [uv](https://docs.astral.sh/uv/), and [whisper.cpp](https://github.com/ggml-org/whisper.cpp) (`brew install whisper-cpp`) with a ggml model, on an Apple Silicon Mac for the voice model.

```sh
git clone https://github.com/tarushvkodes/cadence.git
cd cadence
npm install                       # the app; the capture builds it
npx playwright install chromium   # once, if Playwright has no Chromium yet
cd video
npm install
npm run capture                   # records the eight takes into public/captures (about 25 minutes)
```

The reading is not in the repository; put it at `public/voice/recorded.m4a`. Then one command cleans it, cuts it into lines and checks them:

```sh
WHISPER_MODEL=/path/to/ggml-medium.en.bin npm run voice:recorded
```

Then the timings, the sound and the three cuts:

```sh
npm run narration                 # NARRATION.md and audio/cues.json from the timeline
npm run sound                     # music bed and interface sounds into public/audio
npm run render                    # out/cadence-demo.mp4
npm run render:music              # out/cadence-demo-music.mp4
npm run render:silent             # out/cadence-demo-silent.mp4
```

`npm run capture -- guide-plan rough-phone` records only the named takes.

## Check it

```sh
npm run check:voice               # cuts out/cadence-demo.mp4 at every line and checks each against the script with whisper
npm run render:voice              # out/cadence-demo-voice.wav, the narration alone as the film plays it, for loudness checks
npm run typecheck
```

`npm run check:voice -- out/other.mp4` checks another render. The voice track should read about -16 LUFS integrated (`ffmpeg -i out/cadence-demo-voice.wav -af ebur128=peak=true -f null -`).

## Working on it

```sh
npm run studio                    # Remotion Studio, to scrub the film
npm run still -- out/f.png --frame=1800 --props='{"variant":"voiced"}'
```

To change the narration, record a new reading of the whole script and run `npm run voice:recorded` again. A single line cannot be patched in a recorded take.
