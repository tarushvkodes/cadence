import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCRIPT } from './script.ts';
import { alignTokens, diff, normalize, transcribe } from './verify.ts';

/**
 * `npm run voice:recorded`: turns one continuous reading of the script (`public/voice/recorded.m4a`)
 * into the film's voice track. It cleans the recording, finds each script line in it with whisper's
 * word times, cuts between lines at the quietest point, and writes one file per line plus
 * `src/data/voice.json`, the same shape `npm run voice` writes for the cloned voice. The timeline
 * spaces the lines for the picture, so the reader's own pauses between lines do not matter.
 */

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const RECORDING = here('../public/voice/recorded.m4a');
const CLEAN = here('../public/voice/recorded.wav');
const LINES = here('../public/voice/lines');
const OUT = here('../src/data/voice.json');

/** dB of noise removal. Full removal on this recording cost more words to whisper than 12 or 18 dB did. */
const ATTEN = '18';
const FRAME = 0.01;
const RATE = 48000;
const r2 = (n: number) => Math.round(n * 100) / 100;

if (!existsSync(RECORDING)) throw new Error(`put the narrator's reading at ${RECORDING}`);
execFileSync('sh', [here('enhance.sh'), RECORDING, CLEAN], { stdio: 'inherit', env: { ...process.env, ATTEN } });

/** Loudness of the cleaned recording in 10 ms frames, in dB. */
function envelope(): number[] {
  const pcm = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', CLEAN, '-f', 's16le', '-ac', '1', '-ar', String(RATE), '-'], { maxBuffer: 1 << 30 });
  const per = RATE * FRAME;
  const frames: number[] = [];
  for (let i = 0; i + per <= pcm.length / 2; i += per) {
    let sum = 0;
    for (let k = 0; k < per; k++) sum += (pcm.readInt16LE((i + k) * 2) / 32768) ** 2;
    frames.push(10 * Math.log10(sum / per + 1e-12));
  }
  return frames;
}

const env = envelope();
const sorted = [...env].sort((a, b) => a - b);
const floor = sorted[Math.floor(sorted.length * 0.05)] as number;
const QUIET = floor + 9;

/** The longest quiet run between two times, or the single quietest frame when the reader did not pause. */
function quietest(from: number, to: number): { start: number; end: number } {
  const a = Math.max(0, Math.floor(from / FRAME));
  const b = Math.min(env.length - 1, Math.ceil(to / FRAME));
  let best = { start: 0, end: 0 };
  let run = -1;
  for (let i = a; i <= b + 1; i++) {
    const quiet = i <= b && (env[i] as number) < QUIET;
    if (quiet && run < 0) run = i;
    if (!quiet && run >= 0) {
      if (i - run > best.end - best.start) best = { start: run, end: i };
      run = -1;
    }
  }
  if (best.end - best.start >= 4) return { start: best.start * FRAME, end: best.end * FRAME };
  let min = a;
  for (let i = a; i <= b; i++) if ((env[i] as number) < (env[min] as number)) min = i;
  return { start: min * FRAME, end: (min + 1) * FRAME };
}

const heard = transcribe([CLEAN]).get(CLEAN);
if (!heard) throw new Error('whisper heard nothing in the recording');
const heardWord: number[] = [];
const heardTokens = heard.words.flatMap((w, i) => normalize(w.w).map((t) => (heardWord.push(i), t)));
const spoken = (l: (typeof SCRIPT)[number]) => l.read?.say ?? l.say;
const lineOf: number[] = [];
const scriptTokens = SCRIPT.flatMap((l, i) => normalize(spoken(l)).map((t) => (lineOf.push(i), t)));
const pair = alignTokens(scriptTokens, heardTokens);

/** The heard words each line owns: from its first aligned word to the word before the next line's first. */
const firstWord = SCRIPT.map((_, i) => heardWord[pair[lineOf.indexOf(i)] as number] as number);
const wordEnd = (i: number) => (heard.words[i] as { t: number }).t;

const total = env.length * FRAME;
const gaps = SCRIPT.map((_, i) => {
  if (i === 0) return { start: 0, end: (env.findIndex((d) => d >= QUIET) || 0) * FRAME };
  const w = firstWord[i] as number;
  return quietest(wordEnd(w - 1) - 0.15, Math.max(wordEnd(w - 1) + 0.05, wordEnd(w) - 0.12));
});
const lastLoud = env.length - 1 - [...env].reverse().findIndex((d) => d >= QUIET);
gaps.push({ start: (lastLoud + 1) * FRAME, end: total });

mkdirSync(LINES, { recursive: true });
for (const f of readdirSync(LINES)) rmSync(join(LINES, f));

const lines = SCRIPT.map((l, i) => {
  const before = gaps[i] as { start: number; end: number };
  const after = gaps[i + 1] as { start: number; end: number };
  const cutIn = i === 0 ? 0 : (before.start + before.end) / 2;
  const cutOut = i === SCRIPT.length - 1 ? total : (after.start + after.end) / 2;
  const from = Math.max(cutIn, before.end - 0.05);
  const to = Math.min(cutOut, after.start + 0.25);
  const length = to - from;
  const fadeOut = Math.min(0.12, Math.max(0.015, to - after.start));
  const shape = `atrim=${from.toFixed(3)}:${to.toFixed(3)},asetpts=N/SR/TB,afade=t=in:d=0.015,afade=t=out:st=${(length - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)}`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', CLEAN, '-af', shape, '-ar', String(RATE), '-c:a', 'pcm_s24le', join(LINES, `${l.id}.wav`)]);

  const say = normalize(spoken(l));
  const base = lineOf.indexOf(i);
  const sayEnds = say.map((_, k) => wordEnd(heardWord[pair[base + k] as number] as number) - from);
  const shown = (l.read?.caption ?? l.read?.say ?? l.caption ?? l.say).split(/\s+/);
  const owner: number[] = [];
  const capTokens = shown.flatMap((w, k) => normalize(w).map((t) => (owner.push(k), t)));
  const capToSay = alignTokens(capTokens, say);
  const ends = shown.map((_, k) => Math.max(0, ...capToSay.filter((_, c) => owner[c] === k).map((j) => sayEnds[j] ?? 0)));
  for (let k = 1; k < ends.length; k++) ends[k] = Math.max(ends[k] as number, ends[k - 1] as number);
  const speech = [r2(before.end - from), r2(Math.min(length, after.start - from))] as const;
  const clamp = (t: number) => r2(Math.min(length, Math.max(0, t)));
  const words = shown.map((w, k) => ({ w, at: clamp(k === 0 ? speech[0] : (ends[k - 1] as number)), end: clamp(ends[k] as number) }));
  return { id: l.id, n: l.n, caption: shown.join(' '), file: `voice/lines/${l.id}.wav`, length: r2(length), speech, rate: r2(say.length / (speech[1] - speech[0])), words };
});

writeFileSync(OUT, JSON.stringify({ voice: 'recorded', lines }, null, 1) + '\n');

const pieces = transcribe(lines.map((l) => here(`../public/${l.file}`)));
let clean = 0;
SCRIPT.forEach((l, i) => {
  const text = pieces.get(here(`../public/${(lines[i] as { file: string }).file}`))?.text ?? '';
  const edits = diff(normalize(spoken(l)), normalize(text));
  if (!edits.length) clean++;
  const line = lines[i] as { length: number; rate: number };
  console.log(`${String(l.n).padStart(2)} ${edits.length ? 'DIFF' : 'ok  '} ${line.length.toFixed(2)}s ${line.rate.toFixed(1)} w/s  ${edits.length ? `[heard: ${text.trim()}] ${edits.join(', ')}` : ''}`);
});
const speechTime = lines.reduce((t, l) => t + l.speech[1] - l.speech[0], 0);
console.log(`\n${clean} of ${SCRIPT.length} lines heard word for word on their own; ${r2(speechTime)} s of speech; quiet below ${QUIET.toFixed(1)} dB (floor ${floor.toFixed(1)})`);
