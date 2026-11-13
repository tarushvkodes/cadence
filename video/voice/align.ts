import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { VOICE_LINES } from './lines.ts';

/**
 * Cuts the recorded narration into the film's lines. Word times come from whisper.cpp's DTW token
 * timestamps (`voice/words.json`, roughly where each word ends); every cut is then moved into the
 * nearest real pause in the recording, so no cut lands inside a word.
 */

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const SOURCE = here('../public/voice/narration.m4a');
const CLEAN = here('../public/voice/narration.wav');
const OUT = here('../src/data/voice.json');

type Word = { w: string; t: number };
type Pause = { s: number; e: number };

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
const tokens = (s: string) => s.split(/\s+/).map(norm).filter(Boolean);

function detectPauses(file: string): Pause[] {
  const res = spawnLog(file);
  const out: Pause[] = [];
  let start: number | null = null;
  for (const line of res.split('\n')) {
    const s = /silence_start: ([\d.]+)/.exec(line);
    const e = /silence_end: ([\d.]+)/.exec(line);
    if (s) start = Number(s[1]);
    if (e && start !== null) {
      out.push({ s: start, e: Number(e[1]) });
      start = null;
    }
  }
  return out;
}

function spawnLog(file: string): string {
  return execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${file}" -af silencedetect=noise=-32dB:d=0.12 -f null - 2>&1`], { encoding: 'utf8' });
}

/**
 * The pause between two words, from where each one ends. DTW end times drift by up to a second and
 * often bunch short words together, so every pause near the expected gap is scored: longer pauses
 * win (the breath between sentences), nearer ones win ties, and word B must keep room to be said.
 */
function pauseBetween(ps: Pause[], endA: number, endB: number): Pause {
  const expected = (endA + endB - 0.25) / 2;
  const cands = ps.filter((p) => p.e - p.s >= 0.15 && (p.s + p.e) / 2 >= endA - 1.0 && p.s <= endB - 0.12 && p.e <= endB + 0.6);
  const score = (p: Pause) => p.e - p.s - 0.6 * Math.abs((p.s + p.e) / 2 - expected);
  const p = cands.sort((x, y) => score(y) - score(x))[0];
  if (!p) throw new Error(`no pause between ${endA} and ${endB}`);
  return p;
}
const startAt = (ps: Pause[], prevEnd: number, wordEnd: number) => {
  const p = pauseBetween(ps, prevEnd, wordEnd);
  return Math.max(p.e - 0.12, p.s + (p.e - p.s) * 0.6);
};
const endAt = (ps: Pause[], wordEnd: number, nextEnd: number) => {
  const p = pauseBetween(ps, wordEnd, nextEnd);
  return Math.min(p.s + 0.28, p.s + (p.e - p.s) * 0.6);
};

if (!existsSync(SOURCE)) throw new Error(`put the recording at ${SOURCE}`);
const words = JSON.parse(readFileSync(here('words.json'), 'utf8')) as Word[];
const ps = detectPauses(SOURCE);
const r2 = (n: number) => Math.round(n * 100) / 100;

let cursor = 0;
const lines = VOICE_LINES.map((line) => {
  const heard = tokens(line.heard);
  const first = cursor;
  for (const [k, tok] of heard.entries()) {
    const got = norm((words[first + k] as Word | undefined)?.w ?? '');
    if (got !== tok) throw new Error(`${line.id}: expected "${tok}" at word ${first + k}, transcript has "${got}"`);
  }
  const last = first + heard.length - 1;
  cursor = last + 1;
  const endOf = (i: number) => (words[i] as Word).t;
  const prevEnd = first > 0 ? endOf(first - 1) : 0;
  const nextEnd = last + 1 < words.length ? endOf(last + 1) : endOf(last) + 2;

  const keep: number[] = heard.map((_, k) => first + k);
  const segments: [number, number][] = [];
  if (line.skip) {
    const a = first + tokens(line.skip.after).length - 1;
    const b = a + tokens(line.skip.drop).length + 1;
    segments.push([startAt(ps, prevEnd, endOf(first)), endAt(ps, endOf(a), endOf(a + 1))]);
    segments.push([startAt(ps, endOf(b - 1), endOf(b)), endAt(ps, endOf(last), nextEnd)]);
    keep.splice(a - first + 1, b - a - 1);
  } else {
    segments.push([startAt(ps, prevEnd, endOf(first)), endAt(ps, endOf(last), nextEnd)]);
  }

  // Word start in line time: where the previous kept word ended, mapped through the segments.
  const toLine = (t: number) => {
    let acc = 0;
    for (const [s, e] of segments) {
      if (t <= e) return acc + Math.max(0, t - s);
      acc += e - s;
    }
    return acc;
  };
  const caption = line.caption ?? line.heard;
  const shown = caption.split(/\s+/);
  const timed = keep.map((wi, k) => ({ w: shown.length === keep.length ? (shown[k] as string) : (words[wi] as Word).w, at: r2(k === 0 ? 0 : toLine(endOf(keep[k - 1] as number))) }));
  const length = segments.reduce((sum, [s, e]) => sum + (e - s), 0);
  return { id: line.id, caption, segments: segments.map(([s, e]) => [r2(s), r2(e)]), length: r2(length), words: timed };
});

if (cursor !== words.length) throw new Error(`transcript has ${words.length - cursor} words after the last line`);

execFileSync('sh', [here('enhance.sh'), SOURCE, CLEAN], { stdio: 'inherit' });
writeFileSync(OUT, JSON.stringify({ source: 'voice/narration.wav', lines }, null, 1) + '\n');
console.log(`${lines.length} lines, ${r2(lines.reduce((s, l) => s + l.length, 0))} s of speech -> ${OUT}`);
