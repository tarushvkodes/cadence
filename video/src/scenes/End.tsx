import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Ring } from '../kit/Ring.tsx';
import { Sfx } from '../kit/Sounds.tsx';
import { stepTurn } from '../kit/StepHeader.tsx';
import { C, CLAMP, ease, FONT, rise, SHADOW, tween } from '../kit/theme.ts';
import { line } from '../timeline.ts';

const IDEAS = [
  { id: 'end.2', text: 'It plans around how you feel, not your phase.' },
  { id: 'end.3', text: 'The AI suggests. You decide.' },
  { id: 'end.4', text: 'It knows when to send you to a clinician.' },
];

const RING = { x: 1330, y: 300, size: 440 };

/**
 * The film hands back to the talk: three ideas to remember, where the code lives, and the ring
 * closing around what comes next. The narration credit stays on the card to the last frame.
 */
export const End: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e1 = line('end.1');
  const e5 = line('end.5');
  const e6 = line('end.6');

  const eyebrow = rise(frame, e1.local, fps);
  const shows = IDEAS.map((i) => rise(frame, line(i.id).local + 2, fps));
  const dim = interpolate(frame, [e5.local - 6, e5.local + 12], [1, 0.5], CLAMP);
  const repo = rise(frame, e5.local + 4, fps);
  const credit = rise(frame, e5.local + 20, fps);

  const ringIn = rise(frame, 2, fps);
  const turn = interpolate(tween(frame, e1.local, 60, ease.inOut), [0, 1], [stepTurn(7), 1]);
  const close = tween(frame, e6.local - 8, 24, ease.out);
  const next = rise(frame, e6.local + 6, fps);
  const nextLine = rise(frame, e6.local + 14, fps);
  const sw = RING.size * 0.07;

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: RING.x - RING.size / 2, top: RING.y, opacity: ringIn, transform: `scale(${0.94 + 0.06 * ringIn})` }}>
        <Ring size={RING.size} stroke={sw} gap={sw * 1.3} bead={close < 1 ? turn : null} dot={close} />
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <div style={{ font: `600 20px/1 ${FONT.sans}`, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ink3, opacity: next, transform: `translateY(${(1 - next) * 10}px)`, marginBottom: 14 }}>Up next</div>
            <div style={{ font: `500 44px/1.08 ${FONT.serif}`, letterSpacing: '-0.022em', color: C.ink, opacity: nextLine, transform: `translateY(${(1 - nextLine) * 14}px)` }}>
              The ethics
              <br />
              behind it
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 150, top: 176, width: 1000 }}>
        <div style={{ font: `600 26px/1 ${FONT.sans}`, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ink2, opacity: eyebrow, transform: `translateY(${(1 - eyebrow) * 14}px)`, marginBottom: 46 }}>
          Three things to remember
        </div>
        {IDEAS.map((idea, i) => {
          const s = shows[i] ?? 0;
          return (
            <div key={idea.id} style={{ display: 'flex', alignItems: 'baseline', gap: 28, marginBottom: 34, opacity: s * dim, transform: `translateY(${(1 - s) * 26}px)` }}>
              <span style={{ font: `600 30px/1 ${FONT.sans}`, color: C.ink3, width: 30, flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
              <span style={{ font: `500 58px/1.1 ${FONT.serif}`, letterSpacing: '-0.024em', color: C.ink, textWrap: 'balance' }}>{idea.text}</span>
            </div>
          );
        })}
        <div style={{ marginTop: 26, display: 'inline-block', opacity: repo, transform: `translateY(${(1 - repo) * 20}px)` }}>
          <div style={{ background: C.elevated, borderRadius: 18, padding: '18px 26px', boxShadow: SHADOW.lift, border: `1px solid ${C.line}` }}>
            <div style={{ font: `600 18px/1 ${FONT.sans}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink3, marginBottom: 10 }}>The code, on GitHub</div>
            <div style={{ font: `500 36px/1 ${FONT.mono}`, color: C.ink, letterSpacing: '-0.01em' }}>github.com/tarushvkodes/cadence</div>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 150, top: 884, opacity: credit * 0.95, transform: `translateY(${(1 - credit) * 10}px)`, font: `500 21px/1.3 ${FONT.sans}`, color: C.ink3 }}>
        Narration: an AI clone of a team member's voice, made with his consent.
      </div>

      <Sfx at={e1.local + 56} name="tick" />
      <Sfx at={e6.local - 8} name="chime" gain={0.8} />
    </AbsoluteFill>
  );
};
