import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FPS, TIMELINE } from '../src/timeline.ts';
import voice from '../src/data/voice.json';
import { SCRIPT } from '../voice/script.ts';
import { diff, normalize, transcribe } from '../voice/verify.ts';

/**
 * `npm run check:voice [-- file]`: cuts a render's soundtrack (by default the voiced cut) at each
 * line's place in the timeline, music and all, transcribes every piece with whisper.cpp, and matches
 * it to the script, so a mix that buries, drops or garbles a word fails. Each line is heard on its own:
 * one long transcript drifts on this voice's near-homophones ("phase", "face") from run to run.
 */

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const file = process.argv[2] ?? here('../out/cadence-demo.mp4');
const dir = mkdtempSync(join(tmpdir(), 'cadence-check-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));

const pieces = TIMELINE.lines.map((l) => {
  const out = join(dir, `${l.id}.wav`);
  const from = Math.max(0, l.from / FPS - 0.1);
  const to = l.end / FPS + 0.35;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', from.toFixed(3), '-to', to.toFixed(3), '-i', file, '-vn', '-ar', '16000', '-ac', '1', out]);
  return { id: l.id, out };
});
const heard = transcribe(pieces.map((p) => p.out));

let failed = 0;
let words = 0;
let missed = 0;
for (const l of SCRIPT) {
  const piece = pieces.find((p) => p.id === l.id);
  if (!piece) throw new Error(`${l.id} is not on the timeline`);
  const text = heard.get(piece.out)?.text ?? '';
  const say = voice.voice === 'recorded' ? (l.read?.say ?? l.say) : l.say;
  const want = normalize(say);
  const edits = diff(want, normalize(text));
  words += want.length;
  missed += edits.filter((e) => !e.startsWith('added')).length;
  if (edits.length) failed++;
  console.log(`${String(l.n).padStart(2)} ${edits.length ? 'MISS' : 'ok  '} ${say}${edits.length ? `  [heard: ${text.trim()}] ${edits.join(', ')}` : ''}`);
}
console.log(`\n${SCRIPT.length - failed} of ${SCRIPT.length} lines heard word for word; ${words - missed} of ${words} words in ${file}`);
if (failed) process.exitCode = 1;
