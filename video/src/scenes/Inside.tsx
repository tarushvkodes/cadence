import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { AppShot } from '../kit/AppShot.tsx';
import { Callout } from '../kit/Callout.tsx';
import { ASIDE, focus, FULL, REST, type CamKey } from '../kit/camera.ts';
import { StepHeader } from '../kit/StepHeader.tsx';
import { beatMap, mark, pad, rects, take, union } from '../kit/takes.ts';
import { CLAMP, ease, PHASE, tween } from '../kit/theme.ts';
import { chapter, line, word } from '../timeline.ts';

/** Step 7: the three evidence labels on Learn, each named as it is said, then the system prompt in Settings. */
export const Inside: React.FC = () => {
  const c = chapter('inside');
  const len = c.end - c.from;
  const morph = line('inside.1').localEnd - 8;
  const i2 = line('inside.2');
  const i3 = line('inside.3');
  const swap = i3.local - 6;

  const top = rects('learn', 'top', ['headline', 'key', 'strong', 'mixed', 'weak'] as const);
  const claims = rects('learn', 'claims', ['claim'] as const);
  const prompt = rects('settings', 'prompt', ['prompt', 'note'] as const);
  const topAt = mark('learn', 'top').frame;
  const claimsAt = mark('learn', 'claims').frame;
  const promptAt = mark('settings', 'prompt').frame;
  const source = word('inside.2', 'source');

  const learnTime = beatMap([
    [morph - 2, topAt - 8],
    [source - 4, topAt],
    [i2.localEnd + 20, claimsAt],
  ]);
  const settingsTime = beatMap([
    [swap, 20],
    [word('inside.3', 'instructions'), promptAt],
    [len, Math.min(take('settings').frames - 1, promptAt + (len - word('inside.3', 'instructions')))],
  ]);

  const cam: CamKey[] = [
    { at: morph, to: focus(pad(union(top.headline, top.key), 40, 40), FULL, 1.5), dur: 34 },
    { at: source - 6, to: focus(pad(claims.claim, 60, 70), FULL, 1.3), dur: 44 },
    { at: swap - 4, to: { ...REST }, dur: 26 },
    { at: word('inside.3', 'instructions') - 8, to: focus({ x: prompt.prompt.x - 30, y: prompt.note.y - 20, w: prompt.prompt.w + 60, h: 560 }, FULL, 1.4), dur: 36 },
    { at: len - 30, to: ASIDE, dur: 30 },
  ];

  return (
    <AbsoluteFill>
      <AppShot
        take="learn"
        time={learnTime}
        start={ASIDE}
        cam={cam}
        opacity={(f) => tween(f, 0, 12, ease.out) * (1 - interpolate(f, [swap + 2, swap + 10], [0, 1], CLAMP))}
        overlay={({ cam: k, frame }) => (
          <>
            <Callout cam={k} frame={frame} rect={top.strong} from={word('inside.2', 'well') - 2} until={source - 8} inset={6} radius={10} color={PHASE.follicular.solid} />
            <Callout cam={k} frame={frame} rect={top.mixed} from={word('inside.2', 'mixed') - 2} until={source - 8} inset={6} radius={10} color={PHASE.ovulatory.solid} />
            <Callout cam={k} frame={frame} rect={top.weak} from={word('inside.2', 'weak') - 2} until={source - 8} inset={6} radius={10} color={PHASE.menstrual.solid} />
            <Callout cam={k} frame={frame} rect={claims.claim} from={i2.localEnd + 22} until={swap} label="Each claim, with its source" side="right" inset={10} />
          </>
        )}
      />
      <AppShot
        take="settings"
        time={settingsTime}
        start={ASIDE}
        cam={cam}
        opacity={(f) => interpolate(f, [swap + 7, swap + 15], [0, 1], CLAMP) * (1 - tween(f, len - 14, 14, ease.in))}
        overlay={({ cam: k, frame }) => (
          <Callout cam={k} frame={frame} rect={prompt.note} from={word('inside.3', 'instructions') + 6} until={len - 34} inset={6} />
        )}
      />
      <StepHeader step={7} name="See inside" morphAt={morph} until={len} />
    </AbsoluteFill>
  );
};
