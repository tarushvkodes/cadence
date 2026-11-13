import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Ring } from '../kit/Ring.tsx';
import { Sfx } from '../kit/Sounds.tsx';
import { stepTurn } from '../kit/StepHeader.tsx';
import { C, CLAMP, ease, FONT, rise, SHADOW, tween } from '../kit/theme.ts';
import { line, word } from '../timeline.ts';

const IDEAS = [
  { n: 1, text: 'It plans around how you feel, not your phase.' },
  { n: 2, text: 'The AI suggests. You decide.' },
  { n: 3, text: 'It knows when to send you to a clinician.' },
];

/** Three ideas to remember, where the code lives, and the ring closing into the wordmark. */
export const End: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e1 = line('end.1');
  const e4 = line('end.4');
  const e7 = line('end.7');
  const e8 = line('end.8');

  const shows = [rise(frame, line('end.2').local + 2, fps), rise(frame, word('end.3', 'AI') - 2, fps), rise(frame, word('end.3', 'knows') - 2, fps)];
  const eyebrow = rise(frame, e1.local, fps);
  const listOut = tween(frame, e7.local - 4, 16, ease.in);
  const repo = rise(frame, e4.local + 2, fps);
  const more = rise(frame, word('end.5', 'presentation'), fps);
  const sources = rise(frame, line('end.6').local + 4, fps);
  const thanks = rise(frame, e7.local + 14, fps);
  const finale = tween(frame, e8.local - 6, 40, ease.inOut);
  const word9 = rise(frame, line('end.9').local - 4, fps);

  const turn = interpolate(tween(frame, e1.local, 60, ease.inOut), [0, 1], [stepTurn(7), 1]);
  const ringSize = interpolate(finale, [0, 1], [430, 190]);
  const ringX = interpolate(finale, [0, 1], [1330, 960 - 330 - 95 - 20]);
  const ringY = interpolate(finale, [0, 1], [540 - 215, 470 - 95]);
  const ringIn = rise(frame, 2, fps);
  const dot = tween(frame, e1.local + 56, 14, ease.out);

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: ringX, top: ringY, opacity: ringIn, transform: `scale(${0.94 + 0.06 * ringIn})` }}>
        <Ring size={ringSize} stroke={ringSize * interpolate(finale, [0, 1], [0.07, 0.14])} gap={ringSize * interpolate(finale, [0, 1], [0.07, 0.14]) * 1.3} bead={dot < 1 ? turn : null} dot={dot} />
      </div>

      <div style={{ position: 'absolute', left: 150, top: 190, width: 1060, opacity: 1 - listOut, transform: `translateY(${-20 * listOut}px)` }}>
        <div style={{ font: `600 26px/1 ${FONT.sans}`, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ink2, opacity: eyebrow, transform: `translateY(${(1 - eyebrow) * 14}px)`, marginBottom: 46 }}>
          Three things to remember
        </div>
        {IDEAS.map((idea, i) => {
          const s = shows[i] ?? 0;
          const dim = i < 2 ? interpolate(frame, [e4.local - 6, e4.local + 12], [1, 0.38], CLAMP) : interpolate(frame, [e4.local - 6, e4.local + 12], [1, 0.38], CLAMP);
          return (
            <div key={idea.n} style={{ display: 'flex', alignItems: 'baseline', gap: 28, marginBottom: 34, opacity: s * dim, transform: `translateY(${(1 - s) * 26}px)` }}>
              <span style={{ font: `600 30px/1 ${FONT.sans}`, color: C.ink3, width: 30, flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{idea.n}</span>
              <span style={{ font: `500 60px/1.1 ${FONT.serif}`, letterSpacing: '-0.024em', color: C.ink, textWrap: 'balance' }}>{idea.text}</span>
            </div>
          );
        })}
        <div style={{ height: 20 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, opacity: repo, transform: `translateY(${(1 - repo) * 20}px)` }}>
          <div style={{ background: C.elevated, borderRadius: 18, padding: '18px 26px', boxShadow: SHADOW.lift, border: `1px solid ${C.line}` }}>
            <div style={{ font: `600 18px/1 ${FONT.sans}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink3, marginBottom: 10 }}>Open source</div>
            <div style={{ font: `500 34px/1 ${FONT.mono}`, color: C.ink, letterSpacing: '-0.01em' }}>github.com/tarushvkodes/cadence</div>
          </div>
        </div>
        <div style={{ marginTop: 26, font: `500 28px/1.45 ${FONT.sans}`, color: C.ink2 }}>
          <div style={{ opacity: more, transform: `translateY(${(1 - more) * 12}px)` }}>The rest of our presentation covers the resources behind it.</div>
          <div style={{ opacity: sources, transform: `translateY(${(1 - sources) * 12}px)` }}>Every claim in the app links to its source.</div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 470,
          textAlign: 'center',
          transform: `translateY(-50%) translateY(${(1 - thanks) * 24 - 60 * finale}px)`,
          opacity: thanks * (1 - finale),
          font: `500 120px/1 ${FONT.serif}`,
          letterSpacing: '-0.03em',
          color: C.ink,
        }}
      >
        Thank you.
      </div>

      <div
        style={{
          position: 'absolute',
          left: 749,
          top: 470,
          transform: `translateY(-50%) translateX(${(1 - word9) * 24}px)`,
          opacity: word9,
          font: `500 168px/1 ${FONT.serif}`,
          letterSpacing: '-0.03em',
          color: C.ink,
        }}
      >
        Cadence
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', opacity: word9, transform: `translateY(${(1 - word9) * 18}px)`, font: `400 54px/1.2 ${FONT.serif}`, letterSpacing: '-0.015em', color: C.ink2 }}>
        Your week, in step with your cycle.
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 742, textAlign: 'center', opacity: word9 * 0.9, font: `500 26px/1 ${FONT.mono}`, color: C.ink3 }}>github.com/tarushvkodes/cadence</div>

      <Sfx at={e1.local + 56} name="tick" />
      <Sfx at={line('end.9').local - 4} name="chime" />
    </AbsoluteFill>
  );
};
