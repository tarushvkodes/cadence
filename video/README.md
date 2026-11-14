# Cadence demo film

A motion-graphics demo of Cadence for the CS 110 presentation, built in [Remotion](https://www.remotion.dev/). Every shot of the app is the real app, replaying its recorded agent sessions; nothing on screen is mocked up. Cadence runs in the browser, so the film shows it the way people would use it: on a phone for the personal moments (setup, the dial, the check-in, asking the Guide, a rough morning, the safety case), and on a laptop where a wide view teaches better (approving suggestions and the week plan, the evidence labels, the system prompt).

**The narration is an AI voice clone.** A team member recorded the film's first narration; the voice you hear now is a clone of that voice, made with his consent, speaking the settled script. The end card says so.

There are three cuts, all on the same picture and timing:

| File | Audio | Use it when |
| --- | --- | --- |
| `out/cadence-demo.mp4` | Cloned narration, captions, quiet music, interface sounds | Playing the demo as is |
| `out/cadence-demo-music.mp4` | Music and interface sounds, no voice, no captions | Narrating live from `NARRATION.md` |
| `out/cadence-demo-silent.mp4` | None | Adding your own audio in an editor |

Renders are not committed. The commands below rebuild them. `out/v1/` holds version 1's three cuts, when you have them, for comparison.

## How it is made

1. **Script.** `voice/script.ts` is the narration, one entry per line of the settled script with a stable id: what is said (`say`, word for word) and what the captions show (`caption`, with numbers written as numbers). Everything about the voice derives from it.
2. **Voice.** `voice/build.ts` speaks every line in the cloned voice with Qwen3-TTS on MLX (`voice/tts.py`), then checks each take with whisper.cpp (`voice/verify.ts`): the words heard must match the script after numbers are spelled out, also with a quiet noise floor under the take; the pace must be 2.7 to 3.8 words a second; no pause inside a line may run past 0.75 s; and the take must not end cut off. Among the passing takes of a line it keeps the one nearest 3.2 words a second. `voice/takes.json` records every attempt and the chosen seed (with a reason where one was chosen by hand), so a rebuild speaks only the chosen takes and verifies them again. The finished lines go to `public/voice/lines/` at -16 LUFS, and their lengths and word times to `src/data/voice.json`.
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

The voice clone needs the narrator's original recording as its reference. It is not in the repository; put it at `public/voice/narration.m4a`. Then one command speaks and checks the whole narration:

```sh
WHISPER_MODEL=/path/to/ggml-medium.en.bin npm run voice
```

The first run downloads the voice model (about 3 GB) and, with no `voice/takes.json`, searches seeds for every line, which takes about 15 minutes. With the committed `voice/takes.json` it speaks only the chosen takes and checks them again, about two minutes. It stops with the line and the reason if any line has no passing take.

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

To change a line, edit `voice/script.ts` and run `npm run voice`; only that line is searched again. A line can carry a `phrasing`: the same words with punctuation that paces the voice model (the build refuses one that changes a word). Words the model misreads are respelled for it in `RESPELL` (`Claude` is spoken as "Clawd"); the words heard back are still checked against the script.

Only clone a voice with that person's consent, and say so wherever the clone is heard.
