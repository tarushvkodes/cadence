import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCRIPT, ttsText, type ScriptLine } from './script.ts';
import { alignTokens, check, diff, normalize, speechSpan, transcribe, type Check, type Heard } from './verify.ts';

/**
 * `npm run voice`: speaks every line of `voice/script.ts` in the narrator's cloned voice, checks each
 * take with whisper, keeps the best, and writes the film's voice track as one file per line plus
 * `src/data/voice.json` (lengths and word times). `voice/takes.json` records every attempt and the
 * chosen seed, so a rebuild speaks only the chosen take again and verifies it.
 */

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const RECORDING = here('../public/voice/narration.m4a');
const CLEAN = here('../public/voice/narration.wav');
const REF = here('../public/voice/ref-slow.wav');
const TAKES = here('../public/voice/takes');
const LINES = here('../public/voice/lines');
const OUT = here('../src/data/voice.json');
const LOG = here('takes.json');

/**
 * The voice. The reference is a calm stretch of the narrator's own recording, played at 0.85x: the
 * model copies the reference's tempo, so a slower reference gives a calmer clone without stretching
 * its output (which measured less natural).
 */
const VOICE = {
  model: 'mlx-community/Qwen3-TTS-12Hz-1.7B-Base-8bit',
  package: 'mlx-audio==0.6.5',
  temperature: 0.9,
  refSpan: [138.55, 150.45],
  refTempo: 0.85,
  refText:
    'Step seven, you can see inside. Our Learn page labels every claim by how strong the evidence is, with its source. And Settings shows the exact instructions the AI follows, word for word.',
} as const;

/** A take passes at 2.7 to 3.8 words a second of speech; among passing takes the one nearest 3.2 wins. */
const PACE = { min: 2.7, max: 3.8, maxPause: 0.75 };
const TARGET_RATE = 3.2;
const CANDIDATES = 3;
const MAX_SEEDS = 16;
const LUFS = -16;

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 10);

/** Scratch files for one run, removed when it exits. */
const WORK = mkdtempSync(join(tmpdir(), 'cadence-voice-'));
process.on('exit', () => rmSync(WORK, { recursive: true, force: true }));
const scratch = (name: string) => join(mkdtempSync(join(WORK, 'x-')), name);
const voiceKey = hash(JSON.stringify(VOICE));
const r2 = (n: number) => Math.round(n * 100) / 100;

type Attempt = { seed: number; ok: boolean; rate: number; heard: string; problems: string[] };
/** `pinned` is an editor's reason for a chosen seed; the build keeps it while that take still passes. */
type LineLog = { text: string; chosen: number | null; pinned?: string; attempts: Attempt[] };
type Log = { voice: string; lines: Record<string, LineLog> };
type Take = { line: ScriptLine; seed: number; file: string; heard: Heard; check: Check };

function ensureReference() {
  if (!existsSync(CLEAN)) {
    if (!existsSync(RECORDING)) throw new Error(`put the narrator's recording at ${RECORDING}`);
    execFileSync('sh', [here('enhance.sh'), RECORDING, CLEAN], { stdio: 'inherit' });
  }
  if (!existsSync(REF)) {
    const [s, e] = VOICE.refSpan;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(s), '-to', String(e), '-i', CLEAN, '-af', `atempo=${VOICE.refTempo}`, '-ar', '24000', '-ac', '1', REF]);
  }
}

const takePath = (l: ScriptLine, seed: number) => join(TAKES, `${l.id}-${hash(voiceKey + ttsText(l))}-s${seed}.wav`);

/** Speaks a batch of takes in one model load. Takes already on disk are reused. */
function speak(batch: { line: ScriptLine; seed: number }[]) {
  const jobs = batch.filter((b) => !existsSync(takePath(b.line, b.seed))).map((b) => ({ text: ttsText(b.line), out: takePath(b.line, b.seed), seed: b.seed }));
  if (!jobs.length) return;
  const spec = scratch('jobs.json');
  writeFileSync(spec, JSON.stringify({ model: VOICE.model, ref: REF, ref_text: VOICE.refText, temperature: VOICE.temperature, jobs }));
  execFileSync('uvx', ['-q', '--python', '3.12', '--from', VOICE.package, '--with', 'soundfile', 'python', here('tts.py'), spec], { stdio: ['ignore', 'ignore', 'inherit'] });
  for (const j of jobs) if (!existsSync(j.out)) throw new Error(`the voice model wrote no audio for "${j.text}"`);
}

/**
 * The take with a quiet pink-noise floor under it, 20 dB below the speech, the way the music sits
 * under the voice in the film. A take whose words only survive in silence is too fragile to use.
 */
function underNoise(file: string): string {
  const out = scratch('noisy.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-f', 'lavfi', '-i', 'anoisesrc=color=pink:seed=7:amplitude=1', '-filter_complex', '[0:a]loudnorm=I=-16:TP=-2,aresample=24000[v];[1:a]aresample=24000,volume=-21.4dB[n];[v][n]amix=inputs=2:duration=first:normalize=0', out]);
  return out;
}

function judge(batch: { line: ScriptLine; seed: number }[]): Take[] {
  const files = batch.map((b) => takePath(b.line, b.seed));
  const noisy = files.map(underNoise);
  const heard = transcribe([...files, ...noisy]);
  return batch.map((b, i) => {
    const file = files[i] as string;
    const h = heard.get(file) as Heard;
    const c = check(b.line.say, h, speechSpan(file), PACE);
    const underMusic = diff(normalize(b.line.say), normalize(heard.get(noisy[i] as string)?.text ?? ''));
    const problems = [...c.problems, ...underMusic.map((e) => `under a noise floor: ${e}`)];
    return { line: b.line, seed: b.seed, file, heard: h, check: { ...c, ok: problems.length === 0, problems } };
  });
}

function search(log: Log): Map<string, Take> {
  const chosen = new Map<string, Take>();
  const passing = new Map<string, Take[]>(SCRIPT.map((l) => [l.id, []]));
  const attempts = new Map<string, Attempt[]>(SCRIPT.map((l) => [l.id, []]));
  const record = (t: Take) =>
    attempts.get(t.line.id)?.push({ seed: t.seed, ok: t.check.ok, rate: r2(t.check.rate), heard: t.heard.text, problems: t.check.problems });

  const known = SCRIPT.filter((l) => {
    const prev = log.voice === voiceKey ? log.lines[l.id] : undefined;
    return prev && prev.text === ttsText(l) && prev.chosen !== null;
  });
  if (known.length) {
    const batch = known.map((l) => ({ line: l, seed: log.lines[l.id]?.chosen as number }));
    speak(batch);
    for (const t of judge(batch)) {
      if (t.check.ok) {
        chosen.set(t.line.id, t);
        attempts.set(t.line.id, log.lines[t.line.id]?.attempts ?? []);
      } else console.log(`${t.line.id}: the recorded take (seed ${t.seed}) no longer passes (${t.check.problems.join('; ')}), searching again`);
    }
  }

  let pending = SCRIPT.filter((l) => !chosen.has(l.id));
  for (let seed = 1; pending.length && seed <= MAX_SEEDS; seed++) {
    const batch = pending.map((line) => ({ line, seed }));
    speak(batch);
    for (const t of judge(batch)) {
      record(t);
      if (t.check.ok) passing.get(t.line.id)?.push(t);
    }
    pending = pending.filter((l) => (passing.get(l.id)?.length ?? 0) < CANDIDATES);
    console.log(`seed ${seed}: ${SCRIPT.length - pending.length} of ${SCRIPT.length} lines have ${CANDIDATES} passing takes`);
  }
  const failed: string[] = [];
  for (const l of SCRIPT) {
    if (chosen.has(l.id)) continue;
    const best = [...(passing.get(l.id) ?? [])].sort((a, b) => Math.abs(a.check.rate - TARGET_RATE) - Math.abs(b.check.rate - TARGET_RATE))[0];
    if (best) chosen.set(l.id, best);
    else failed.push(`${l.id} (line ${l.n}): ${(attempts.get(l.id) ?? []).map((a) => `seed ${a.seed}: ${a.problems.join(', ')}`).join(' | ')}`);
  }
  for (const l of SCRIPT) {
    const prev = log.lines[l.id];
    const seed = chosen.get(l.id)?.seed ?? null;
    const pinned = prev?.pinned && prev.chosen === seed ? { pinned: prev.pinned } : {};
    log.lines[l.id] = { text: ttsText(l), chosen: seed, ...pinned, attempts: attempts.get(l.id) ?? [] };
  }
  log.voice = voiceKey;
  writeFileSync(LOG, JSON.stringify(log, null, 1) + '\n');
  if (failed.length) throw new Error(`no take passed for:\n${failed.join('\n')}`);
  return chosen;
}

function loudness(file: string): number {
  const log = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${file}" -af ebur128 -f null - 2>&1`], { encoding: 'utf8' });
  const m = /Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS/.exec(log);
  if (!m) throw new Error(`no loudness reading for ${file}`);
  return Number(m[1]);
}

/** Trims a take to its speech plus a natural tail, brings it to 48 kHz and to the film's voice level. */
function finish(t: Take): { file: string; offset: number; length: number } {
  const from = Math.max(0, t.check.span.start - 0.04);
  const to = Math.min(t.check.span.length, t.check.span.end + 0.22);
  const length = to - from;
  const out = join(LINES, `${t.line.id}.wav`);
  const shape = `atrim=${from}:${to},asetpts=N/SR/TB,aresample=48000:filter_size=64:cutoff=0.97,highpass=f=70,afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, length - 0.12)}:d=0.12`;
  const tmp = scratch('shaped.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', t.file, '-af', shape, '-c:a', 'pcm_s24le', tmp]);
  const gain = LUFS - loudness(tmp);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=0.78:attack=2:release=60:level=false`, '-ar', '48000', '-c:a', 'pcm_s24le', out]);
  return { file: out, offset: from, length };
}

/**
 * Word times for the caption's own words. whisper gives each heard word's end; the script's tokens
 * borrow them, and the caption's tokens borrow the script's (the caption may write "Nov 18 to 22" for
 * "November eighteenth to the twenty-second"). A word starts where the one before it ended.
 */
function captionWords(t: Take, offset: number, length: number) {
  const heardTokens = t.heard.words.flatMap((w) => normalize(w.w).map(() => w.t - offset));
  const say = normalize(t.line.say);
  const sayTimes = alignTokens(say, t.heard.words.flatMap((w) => normalize(w.w))).map((j) => heardTokens[j] ?? 0);
  const shown = (t.line.caption ?? t.line.say).split(/\s+/);
  const owner: number[] = [];
  const capTokens = shown.flatMap((w, i) => normalize(w).map((tok) => (owner.push(i), tok)));
  const capToSay = alignTokens(capTokens, say);
  const ends = shown.map((_, i) => {
    const mine = capToSay.filter((_, k) => owner[k] === i);
    return mine.length ? Math.max(...mine.map((j) => sayTimes[j] ?? 0)) : 0;
  });
  for (let i = 1; i < ends.length; i++) ends[i] = Math.max(ends[i] as number, ends[i - 1] as number);
  const start = t.check.span.start - offset;
  return shown.map((w, i) => ({ w, at: r2(Math.min(length, i === 0 ? start : (ends[i - 1] as number))), end: r2(Math.min(length, ends[i] as number)) }));
}

for (const l of SCRIPT)
  if (l.phrasing && normalize(l.phrasing).join(' ') !== normalize(l.say).join(' ')) throw new Error(`${l.id}: its phrasing changes the words, not only the punctuation`);
mkdirSync(TAKES, { recursive: true });
mkdirSync(LINES, { recursive: true });
ensureReference();
const log: Log = existsSync(LOG) ? (JSON.parse(readFileSync(LOG, 'utf8')) as Log) : { voice: voiceKey, lines: {} };
const chosen = search(log);

const lines = SCRIPT.map((l) => {
  const t = chosen.get(l.id) as Take;
  const { offset, length } = finish(t);
  const speech = [r2(t.check.span.start - offset), r2(Math.min(length, t.check.span.end - offset))];
  return { id: l.id, n: l.n, caption: l.caption ?? l.say, file: `voice/lines/${l.id}.wav`, length: r2(length), speech, rate: r2(t.check.rate), words: captionWords(t, offset, length) };
});
writeFileSync(OUT, JSON.stringify({ voice: voiceKey, lines }, null, 1) + '\n');

const words = SCRIPT.reduce((n, l) => n + normalize(l.say).length, 0);
const speech = [...chosen.values()].reduce((s, t) => s + t.check.span.end - t.check.span.start, 0);
const tries = Object.values(log.lines).reduce((n, l) => n + l.attempts.length, 0);
console.log(`${lines.length} lines, ${words} words in ${speech.toFixed(1)} s of speech (${(words / speech).toFixed(2)} words/s), ${tries} takes judged -> ${OUT}`);
