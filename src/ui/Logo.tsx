import { PHASES } from '../domain/types.ts';

/** Four arcs of one ring, one per phase, with a gap where the cycle starts again. */
export function LogoMark({ size = 28 }: { size?: number }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  const gap = 4.5 + 1.4;
  const share = [0.2, 0.3, 0.15, 0.35];
  const offsets = share.map((_, i) => share.slice(0, i).reduce((sum, v) => sum + v * c, 0));
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <g transform="rotate(-90 16 16)">
        {PHASES.map((phase, i) => {
          const len = c * (share[i] as number) - gap;
          return (
            <circle
              key={phase}
              cx="16"
              cy="16"
              r={r}
              fill="none"
              stroke={`var(--${phase})`}
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-((offsets[i] as number) + gap / 2)}
            />
          );
        })}
      </g>
      <circle cx="16" cy="5" r="2.6" fill="var(--ink)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <LogoMark size={26} />
      <span className="serif">Cadence</span>
    </span>
  );
}
