import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Ring } from '../kit/Ring.tsx';
import { C, CLAMP, ease, FONT, PHASE, rise, tween } from '../kit/theme.ts';
import { chapter, line, word } from '../timeline.ts';

const Statement: React.FC<{ show: number; dim: number; children: React.ReactNode; size?: number }> = ({ show, dim, children, size = 74 }) => (
  <div
    style={{
      font: `500 ${size}px/1.08 ${FONT.serif}`,
      letterSpacing: '-0.026em',
      color: C.ink,
      opacity: show * interpolate(dim, [0, 1], [1, 0.32]),
      transform: `translateY(${(1 - show) * 28}px)`,
      textWrap: 'balance',
    }}
  >
    {children}
  </div>
);

/** The honest premise, in the Learn screen's own words, and the research it rests on. */
export const Idea: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = chapter('idea');
  const len = c.end - c.from;
  const i1 = line('idea.1');
  const i3 = line('idea.3');

  const eyebrow = rise(frame, i1.local, fps);
  const s1 = rise(frame, word('idea.2', 'Your'), fps);
  const src = rise(frame, word('idea.2', 'Your') + 22, fps);
  const s2 = rise(frame, word('idea.2', 'but'), fps);
  const dim = tween(frame, i3.local - 2, 22, ease.inOut);
  const s3 = rise(frame, i3.local + 8, fps);
  const exit = tween(frame, len - 12, 12, ease.in);
  const ringIn = rise(frame, 4, fps);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <div style={{ position: 'absolute', right: 150, top: 540 - 210, opacity: 0.9 * ringIn, transform: `rotate(${interpolate(frame, [0, len], [-6, 6])}deg) scale(${0.94 + 0.06 * ringIn})` }}>
        <Ring size={420} stroke={420 * 0.06} gap={420 * 0.06 * 1.6} bead={interpolate(frame, [0, len], [0.02, 0.1], CLAMP)} />
      </div>
      <div style={{ position: 'absolute', left: 160, top: 200, width: 1200 }}>
        <div
          style={{
            font: `600 26px/1 ${FONT.sans}`,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: C.ink2,
            opacity: eyebrow,
            transform: `translateY(${(1 - eyebrow) * 14}px)`,
            marginBottom: 34,
          }}
        >
          The idea
        </div>
        <div style={{ maxWidth: 1080 }}>
        <Statement show={s1} dim={dim}>
          Your phase does not change what you are capable of.
        </Statement>
        </div>
        <div style={{ height: 20 }} />
        <div
          style={{
            font: `500 21px/1.4 ${FONT.sans}`,
            color: C.ink3,
            opacity: src * interpolate(dim, [0, 1], [1, 0.55]),
            transform: `translateY(${(1 - src) * 10}px)`,
            maxWidth: 900,
          }}
        >
          A meta-analysis of 102 studies found no robust change in cognitive performance across the cycle. Jang et al., PLOS ONE, 2025.
        </div>
        <div style={{ height: 40 }} />
        <div style={{ maxWidth: 1080 }}>
          <Statement show={s2} dim={dim} size={60}>
            How you feel can change, and that differs from person to person.
          </Statement>
        </div>
        <div style={{ height: 48 }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 20,
            opacity: s3,
            transform: `translateY(${(1 - s3) * 28}px)`,
            font: `500 70px/1.08 ${FONT.serif}`,
            letterSpacing: '-0.026em',
            color: C.ink,
            whiteSpace: 'nowrap',
          }}
        >
          <span>
            So Cadence plans around <span style={{ boxShadow: `inset 0 -0.16em 0 ${PHASE.luteal.tint}` }}>what you log.</span>
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
