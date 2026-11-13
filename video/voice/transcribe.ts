import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Transcribes the narration with whisper.cpp and keeps one entry per word with the time its last
 * spoken token ends (DTW timestamps). Punctuation tokens carry no reliable time, so they never move
 * a word's time. Needs `whisper-cli` and a ggml model: WHISPER_MODEL=/path/to/ggml-medium.en.bin.
 */

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const model = process.env.WHISPER_MODEL;
if (!model) throw new Error('set WHISPER_MODEL to a whisper.cpp ggml model, for example ggml-medium.en.bin');
const preset = process.env.WHISPER_DTW ?? 'medium.en';

const dir = mkdtempSync(join(tmpdir(), 'cadence-voice-'));
const wav = join(dir, 'voice16.wav');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', here('../public/voice/narration.m4a'), '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
execFileSync('whisper-cli', ['-m', model, '-f', wav, '-ojf', '-of', join(dir, 'out'), '-t', '8', '--dtw', preset, '-nfa'], { stdio: 'ignore' });

type Token = { text: string; t_dtw?: number };
const raw = JSON.parse(readFileSync(join(dir, 'out.json'), 'utf8')) as { transcription: { tokens: Token[] }[] };
const words: { w: string; t: number }[] = [];
for (const seg of raw.transcription) {
  for (const tok of seg.tokens) {
    if (tok.text.startsWith('[_')) continue;
    const t = Math.round((tok.t_dtw ?? -1)) / 100;
    const last = words.at(-1);
    if (tok.text.startsWith(' ') || !last) words.push({ w: tok.text.trim(), t });
    else {
      last.w += tok.text;
      if (/[A-Za-z0-9]/.test(tok.text)) last.t = t;
    }
  }
}
writeFileSync(here('words.json'), JSON.stringify(words));
console.log(`${words.length} words -> voice/words.json`);
