import React from 'react';
import { C, PHASE } from './theme.ts';

/** The four phases in cycle order, with the logo's arc shares (src/ui/Logo.tsx). */
const ARCS = [
  { phase: 'menstrual', share: 0.2 },
  { phase: 'follicular', share: 0.3 },
  { phase: 'ovulatory', share: 0.15 },
  { phase: 'luteal', share: 0.35 },
] as const;

/**
 * The film's motif: the Cadence logo ring, drawn at any size. `drawn` grows the arcs clockwise from
 * the top (0 to 1); `bead` places the cycle marker at a turn (0 = top), the same bead the Today dial
 * uses; `dot` is the logo's ink dot at the top where the cycle starts again.
 */
export const Ring: React.FC<{
  size: number;
  drawn?: number;
  bead?: number | null;
  beadPhase?: keyof typeof PHASE;
  dot?: number;
  stroke?: number;
  gap?: number;
  style?: React.CSSProperties;
}> = ({ size, drawn = 1, bead = null, beadPhase = 'luteal', dot = 0, stroke, gap, style }) => {
  const r = size * 0.36;
  const sw = stroke ?? size * 0.1;
  const circ = 2 * Math.PI * r;
  const g = gap ?? sw * 1.3;
  const c = size / 2;
  let offset = 0;
  const shown = drawn * circ;
  const beadAt = (turn: number) => {
    const a = turn * 2 * Math.PI - Math.PI / 2;
    return [c + r * Math.cos(a), c + r * Math.sin(a)] as const;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible', ...style }}>
      <defs>
        <filter id={`bead-${size}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy={sw * 0.08} stdDeviation={sw * 0.12} floodColor="#281e14" floodOpacity="0.22" />
        </filter>
      </defs>
      <g transform={`rotate(-90 ${c} ${c})`}>
        {ARCS.map(({ phase, share }) => {
          const start = offset + g / 2;
          const len = share * circ - g;
          offset += share * circ;
          const visible = Math.max(0, Math.min(len, shown - start));
          if (visible <= 0.01) return null;
          return (
            <circle
              key={phase}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={PHASE[phase].solid}
              strokeWidth={sw}
              strokeLinecap="round"
              strokeDasharray={`${visible} ${circ}`}
              strokeDashoffset={-start}
            />
          );
        })}
      </g>
      {dot > 0 ? <circle cx={c} cy={c - r} r={sw * 0.58 * dot} fill={C.ink} /> : null}
      {bead !== null
        ? (() => {
            const [x, y] = beadAt(bead);
            return (
              <g transform={`translate(${x} ${y})`} filter={`url(#bead-${size})`}>
                <circle r={sw * 0.82} fill={C.elevated} />
                <circle r={sw * 0.52} fill="none" stroke={PHASE[beadPhase].solid} strokeWidth={sw * 0.16} />
                <circle r={sw * 0.16} fill={C.ink} />
              </g>
            );
          })()
        : null}
    </svg>
  );
};
