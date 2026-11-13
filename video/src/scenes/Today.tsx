import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AppShot } from '../kit/AppShot.tsx';
import { Callout } from '../kit/Callout.tsx';
import { focusPhone, PHONE_ASIDE, type Box } from '../kit/camera.ts';
import { ClickSounds } from '../kit/Sounds.tsx';
import { StepHeader } from '../kit/StepHeader.tsx';
import { beatMap, click, mark, pad, rects, union } from '../kit/takes.ts';
import { PHASE } from '../kit/theme.ts';
import { chapter, line, word } from '../timeline.ts';

const MIDDLE: Box = { x: 560, y: 130, w: 800, h: 740 };
/** "On the right is the check-in": the phone moves to the right of the frame as it is said. */
const RIGHT_SIDE: Box = { x: 1010, y: 92, w: 760, h: 850 };

/** Step 2, on the phone: the dial, the predicted range and how sure it is, and the check-in. */
export const Today: React.FC = () => {
  const c = chapter('today');
  const len = c.end - c.from;
  const morph = line('today.1').localEnd - 8;
  const t3 = line('today.3');
  const t5 = line('today.5');

  const id = 'today-phone';
  const today = rects(id, 'today', ['dial', 'day'] as const);
  const facts = rects(id, 'facts', ['facts', 'next', 'estimate', 'phase'] as const);
  const why = rects(id, 'why', ['why', 'facts'] as const);
  const check = rects(id, 'checkin', ['checkin', 'energy', 'mood', 'symptoms'] as const);
  const whyTap = click(id, 0);
  const factsAt = mark(id, 'facts').frame;
  const whyAt = mark(id, 'why').frame;
  const checkAt = mark(id, 'checkin').frame;

  const tapAt = word('today.4', 'sure') - 6;
  const time = beatMap([
    [morph - 4, 0],
    [morph + 100, 104],
    [t3.local + 30, factsAt],
    [tapAt, whyTap.frame],
    [tapAt + (whyAt - whyTap.frame), whyAt],
    [t5.local - 12, whyAt + 34],
    [t5.local + 40, checkAt],
  ]);

  return (
    <AbsoluteFill>
      <AppShot
        take={id}
        phone={{ time: '8:30' }}
        time={time}
        start={PHONE_ASIDE}
        cam={[
          { at: morph, to: focusPhone(pad(today.dial, 24), MIDDLE, 1.9), dur: 36 },
          { at: t3.local - 14, to: focusPhone(pad(union(facts.phase, facts.facts), 16, 36), MIDDLE, 2.0), dur: 40 },
          { at: tapAt + 16, to: focusPhone(pad(union(why.facts, why.why), 16, 30), MIDDLE, 2.0), dur: 30 },
          { at: t5.local - 14, to: focusPhone(pad(check.checkin, 10, 16), RIGHT_SIDE, 1.3), dur: 42 },
          { at: len - 30, to: PHONE_ASIDE, dur: 30 },
        ]}
        overlay={({ cam, frame }) => (
          <>
            <Callout cam={cam} frame={frame} rect={today.dial} from={word('today.2', '25')} until={t3.local - 14} label="Day 25 of about 28" sub="Likely luteal phase" side="left" ring={false} />
            <Callout cam={cam} frame={frame} rect={facts.next} from={word('today.3', 'range')} until={tapAt + 14} label="A range, not a date" side="left" color={PHASE.menstrual.solid} />
            <Callout cam={cam} frame={frame} rect={facts.estimate} from={word('today.4', 'sure') - 4} until={tapAt + 14} label="How sure it is" side="right" />
            <Callout cam={cam} frame={frame} rect={why.why} from={tapAt + 30} until={t5.local - 12} label="Why, in plain words" side="right" inset={6} />
            <Callout cam={cam} frame={frame} rect={check.energy} from={word('today.6', 'Energy')} until={word('today.6', 'mood')} label="Energy" side="left" />
            <Callout cam={cam} frame={frame} rect={check.mood} from={word('today.6', 'mood')} until={word('today.6', 'anything')} label="Mood" side="left" />
            <Callout cam={cam} frame={frame} rect={check.symptoms} from={word('today.6', 'anything')} until={len - 34} label="Anything else" sub="Tap all that fit" side="left" />
          </>
        )}
      />
      <ClickSounds take={id} time={time} length={len} />
      <StepHeader step={2} name="Read your day" morphAt={morph} until={len} />
    </AbsoluteFill>
  );
};
