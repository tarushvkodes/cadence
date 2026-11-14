import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Ring } from '../kit/Ring.tsx';
import { Sfx } from '../kit/Sounds.tsx';
import { C, CLAMP, ease, FONT, rise, tween } from '../kit/theme.ts';
import { chapter, line, word } from '../timeline.ts';

/** One quiet fact under the tagline: who it is for, or where it runs. */
const Fact: React.FC<{ show: number; children: React.ReactNode }> = ({ show, children }) => (
  <span style={{ opacity: show, transform: `translateY(${(1 - show) * 14}px)`, display: 'inline-block' }}>{children}</span>
);

/** Cold open: the ring draws itself from the first frame, the ink dot lands, the wordmark joins it. */
export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = chapter('title');
  const len = c.end - c.from;
  const t1 = line('title.1');
  const t2 = line('title.2');

  const drawn = tween(frame, 0, 28, ease.inOut);
  const dot = rise(frame, 22, fps);
  const lock = tween(frame, t1.local - 4, 34, ease.inOut);
  const wordmark = rise(frame, t1.local + 6, fps);
  const tag = rise(frame, t2.local + 4, fps);
  const who = rise(frame, word('title.3', 'women') - 2, fps);
  const where = rise(frame, word('title.3', 'runs') - 2, fps);
  const exit = tween(frame, len - 14, 14, ease.in);

  const ringSize = interpolate(lock, [0, 1], [340, 190]);
  const ringX = interpolate(lock, [0, 1], [960 - 170, 960 - 330 - 190 / 2 - 20]);
  const ringY = interpolate(lock, [0, 1], [540 - 170, 470 - 95]);
  const dotSep = interpolate(where, [0, 1], [0, 1], CLAMP);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit, transform: `translateY(${-24 * exit}px)` }}>
      <div style={{ position: 'absolute', left: ringX, top: ringY }}>
        <Ring size={ringSize} drawn={drawn} dot={dot} stroke={ringSize * 0.14} gap={ringSize * 0.14 * 1.3} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 960 - 330 + 190 / 2 + 24,
          top: 470,
          transform: `translateY(-50%) translateX(${(1 - wordmark) * 24}px)`,
          opacity: wordmark,
          font: `500 168px/1 ${FONT.serif}`,
          letterSpacing: '-0.03em',
          color: C.ink,
        }}
      >
        Cadence
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 640,
          textAlign: 'center',
          opacity: tag,
          transform: `translateY(${(1 - tag) * 20}px)`,
          font: `400 54px/1.2 ${FONT.serif}`,
          letterSpacing: '-0.015em',
          color: C.ink2,
        }}
      >
        Your week, in step with your cycle.
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 744, textAlign: 'center', font: `500 28px/1 ${FONT.sans}`, letterSpacing: '-0.01em', color: C.ink2 }}>
        <Fact show={who}>For women around 17 to 25</Fact>
        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 99, background: C.ink3, margin: '0 22px', verticalAlign: 'middle', opacity: dotSep }} />
        <Fact show={where}>Runs in the browser, on a phone or a laptop</Fact>
      </div>
      <Sfx at={0} name="whoosh" gain={0.7} />
      <Sfx at={22} name="chime" />
    </AbsoluteFill>
  );
};
