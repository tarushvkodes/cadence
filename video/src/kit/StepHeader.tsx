import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Glass } from '../../../src/ui/Glass.tsx';
import { Ring } from './Ring.tsx';
import { Sfx } from './Sounds.tsx';
import { C, CLAMP, ease, FONT, rise, SHADOW, tween } from './theme.ts';

/** Steps sit on the ring like days on the dial: step n is at n / 8 of a turn. */
export const stepTurn = (step: number) => step / 8;

const BIG = { left: 150, ring: 118, eyebrow: 34, name: 104, gap: 30 };
const CHIP = { left: 38, top: 28, k: 0.33, padX: 20, padY: 12 };

/** Ring, eyebrow and name at scale `k`; the big title and the chip are this one layout at two sizes. */
const Block: React.FC<{ k: number; step: number; name: string; bead: number; eyebrowIn?: number; nameIn?: number }> = ({ k, step, name, bead, eyebrowIn = 1, nameIn = 1 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: BIG.gap * k }}>
    <Ring size={BIG.ring * k} bead={bead} beadPhase="luteal" stroke={BIG.ring * k * 0.11} />
    <div>
      <div
        style={{
          font: `600 ${BIG.eyebrow * k}px/1.25 ${FONT.sans}`,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: C.ink2,
          opacity: eyebrowIn,
          transform: `translateY(${(1 - eyebrowIn) * 18 * k}px)`,
          marginBottom: 10 * k,
        }}
      >
        Step {step}
      </div>
      <div
        style={{
          font: `500 ${BIG.name * k}px/1.04 ${FONT.serif}`,
          letterSpacing: '-0.028em',
          color: C.ink,
          whiteSpace: 'nowrap',
          opacity: nameIn,
          transform: `translateY(${(1 - nameIn) * 26 * k}px)`,
        }}
      >
        {name}
      </div>
    </div>
  </div>
);

/**
 * The step title. It opens large on the left while the window waits on the right, then shrinks into
 * a Liquid Glass chip in the top-left corner that stays for the rest of the step.
 */
export const StepHeader: React.FC<{ step: number; name: string; morphAt: number; until: number }> = ({ step, name, morphAt, until }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const eyebrowIn = rise(frame, 2, fps);
  const nameIn = rise(frame, 6, fps);
  const bead = interpolate(tween(frame, 4, 34, ease.inOut), [0, 1], [stepTurn(step - 1), stepTurn(step)]);
  const m = tween(frame, morphAt, 28, ease.inOut);
  const exit = tween(frame, until - 10, 10, ease.in);
  if (exit >= 1) return null;

  const blockH = BIG.eyebrow * 1.25 + 10 + BIG.name * 1.04;
  const s = interpolate(m, [0, 1], [1, CHIP.k]);
  const x = interpolate(m, [0, 1], [BIG.left, CHIP.left + CHIP.padX]);
  const y = interpolate(m, [0, 1], [540 - blockH / 2, CHIP.top + CHIP.padY]);
  const swap = interpolate(m, [0.72, 1], [0, 1], CLAMP);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - exit, pointerEvents: 'none' }}>
      {swap < 1 ? (
        <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${s})`, transformOrigin: '0 0', opacity: 1 - swap }}>
          <Block k={1} step={step} name={name} bead={bead} eyebrowIn={eyebrowIn} nameIn={nameIn} />
        </div>
      ) : null}
      {swap > 0 ? (
        <Glass
          radius={40}
          frost={14}
          style={{
            position: 'absolute',
            left: CHIP.left,
            top: CHIP.top,
            padding: `${CHIP.padY}px ${CHIP.padX + 6}px ${CHIP.padY}px ${CHIP.padX}px`,
            boxShadow: SHADOW.lift,
            opacity: swap,
          }}
        >
          <Block k={CHIP.k} step={step} name={name} bead={bead} />
        </Glass>
      ) : null}
      <Sfx at={4} name="tick" />
      <Sfx at={morphAt - 4} name="whoosh" gain={0.8} />
    </div>
  );
};
