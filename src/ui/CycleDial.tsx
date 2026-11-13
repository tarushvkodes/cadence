import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useId } from 'react';
import { PHASE_LABELS, type PhaseEstimate, type PhaseSpan } from '../domain/cycle.ts';
import type { Phase } from '../domain/types.ts';

type Estimate = Extract<PhaseEstimate, { kind: 'estimate' }>;

const SIZE = 440;
const C = SIZE / 2;
const R = 160;
const STROKE = 34;
const STEP = 0.2;

const polar = (radius: number, turn: number) => {
  const a = turn * 2 * Math.PI - Math.PI / 2;
  return [C + radius * Math.cos(a), C + radius * Math.sin(a)] as const;
};

function arcPath(radius: number, from: number, to: number): string {
  const [x1, y1] = polar(radius, from);
  const [x2, y2] = polar(radius, to);
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** A full circle drawn counter-clockwise from the top, so text along its lower half reads upright. */
function reversedCircle(radius: number): string {
  return `M ${C} ${C - radius} A ${radius} ${radius} 0 1 0 ${C} ${C + radius} A ${radius} ${radius} 0 1 0 ${C} ${C - radius}`;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Colour at a point on the cycle: a phase hue, blended with its neighbour inside a boundary's margin. */
function colourAt(x: number, spans: readonly PhaseSpan[], length: number, wrapMargin: number): string {
  const boundaries = spans.map((s, i) => {
    const next = spans[i + 1] ?? spans[0];
    const isWrap = i === spans.length - 1;
    return { at: isWrap ? length : s.endDay, from: s.phase, to: (next as PhaseSpan).phase, margin: isWrap ? wrapMargin : s.edgeMargin };
  });
  const candidates = [...boundaries, { ...(boundaries.at(-1) as (typeof boundaries)[number]), at: 0 }];
  let best = candidates[0] as (typeof candidates)[number];
  for (const b of candidates) if (Math.abs(x - b.at) < Math.abs(x - best.at)) best = b;
  const width = Math.max(0.35, best.margin * 0.32);
  const t = Math.min(1, Math.max(0, (x - best.at + width) / (2 * width)));
  const k = smooth(t);
  if (k <= 0.001) return `var(--${best.from})`;
  if (k >= 0.999) return `var(--${best.to})`;
  return `color-mix(in oklab, var(--${best.to}) ${(k * 100).toFixed(1)}%, var(--${best.from}))`;
}

const LABEL_ORDER: Phase[] = ['menstrual', 'follicular', 'ovulatory', 'luteal'];

export function CycleDial({ estimate, size = SIZE }: { estimate: Estimate; size?: number }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const L = estimate.cycleLength;
  const { spans } = estimate;
  const last = spans.at(-1) as PhaseSpan;
  const wrapMargin = last.edgeMargin;
  const todayPos = Math.min(estimate.cycleDay, L) - 0.5;

  const progress = useMotionValue(reduce ? todayPos : 0);
  useEffect(() => {
    if (reduce) {
      progress.set(todayPos);
      return;
    }
    const controls = animate(progress, todayPos, { type: 'spring', bounce: 0, duration: 1.6, delay: 0.15 });
    return () => controls.stop();
  }, [todayPos, reduce, progress]);

  const markerX = useTransform(progress, (p) => polar(R, p / L)[0]);
  const markerY = useTransform(progress, (p) => polar(R, p / L)[1]);
  const elapsedPath = useTransform(progress, (p) => (p > 0.05 ? arcPath(R - STROKE / 2 - 10, 0, Math.max(0.0001, p / L)) : ''));

  const segments: { d: string; colour: string }[] = [];
  for (let x = 0; x < L; x += STEP) {
    const to = Math.min(L, x + STEP);
    segments.push({ d: arcPath(R, x / L, Math.min(1, to / L + 0.0015)), colour: colourAt(x + STEP / 2, spans, L, wrapMargin) });
  }

  const ov = spans.find((s) => s.phase === 'ovulatory');
  const halos: { phase: Phase; from: number; to: number; label: string }[] = [
    { phase: 'menstrual', from: (L - wrapMargin) / L, to: (L + wrapMargin) / L, label: 'Next period window' },
  ];
  if (ov) halos.push({ phase: 'ovulatory', from: (ov.startDay - 1 - ov.edgeMargin) / L, to: (ov.endDay + ov.edgeMargin) / L, label: 'Ovulation window' });

  return (
    <svg
      className="dial"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={size}
      height={size}
      role="img"
      aria-label={`Cycle day ${estimate.cycleDay} of about ${L}. Likely ${PHASE_LABELS[estimate.phase].toLowerCase()} phase.`}
    >
      <defs>
        <path id={`${id}-label`} d={arcPath(R + STROKE / 2 + 14, 0, 0.9999)} />
        <path id={`${id}-label-rev`} d={reversedCircle(R + STROKE / 2 + 22)} />
        <filter id={`${id}-bead`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.22" />
        </filter>
      </defs>

      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--sunken)" strokeWidth={STROKE + 10} />

      {halos.map((h) => (
        <g key={h.phase} className="dial-halo" aria-label={h.label}>
          <path d={arcPath(R + STROKE / 2 + 5, Math.max(0, h.from), Math.min(1, h.to))} stroke={`var(--${h.phase})`} strokeOpacity={0.32} strokeWidth={6} strokeLinecap="round" fill="none" />
          {h.from < 0 ? <path d={arcPath(R + STROKE / 2 + 5, 1 + h.from, 0.9999)} stroke={`var(--${h.phase})`} strokeOpacity={0.32} strokeWidth={6} strokeLinecap="round" fill="none" /> : null}
          {h.to > 1 ? <path d={arcPath(R + STROKE / 2 + 5, 0.0001, h.to - 1)} stroke={`var(--${h.phase})`} strokeOpacity={0.32} strokeWidth={6} strokeLinecap="round" fill="none" /> : null}
        </g>
      ))}

      <g>
        {segments.map((s, i) => (
          <path key={i} d={s.d} style={{ stroke: s.colour }} strokeWidth={STROKE} fill="none" />
        ))}
      </g>

      {Array.from({ length: L }, (_, i) => {
        const [x, y] = polar(R - STROKE / 2 - 22, (i + 0.5) / L);
        const week = (i + 1) % 7 === 0;
        return <circle key={i} cx={x} cy={y} r={week ? 2.2 : 1.3} fill="var(--ink-3)" opacity={week ? 0.75 : 0.4} />;
      })}

      <motion.path d={elapsedPath} stroke="var(--ink)" strokeOpacity={0.55} strokeWidth={2.5} strokeLinecap="round" fill="none" />

      <text className="dial-label" aria-hidden="true">
        {LABEL_ORDER.map((phase) => {
          const span = spans.find((s) => s.phase === phase);
          if (!span || span.endDay - span.startDay < 1) return null;
          const mid = (span.startDay - 1 + span.endDay) / 2 / L;
          const lower = mid > 0.25 && mid < 0.75;
          return (
            <textPath
              key={phase}
              href={`#${id}-label${lower ? '-rev' : ''}`}
              startOffset={`${(lower ? 1 - mid : mid) * 100}%`}
              textAnchor="middle"
              fill={`var(--${phase}-ink)`}
            >
              {PHASE_LABELS[phase].toUpperCase()}
            </textPath>
          );
        })}
      </text>

      <motion.g style={{ x: markerX, y: markerY }}>
        <circle r={STROKE / 2 + 4} fill="var(--elevated)" filter={`url(#${id}-bead)`} />
        <circle r={STROKE / 2 - 3} fill="none" stroke="var(--phase)" strokeWidth={4} />
        <circle r={4.5} fill="var(--ink)" />
      </motion.g>
    </svg>
  );
}
