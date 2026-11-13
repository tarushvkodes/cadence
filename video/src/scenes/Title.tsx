import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Ring } from '../kit/Ring.tsx';
import { Sfx } from '../kit/Sounds.tsx';
import { C, CLAMP, ease, FONT, rise, tween } from '../kit/theme.ts';
import { chapter, line } from '../timeline.ts';

/** Cold open: the ring draws itself, the ink dot lands where the cycle starts, the wordmark joins it. */
export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = chapter('title');
  const len = c.end - c.from;
  const t1 = line('title.1');
  const t2 = line('title.2');

  const drawn = tween(frame, 4, 50, ease.inOut);
  const dot = rise(frame, 50, fps);
  const lock = tween(frame, t1.local - 4, 34, ease.inOut);
  const word = rise(frame, t1.local + 6, fps);
  const tag = rise(frame, t2.local + 4, fps);
  const exit = tween(frame, len - 14, 14, ease.in);

  const ringSize = interpolate(lock, [0, 1], [340, 190]);
  const ringX = interpolate(lock, [0, 1], [960 - 170, 960 - 330 - 190 / 2 - 20]);
  const ringY = interpolate(lock, [0, 1], [540 - 170, 470 - 95]);

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
          transform: `translateY(-50%) translateX(${(1 - word) * 24}px)`,
          opacity: word,
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
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 742,
          textAlign: 'center',
          opacity: interpolate(tag, [0.4, 1], [0, 1], CLAMP) * 0.9,
          font: `600 20px/1 ${FONT.sans}`,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: C.ink3,
        }}
      >
        Runs in the browser, on a phone or laptop
      </div>
      <Sfx at={48} name="chime" />
    </AbsoluteFill>
  );
};
