import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AppShot } from '../kit/AppShot.tsx';
import { Callout } from '../kit/Callout.tsx';
import { ASIDE, focus, FULL, REST } from '../kit/camera.ts';
import { ClickSounds, Sfx } from '../kit/Sounds.tsx';
import { StepHeader } from '../kit/StepHeader.tsx';
import { beatMap, click, mark, pad, rects, union } from '../kit/takes.ts';
import { ease, PHASE } from '../kit/theme.ts';
import { chapter, line, word } from '../timeline.ts';

/**
 * Step 4, on the laptop, which slides in from the right as the phone leaves left. Each suggestion's
 * change and reason; approve two, decline one, undo one approval, each labelled as it happens; then
 * the Plan with the waiting change dashed, the locked events, and the approval bar.
 */
export const Decide: React.FC = () => {
  const c = chapter('decide');
  const len = c.end - c.from;
  const morph = line('decide.1').localEnd - 8;
  const d2 = line('decide.2');
  const d3 = line('decide.3');
  const d4 = line('decide.4');
  const d5 = line('decide.5');
  const d6 = line('decide.6');

  const id = 'guide-plan';
  const cards = rects(id, 'cards', ['head', 'i0', 'i1', 'i2', 'change', 'reason'] as const);
  const decided = rects(id, 'decided', ['i2', 'i3'] as const);
  const undone = rects(id, 'undone', ['i0', 'i1'] as const);
  const plan = rects(id, 'plan', ['ghost', 'bar'] as const);
  const locks = rects(id, 'locks', ['cls', 'shift', 'exam'] as const);
  const cardsAt = mark(id, 'cards').frame;
  const planAt = mark(id, 'plan').frame;
  const [approve0, approve1, decline3, undo1, toPlan] = [1, 2, 3, 4, 5].map((i) => click(id, i));
  if (!approve0 || !approve1 || !decline3 || !undo1 || !toPlan) throw new Error('guide-plan clicks');

  const a0 = word('decide.3', 'approve') - 2;
  const a1 = a0 + 28;
  const dc = a1 + 42;
  const un = dc + 50;
  const time = beatMap([
    [0, cardsAt],
    [a0, approve0.frame],
    [a1, approve1.frame],
    [dc, decline3.frame],
    [un, undo1.frame],
    [d4.local - 4, toPlan.frame],
    [word('decide.4', 'dashed') - 6, planAt],
  ]);

  return (
    <AbsoluteFill>
      <AppShot
        take={id}
        time={time}
        start={{ ...ASIDE, sx: 2500 }}
        cam={[
          { at: 0, to: ASIDE, dur: 30, curve: ease.out },
          { at: morph, to: focus(pad(union(cards.head, cards.i0), 40, 30), FULL, 1.5), dur: 34 },
          { at: d2.local + 6, to: focus(pad(cards.i0, 40, 50), FULL, 1.75), dur: 34 },
          { at: d3.local - 12, to: focus(pad(union(cards.i0, cards.i2), 50, 40), FULL, 1.3), dur: 30 },
          { at: dc - 30, to: focus(pad(union(decided.i2, decided.i3), 50, 40), FULL, 1.3), dur: 28 },
          { at: un - 34, to: focus(pad(union(undone.i0, undone.i1), 50, 40), FULL, 1.3), dur: 28 },
          { at: d4.local - 6, to: { ...REST }, dur: 30 },
          { at: word('decide.4', 'dashed') - 14, to: focus(pad(plan.ghost, 360, 230), FULL, 1.6), dur: 34 },
          { at: d5.local - 12, to: focus(pad(union(locks.cls, locks.shift, locks.exam), 70, 80), FULL, 1.45), dur: 36 },
          { at: d6.local + 2, to: focus({ x: 100, y: plan.bar.y - 440, w: 1240, h: plan.bar.h + 480 }, FULL, 1.4), dur: 36 },
          { at: len - 30, to: ASIDE, dur: 30 },
        ]}
        overlay={({ cam, frame }) => (
          <>
            <Callout cam={cam} frame={frame} rect={cards.change} from={word('decide.2', 'changes') - 4} until={word('decide.2', 'why')} label="What changes" side="left" inset={6} />
            <Callout cam={cam} frame={frame} rect={cards.reason} from={word('decide.2', 'why')} until={d3.local - 14} label="Why" side="left" inset={6} color={PHASE.follicular.solid} />
            <Callout cam={cam} frame={frame} rect={cards.i0} from={a0 + 4} until={dc - 34} label="Approved" side="left" color={PHASE.follicular.solid} />
            <Callout cam={cam} frame={frame} rect={cards.i1} from={a1 + 4} until={dc - 34} label="Approved" side="left" color={PHASE.follicular.solid} />
            <Callout cam={cam} frame={frame} rect={decided.i3} from={dc + 4} until={un - 36} label="Declined" side="left" color={PHASE.menstrual.solid} />
            <Callout cam={cam} frame={frame} rect={undone.i1} from={un + 6} until={d4.local - 8} label="Undone" sub="Back to waiting" side="left" />
            <Callout cam={cam} frame={frame} rect={plan.ghost} from={word('decide.4', 'dashed')} until={d5.local - 14} label="Still waiting for you" side="right" inset={6} />
            <Callout cam={cam} frame={frame} rect={locks.cls} from={word('decide.5', 'Classes')} until={d6.local} label="Class, locked" side="top" inset={4} radius={10} />
            <Callout cam={cam} frame={frame} rect={locks.exam} from={word('decide.5', 'exams')} until={d6.local} label="Exam, locked" side="bottom" inset={4} radius={10} />
            <Callout cam={cam} frame={frame} rect={locks.shift} from={word('decide.5', 'shifts')} until={d6.local} label="Shift, locked" side="right" inset={4} radius={10} />
            <Callout cam={cam} frame={frame} rect={plan.bar} from={word('decide.6', 'nothing') - 4} until={len - 30} inset={6} radius={30} />
          </>
        )}
      />
      <ClickSounds take={id} time={time} length={len} />
      <Sfx at={0} name="whoosh" gain={0.6} />
      <StepHeader step={4} name="You decide" morphAt={morph} until={len} />
    </AbsoluteFill>
  );
};
