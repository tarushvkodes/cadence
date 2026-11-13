import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Glass } from '../../../src/ui/Glass.tsx';
import { AppShot } from '../kit/AppShot.tsx';
import { Callout } from '../kit/Callout.tsx';
import { ASIDE, focus, FULL, REST } from '../kit/camera.ts';
import { ClickSounds } from '../kit/Sounds.tsx';
import { StepHeader } from '../kit/StepHeader.tsx';
import { beatMap, click, mark, pad, rects, union } from '../kit/takes.ts';
import { C, FONT, PHASE, presence, SHADOW } from '../kit/theme.ts';
import { chapter, line, word } from '../timeline.ts';

/** The one sentence the whole app is built around, set large over the plan. */
const Promise: React.FC<{ from: number; until: number }> = ({ from, until }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = presence(frame, fps, from, until, 10);
  if (p <= 0.001) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 410, display: 'flex', justifyContent: 'center', opacity: p, transform: `translateY(${(1 - p) * 24}px) scale(${0.98 + 0.02 * p})` }}>
      <Glass radius={34} frost={22} style={{ padding: '34px 56px', boxShadow: SHADOW.lift }}>
        <div style={{ font: `500 72px/1.08 ${FONT.serif}`, letterSpacing: '-0.026em', color: C.ink, whiteSpace: 'nowrap' }}>Nothing changes until you approve it.</div>
      </Glass>
    </div>
  );
};

/** Step 4: approving, declining and undoing suggestions, then the plan with what is still waiting. */
export const Decide: React.FC = () => {
  const c = chapter('decide');
  const len = c.end - c.from;
  const morph = line('decide.1').localEnd - 8;
  const d2 = line('decide.2');
  const d3 = line('decide.3');
  const d6 = line('decide.6');

  const cards = rects('guide-plan', 'cards', ['card', 'head', 'i0', 'i1', 'i2', 'change', 'reason'] as const);
  const decided = rects('guide-plan', 'decided', ['i0', 'i1', 'i2', 'i3'] as const);
  const undone = rects('guide-plan', 'undone', ['i0', 'i1', 'i2'] as const);
  const plan = rects('guide-plan', 'plan', ['week', 'ghost', 'inline', 'bar'] as const);
  const cardsAt = mark('guide-plan', 'cards').frame;
  const planAt = mark('guide-plan', 'plan').frame;
  const [approve0, approve1, decline3, undo1, toPlan] = [1, 2, 3, 4, 5].map((i) => click('guide-plan', i));
  if (!approve0 || !approve1 || !decline3 || !undo1 || !toPlan) throw new Error('guide-plan clicks');

  const time = beatMap([
    [0, cardsAt],
    [word('decide.3', 'approve') + 2, approve0.frame],
    [word('decide.3', 'like'), approve1.frame],
    [word('decide.3', 'decline') + 2, decline3.frame],
    [word('decide.5', 'Undo') + 2, undo1.frame],
    [d6.local + 6, toPlan.frame],
    [word('decide.6', 'ghost') - 4, planAt],
  ]);

  return (
    <AbsoluteFill>
      <AppShot
        take="guide-plan"
        time={time}
        start={ASIDE}
        cam={[
          { at: morph, to: focus(pad(union(cards.head, cards.i0), 40, 30), FULL, 1.5), dur: 34 },
          { at: d2.local + 6, to: focus(pad(cards.i0, 40, 50), FULL, 1.75), dur: 34 },
          { at: d3.local - 6, to: focus(pad(union(cards.i0, cards.i2), 50, 40), FULL, 1.3), dur: 34 },
          { at: word('decide.3', 'decline') - 26, to: focus(pad(union(decided.i2, decided.i3), 50, 40), FULL, 1.3), dur: 30 },
          { at: line('decide.4').local - 8, to: focus(pad(union(undone.i0, undone.i1), 50, 40), FULL, 1.3), dur: 30 },
          { at: d6.local, to: { ...REST }, dur: 30 },
          { at: word('decide.6', 'ghost') - 14, to: focus(pad(plan.ghost, 360, 230), FULL, 1.6), dur: 34 },
          { at: word('decide.6', 'nothing') - 10, to: { ...REST, z: 0.86 }, dur: 34 },
          { at: len - 30, to: ASIDE, dur: 30 },
        ]}
        overlay={({ cam, frame }) => (
          <>
            <Callout cam={cam} frame={frame} rect={cards.change} from={word('decide.2', 'changes') - 4} until={word('decide.2', 'why')} label="What changes" side="left" inset={6} />
            <Callout cam={cam} frame={frame} rect={cards.reason} from={word('decide.2', 'why')} until={d3.local - 4} label="Why it helps" side="left" inset={6} color={PHASE.follicular.solid} />
            <Callout cam={cam} frame={frame} rect={undone.i1} from={word('decide.5', 'back') - 2} until={d6.local - 4} label="Change reverted" side="right" />
            <Callout cam={cam} frame={frame} rect={plan.ghost} from={word('decide.6', 'ghost')} until={word('decide.6', 'nothing') - 6} label="Still waiting for you" side="right" inset={6} />
          </>
        )}
      />
      <Promise from={word('decide.6', 'nothing') + 6} until={len - 30} />
      <ClickSounds take="guide-plan" time={time} length={len} />
      <StepHeader step={4} name="You decide" morphAt={morph} until={len} />
    </AbsoluteFill>
  );
};
