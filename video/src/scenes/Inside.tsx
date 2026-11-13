import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { AppShot } from '../kit/AppShot.tsx';
import { Callout } from '../kit/Callout.tsx';
import { ASIDE, focus, FULL, REST, type CamKey } from '../kit/camera.ts';
import { StepHeader } from '../kit/StepHeader.tsx';
import { beatMap, mark, pad, rects, take } from '../kit/takes.ts';
import { CLAMP } from '../kit/theme.ts';
import { chapter, line, word } from '../timeline.ts';

/** Step 7: the evidence labels on Learn, and the system prompt shown word for word in Settings. */
export const Inside: React.FC = () => {
  const c = chapter('inside');
  const len = c.end - c.from;
  const morph = line('inside.1').localEnd - 8;
  const i3 = line('inside.3');
  const swap = i3.local - 6;

  const top = rects('learn', 'top', ['headline', 'key'] as const);
  const claims = rects('learn', 'claims', ['claim'] as const);
  const prompt = rects('settings', 'prompt', ['prompt', 'note'] as const);
  const claimsAt = mark('learn', 'claims').frame;
  const promptAt = mark('settings', 'prompt').frame;

  const learnTime = beatMap([
    [morph - 2, 40],
    [word('inside.2', 'evidence') + 4, 48],
    [word('inside.2', 'source') + 30, claimsAt],
  ]);
  const settingsTime = beatMap([
    [swap, 20],
    [word('inside.3', 'exact'), promptAt],
    [len, Math.min(take('settings').frames - 1, promptAt + (len - word('inside.3', 'exact')))],
  ]);

  const cam: CamKey[] = [
    { at: morph, to: focus(pad(top.key, 40, 60), FULL, 1.6), dur: 34 },
    { at: word('inside.2', 'evidence') + 4, to: focus(pad(claims.claim, 60, 70), FULL, 1.3), dur: 44 },
    { at: swap - 4, to: { ...REST }, dur: 26 },
    { at: word('inside.3', 'exact') - 8, to: focus({ x: prompt.prompt.x - 30, y: prompt.note.y - 20, w: prompt.prompt.w + 60, h: 560 }, FULL, 1.4), dur: 36 },
    { at: len - 30, to: ASIDE, dur: 30 },
  ];

  return (
    <AbsoluteFill>
      <AppShot
        take="learn"
        time={learnTime}
        start={ASIDE}
        cam={cam}
        opacity={(f) => 1 - interpolate(f, [swap + 6, swap + 14], [0, 1], CLAMP)}
        overlay={({ cam: k, frame }) => (
          <>
            <Callout cam={k} frame={frame} rect={top.key} from={word('inside.2', 'labels')} until={word('inside.2', 'evidence') + 2} label="How strong the evidence is" side="bottom" inset={10} />
            <Callout cam={k} frame={frame} rect={claims.claim} from={word('inside.2', 'source') + 24} until={swap} label="Every claim links its source" side="right" inset={10} />
          </>
        )}
      />
      <AppShot
        take="settings"
        time={settingsTime}
        start={ASIDE}
        cam={cam}
        opacity={(f) => interpolate(f, [swap + 4, swap + 14], [0, 1], CLAMP)}
        overlay={({ cam: k, frame }) => (
          <Callout cam={k} frame={frame} rect={prompt.note} from={word('inside.3', 'exact') + 6} until={word('inside.3', 'exact') + 46} label="The whole system prompt, word for word" side="top" inset={6} />
        )}
      />
      <StepHeader step={7} name="See inside" morphAt={morph} until={len} />
    </AbsoluteFill>
  );
};
