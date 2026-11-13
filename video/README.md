# Cadence demo film

A motion-graphics demo of Cadence for the CS 110 presentation, built in [Remotion](https://www.remotion.dev/). Every shot of the app is the real app, replaying its recorded agent sessions; nothing on screen is mocked up. Cadence runs in the browser, so the film shows it the way people would use it: on a phone for the personal moments (setup, the dial, the check-in, asking the Guide, a rough morning, the safety case), and on a laptop where a wide view teaches better (approving suggestions and the week plan, the evidence labels, the system prompt).

There are three cuts, all on the same picture and timing:

| File | Audio | Use it when |
| --- | --- | --- |
| `out/cadence-demo.mp4` | Recorded narration, captions, quiet music, interface sounds | Playing the demo as is |
| `out/cadence-demo-music.mp4` | Music and interface sounds, no voice, no captions | Narrating live from `NARRATION.md` |
| `out/cadence-demo-silent.mp4` | None | Adding your own audio in an editor |

Renders are not committed. The commands below rebuild them.

## How it is made

1. **Capture.** `capture/` builds the app, serves it with `vite preview`, and drives each demo flow in Chromium through Playwright, as a 1440 x 900 laptop window at 2x or a 390 x 844 phone at 3x with touch input. Time is fake: Playwright's clock runs the app's timers, and every CSS and Web Animations animation is paused and stepped to the same virtual time, so each frame is exact and the replays are deterministic. Every frame is a full-resolution screenshot piped into ffmpeg. Each take also saves the rects of the elements the film points at, every click, and a few watched values (such as which tool step is running) to `src/data/captures/<take>.json`.
2. **Voice.** The narration was recorded first. `voice/transcribe.ts` gets word times from whisper.cpp; `voice/align.ts` cuts the recording into the film's lines at real pauses and writes `src/data/voice.json`.
3. **Timeline.** `src/timeline.ts` lays the lines end to end, keeps the speaker's own pauses, and adds time where the picture needs it. Every scene, the captions, `NARRATION.md` and the music's cue sheet read it.
4. **Picture.** `src/scenes/` holds one scene per chapter. `src/kit/` holds the shared pieces: the laptop window, the phone (drawn in code, unbranded) and the camera (`AppShot`, `Phone`, `camera.ts`), the pointer and the touch indicator, callouts pinned to app rects, the step titles, captions, and the cycle ring motif. Colours come from the app's own `src/ui/palette.ts`; the glass is the app's own `Glass` component and `glass.css`.
5. **Sound.** `audio/` synthesizes the music bed and the interface sounds in TypeScript. Nothing is sampled.

## Build it from a clean clone

You need Node 20.19 or newer and ffmpeg on your `PATH`.

```sh
git clone https://github.com/tarushvkodes/cadence.git
cd cadence
npm install                       # the app; the capture builds it
npx playwright install chromium   # once, if Playwright has no Chromium yet
cd video
npm install
npm run capture                   # records the eight takes into public/captures (about 15 minutes)
npm run sound                     # music bed and interface sounds into public/audio
npm run render:silent             # out/cadence-demo-silent.mp4
npm run render:music              # out/cadence-demo-music.mp4
```

`npm run capture -- guide-plan rough-phone` records only the named takes.

### The voiced cut

The narration recording is not in the repository. Put it at `public/voice/narration.m4a`, then:

```sh
npm run voice                     # cuts it into lines and writes public/voice/narration.wav
npm run render                    # out/cadence-demo.mp4
```

`voice/words.json` (the word times) and `src/data/voice.json` (the cuts) are committed, so a render of the same recording needs no transcription. For a new recording, transcribe it first. That needs [whisper.cpp](https://github.com/ggml-org/whisper.cpp) (`brew install whisper-cpp`) and a ggml model:

```sh
WHISPER_MODEL=/path/to/ggml-medium.en.bin npx tsx voice/transcribe.ts
```

Then edit `voice/lines.ts` so each line's `heard` text matches the new transcript, and run `npm run voice`, `npm run narration` and `npm run sound` before rendering.

## Working on it

```sh
npm run studio                    # Remotion Studio, to scrub the film
npm run still -- out/f.png --frame=1800 --props='{"variant":"voiced"}'
npm run typecheck
npm run narration                 # rewrite NARRATION.md and audio/cues.json from the timeline
```
