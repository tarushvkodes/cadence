import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Glass } from '../../../src/ui/Glass.tsx';
import { FPS, TIMELINE, type TimedLine } from '../timeline.ts';
import { C, FONT, SHADOW } from './theme.ts';

const MAX_CHARS = 54;

type Chunk = { text: string; from: number; to: number };

/**
 * Splits a line into as few caption cards as fit, of even length, preferring to break after
 * punctuation, so no card is left holding one or two orphaned words.
 */
function chunks(l: TimedLine): Chunk[] {
  const words = l.words;
  const total = words.map((w) => w.w).join(' ').length;
  const n = Math.max(1, Math.ceil(total / MAX_CHARS));
  const target = total / n;
  const len = (i: number, j: number) => words.slice(i, j).map((w) => w.w).join(' ').length;
  const cost = (i: number, j: number) => {
    const L = len(i, j);
    const last = words[j - 1]?.w ?? '';
    return (L > MAX_CHARS ? 1e6 : 0) + (L - target) ** 2 - (/[,.?!]$/.test(last) ? 120 : 0);
  };
  // best[k][j]: cheapest split of words[0..j) into k cards.
  const best: { c: number; from: number }[][] = [[{ c: 0, from: 0 }]];
  for (let k = 1; k <= n; k++) {
    best[k] = [];
    for (let j = 1; j <= words.length; j++) {
      let pick = { c: Infinity, from: 0 };
      for (let i = k - 1; i < j; i++) {
        const prev = best[k - 1]?.[i];
        if (!prev || !Number.isFinite(prev.c)) continue;
        const c = prev.c + cost(i, j);
        if (c < pick.c) pick = { c, from: i };
      }
      (best[k] as { c: number; from: number }[])[j] = pick;
    }
  }
  const cuts: number[] = [];
  let j = words.length;
  for (let k = n; k > 0; k--) {
    cuts.unshift(j);
    j = (best[k] as { c: number; from: number }[])[j]?.from ?? 0;
  }
  const starts = [0, ...cuts.slice(0, -1)];
  return starts.map((s, i) => {
    const e = cuts[i] as number;
    const next = starts[i + 1];
    return {
      text: words.slice(s, e).map((w) => w.w).join(' '),
      from: l.from + Math.round((words[s]?.at ?? 0) * FPS),
      to: next !== undefined ? l.from + Math.round((words[next]?.at ?? 0) * FPS) : l.end + 8,
    };
  });
}

const ALL = TIMELINE.lines.flatMap((l) => chunks(l).map((c) => ({ ...c, line: l.id })));

/** Burned-in captions of the recorded narration, on a Liquid Glass bar at the foot of the frame. */
export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const c = ALL.find((x) => frame >= x.from && frame < x.to);
  if (!c) return null;
  const lineChunks = ALL.filter((x) => x.line === c.line);
  const first = lineChunks[0] as Chunk;
  const last = lineChunks.at(-1) as Chunk;
  const o = Math.min(1, (frame - first.from + 1) / 4, (last.to - frame) / 4);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 38, display: 'flex', justifyContent: 'center', opacity: o }}>
      <Glass radius={20} frost={18} style={{ padding: '12px 26px', boxShadow: SHADOW.lift, maxWidth: 1500 }}>
        <div style={{ font: `600 34px/1.3 ${FONT.sans}`, letterSpacing: '-0.015em', color: C.ink, textAlign: 'center', whiteSpace: 'nowrap' }}>{c.text}</div>
      </Glass>
    </div>
  );
};
