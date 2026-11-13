import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

/**
 * Checks a spoken take against its script line: whisper.cpp's transcript, compared word for word after
 * both sides are normalized (numbers, ordinals and percents spelled out, hyphens and punctuation
 * dropped), plus the speech span, the pace, and the longest pause inside the line.
 */

export const WHISPER_MODEL = process.env.WHISPER_MODEL ?? '/Users/tarushvkosgi/vidwork/lalith/models/ggml-medium.en.bin';

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const ORDINAL: Record<string, string> = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };

function spell(n: number): string {
  if (n < 20) return ONES[n] as string;
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${spell(n % 100)}` : ''}`;
  return String(n);
}

function ordinal(words: string): string {
  const parts = words.split(' ');
  const last = parts.pop() as string;
  const ord = ORDINAL[last] ?? (last.endsWith('y') ? `${last.slice(0, -1)}ieth` : `${last}th`);
  return [...parts, ord].join(' ');
}

/** Lowercase words with numbers spelled out, so "Nov 18th", "November eighteenth" and "18th" compare equal. */
export function normalize(text: string): string[] {
  const t = text
    .toLowerCase()
    .replace(/(\d+)\s*%/g, (_, d: string) => `${spell(Number(d))} percent`)
    .replace(/(\d+)(st|nd|rd|th)\b/g, (_, d: string) => ordinal(spell(Number(d))))
    .replace(/\d+/g, (d) => spell(Number(d)))
    .replace(/\bnov\b/g, 'november')
    .replace(/\ba hundred\b/g, 'one hundred')
    .replace(/\bhundred and\b/g, 'hundred')
    .replace(/[-‐-―/]/g, ' ')
    .replace(/[^a-z' ]/g, ' ')
    .replace(/'/g, '')
    .replace(/\b(set|mid|git|chat) (up|term|hub|bot)\b/g, '$1$2');
  return t.split(/\s+/).filter(Boolean);
}

/**
 * Pairs each token of `a` with the token of `b` it lines up with (Levenshtein path), so words of one
 * wording can borrow times from another ("Nov 18 to 22" from "November eighteenth to the twenty-second").
 */
export function alignTokens(a: string[], b: string[]): number[] {
  const n = a.length;
  const m = b.length;
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      (d[i] as number[])[j] = Math.min((d[i - 1] as number[])[j]! + 1, (d[i] as number[])[j - 1]! + 1, (d[i - 1] as number[])[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  const pair = new Array<number>(n).fill(-1);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const here = (d[i] as number[])[j] as number;
    if (here === (d[i - 1] as number[])[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      pair[i - 1] = j - 1;
      i--;
      j--;
    } else if (here === (d[i - 1] as number[])[j]! + 1) i--;
    else j--;
  }
  for (let k = 0; k < n; k++) if (pair[k] === -1) pair[k] = k > 0 ? (pair[k - 1] as number) : 0;
  return pair;
}

/** Word-level diff (Levenshtein alignment); returns the edits needed to turn `got` into `want`. */
export function diff(want: string[], got: string[]): string[] {
  const n = want.length;
  const m = got.length;
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      (d[i] as number[])[j] = Math.min((d[i - 1] as number[])[j]! + 1, (d[i] as number[])[j - 1]! + 1, (d[i - 1] as number[])[j - 1]! + (want[i - 1] === got[j - 1] ? 0 : 1));
  const edits: string[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const here = (d[i] as number[])[j] as number;
    if (i > 0 && j > 0 && want[i - 1] === got[j - 1] && here === (d[i - 1] as number[])[j - 1]) {
      i--;
      j--;
    } else if (i > 0 && j > 0 && here === (d[i - 1] as number[])[j - 1]! + 1) {
      edits.unshift(`"${got[j - 1]}" for "${want[i - 1]}"`);
      i--;
      j--;
    } else if (i > 0 && here === (d[i - 1] as number[])[j]! + 1) {
      edits.unshift(`missing "${want[i - 1]}"`);
      i--;
    } else {
      edits.unshift(`added "${got[j - 1]}"`);
      j--;
    }
  }
  return edits;
}

export type Heard = { text: string; words: { w: string; t: number }[] };

/** Transcribes several WAVs in one whisper.cpp run. Word times are DTW token ends (seconds). */
export function transcribe(files: string[]): Map<string, Heard> {
  const dir = mkdtempSync(join(tmpdir(), 'cadence-heard-'));
  const inputs = files.map((f, i) => {
    const w = join(dir, `${i}-${basename(f)}`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', f, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', w]);
    return w;
  });
  const out = new Map<string, Heard>();
  const BATCH = 24;
  for (let b = 0; b < inputs.length; b += BATCH) {
    const chunk = inputs.slice(b, b + BATCH);
    execFileSync('whisper-cli', ['-m', WHISPER_MODEL, ...chunk.flatMap((f) => ['-f', f]), '-ojf', '-t', '8', '--dtw', 'medium.en', '-nfa', '-np'], { stdio: 'ignore' });
    chunk.forEach((w, k) => {
      type Token = { text: string; t_dtw?: number };
      const raw = JSON.parse(readFileSync(`${w}.json`, 'utf8')) as { transcription: { text: string; tokens: Token[] }[] };
      const words: { w: string; t: number }[] = [];
      for (const seg of raw.transcription)
        for (const tok of seg.tokens) {
          if (tok.text.startsWith('[_')) continue;
          const t = Math.round(tok.t_dtw ?? -1) / 100;
          const last = words.at(-1);
          if (tok.text.startsWith(' ') || !last) words.push({ w: tok.text.trim(), t });
          else {
            last.w += tok.text;
            if (/[A-Za-z0-9]/.test(tok.text)) last.t = t;
          }
        }
      out.set(files[b + k] as string, { text: raw.transcription.map((s) => s.text).join('').trim(), words });
    });
  }
  return out;
}

export type Span = { start: number; end: number; length: number; pauses: { s: number; e: number }[]; tailDb: number };

/** Where speech starts and ends in a take, and the pauses inside it (silence below -42 dB for 80 ms or more). */
export function speechSpan(file: string): Span {
  const log = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${file}" -af silencedetect=noise=-42dB:d=0.08 -f null - 2>&1`], { encoding: 'utf8' });
  const length = Number(/Duration: (\d+):(\d+):([\d.]+)/.exec(log)?.slice(1).reduce((a, x, i) => a + Number(x) * [3600, 60, 1][i]!, 0) ?? 0);
  const sil: { s: number; e: number }[] = [];
  let s: number | null = null;
  for (const l of log.split('\n')) {
    const a = /silence_start: ([\d.]+)/.exec(l);
    const b = /silence_end: ([\d.]+)/.exec(l);
    if (a) s = Number(a[1]);
    if (b && s !== null) {
      sil.push({ s, e: Number(b[1]) });
      s = null;
    }
  }
  if (s !== null) sil.push({ s, e: length });
  const lead = sil[0] && sil[0].s <= 0.01 ? sil[0].e : 0;
  const tailSil = sil.at(-1);
  const tail = tailSil && tailSil.e >= length - 0.01 ? tailSil.s : length;
  const tailLog = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -sseof -0.03 -i "${file}" -af astats=metadata=0 -f null - 2>&1`], { encoding: 'utf8' });
  const tailDb = Number(/RMS level dB: (-?[\d.]+|-inf)/.exec(tailLog)?.[1]?.replace('-inf', '-200') ?? -200);
  return { start: lead, end: tail, length, pauses: sil.filter((p) => p.s > lead + 0.01 && p.e < tail - 0.01), tailDb };
}

export type Check = { ok: boolean; heard: string; edits: string[]; rate: number; span: Span; longestPause: number; problems: string[] };

export type PaceRule = { min: number; max: number; maxPause: number };

/** Judges one take of a line against the words it should say. Lines under eight words get a looser pace window. */
export function check(say: string, heard: Heard, span: Span, rule: PaceRule): Check {
  const want = normalize(say);
  const got = normalize(heard.text);
  const edits = diff(want, got);
  const speech = span.end - span.start;
  const rate = want.length / Math.max(0.1, speech);
  const longestPause = Math.max(0, ...span.pauses.map((p) => p.e - p.s));
  const problems = [...edits];
  const loose = want.length < 8 ? 0.6 : 0;
  if (rate < rule.min - loose) problems.push(`slow: ${rate.toFixed(2)} words/s`);
  if (rate > rule.max + loose) problems.push(`fast: ${rate.toFixed(2)} words/s`);
  if (longestPause > rule.maxPause) problems.push(`pause of ${longestPause.toFixed(2)} s inside the line`);
  if (span.tailDb > -40) problems.push(`cut off: the last 30 ms are still at ${span.tailDb.toFixed(0)} dB`);
  return { ok: problems.length === 0, heard: heard.text, edits, rate, span, longestPause, problems };
}
