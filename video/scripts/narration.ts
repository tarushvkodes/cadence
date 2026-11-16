import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CHAPTERS, FPS, TIMELINE, TOTAL_FRAMES } from '../src/timeline.ts';

/**
 * Writes NARRATION.md and the audio cue sheet from the timeline, so both always match the render.
 * Run with `npm run narration` after changing the timeline or re-aligning the recording.
 */

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const tc = (frame: number) => {
  const s = frame / FPS;
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`;
};
const cell = (s: string) => s.replace(/\|/g, '\\|');

const heading = (id: string) => {
  const c = CHAPTERS.find((x) => x.id === id);
  if (!c) return id;
  return c.step ? `Step ${c.step}: ${c.name}` : c.name;
};

const table = TIMELINE.chapters.flatMap((c) => [
  `| **${tc(c.from)}** | | **${heading(c.id)}** | |`,
  ...c.lines.map((l) => `| ${tc(l.from + Math.round((l.speech[0] ?? 0) * FPS))} | ${l.n} | ${cell(l.does)} | ${cell(l.caption)} |`),
]);

const readThrough = TIMELINE.chapters.map((c) => `**${heading(c.id)}**\n\n${c.lines.map((l) => l.caption).join(' ')}`);

const md = `# Cadence demo film: narration

The voice in \`out/cadence-demo.mp4\` is a recorded reading of the script (\`voice/script.ts\`), cut into its lines by
\`npm run voice:recorded\`. Each time below is when that line's words start in the film. If you
narrate live over \`out/cadence-demo-music.mp4\` or \`out/cadence-demo-silent.mp4\`, start each line at its timecode.
The # column is the line's number in the script.

Total length ${tc(TOTAL_FRAMES)}. Generated from \`src/timeline.ts\` by \`npm run narration\`; do not edit by hand.

## Timed script

| Time | # | On screen | Words |
| --- | --- | --- | --- |
${table.join('\n')}

## Read-through

${readThrough.join('\n\n')}
`;

writeFileSync(here('../NARRATION.md'), md);

const cues = {
  note: 'Generated from src/timeline.ts by npm run narration. audio/build.ts reads it.',
  fps: FPS,
  durationSec: Math.round((TOTAL_FRAMES / FPS) * 100) / 100,
  sections: TIMELINE.chapters.map((c) => ({ id: c.id, start: Math.round((c.from / FPS) * 100) / 100 })),
};
writeFileSync(here('../audio/cues.json'), JSON.stringify(cues, null, 2) + '\n');
console.log(`NARRATION.md and audio/cues.json written (${tc(TOTAL_FRAMES)})`);
