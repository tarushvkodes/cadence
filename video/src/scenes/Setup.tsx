import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AppShot } from '../kit/AppShot.tsx';
import { Callout } from '../kit/Callout.tsx';
import { focusPhone, PHONE_ASIDE, type Box } from '../kit/camera.ts';
import { ClickSounds, Sfx } from '../kit/Sounds.tsx';
import { StepHeader } from '../kit/StepHeader.tsx';
import { click, mark, pad, rects, timeMap, union } from '../kit/takes.ts';
import { chapter, line, word } from '../timeline.ts';

/** The phone sits left of centre so labels have clear paper on its right. */
const LEFTISH: Box = { x: 430, y: 96, w: 760, h: 820 };

/**
 * Step 1, on the phone: the onboarding form, the four promises, and the sample week. The shot ends on
 * the tap itself: the next frame of this take is the onboarding sample's own Today screen, whose
 * dates differ from the demo week Step 2 shows, so the film cuts to Step 2's take instead.
 */
export const Setup: React.FC = () => {
  const c = chapter('setup');
  const len = c.end - c.from;
  const s1 = line('setup.1');
  const s3 = line('setup.3');
  const s4 = line('setup.4');
  const s6 = line('setup.6');
  const morph = s1.localEnd - 8;

  const id = 'onboarding-phone';
  const dateTap = click(id, 0);
  const continueTap = click(id, 1);
  const understandTap = click(id, 2);
  const sampleTap = click(id, 3);
  const promisesAt = mark(id, 'promises').frame;
  const startAt = mark(id, 'start').frame;

  const typed = dateTap.frame + 27;
  const toContinue = s3.local - 4;
  const toUnderstand = s6.local - 26;
  const toSample = word('setup.6', 'Start') + 2;
  const time = timeMap([
    [morph, 30],
    [morph + (typed - 30), typed],
    [toContinue - (continueTap.frame - typed), typed],
    [toContinue, continueTap.frame],
    [toContinue + (promisesAt - continueTap.frame), promisesAt],
    [toUnderstand - 40, promisesAt + 14],
    [toUnderstand, understandTap.frame],
    [toSample - 16, startAt],
    [toSample, sampleTap.frame - 1],
  ]);
  const touch = (f: number) => (f < toSample ? time(f) : sampleTap.frame + (f - toSample));

  const form = rects(id, 'form', ['card', 'headline', 'date', 'cycle', 'period', 'regular'] as const);
  const promises = rects(id, 'promises', ['card', 'title', 'p1', 'p2', 'p3', 'p4'] as const);
  const start = rects(id, 'start', ['card', 'sample'] as const);

  return (
    <AbsoluteFill>
      <AppShot
        take={id}
        phone={{ time: '9:00' }}
        time={time}
        touch={touch}
        start={PHONE_ASIDE}
        cam={[
          { at: morph, to: focusPhone(pad(union(form.headline, form.regular), 24, 30), LEFTISH, 1.45), dur: 34 },
          { at: s3.local - 12, to: focusPhone(pad(form.card, 10, 20), LEFTISH, 1.2), dur: 30 },
          { at: s4.local - 16, to: focusPhone(pad(union(promises.title, promises.p4), 20, 24), LEFTISH, 1.55), dur: 36 },
          { at: toUnderstand + 6, to: focusPhone(pad(start.card, 10, 20), LEFTISH, 1.3), dur: 32 },
          { at: word('setup.6', 'busy') - 10, to: focusPhone(pad(start.sample, 40, 80), LEFTISH, 1.7), dur: 32 },
          { at: len - 30, to: PHONE_ASIDE, dur: 30 },
        ]}
        overlay={({ cam, frame }) => (
          <>
            <Callout cam={cam} frame={frame} rect={form.date} from={word('setup.2', 'last')} until={word('setup.2', 'long')} label="Last period start" />
            <Callout cam={cam} frame={frame} rect={form.cycle} from={word('setup.2', 'long')} until={word('setup.2', 'regular')} label="Usual cycle length" />
            <Callout cam={cam} frame={frame} rect={form.regular} from={word('setup.2', 'regular')} until={s3.local - 10} label="How regular" />
            <Callout cam={cam} frame={frame} rect={promises.p1} from={word('setup.4', 'data')} until={word('setup.4', 'AI')} label="Stays on your device" />
            <Callout cam={cam} frame={frame} rect={promises.p2} from={word('setup.4', 'AI')} until={word('setup.4', "it's")} label="The AI only suggests" />
            <Callout cam={cam} frame={frame} rect={promises.p3} from={word('setup.4', "it's")} until={line('setup.5').local - 2} label="Not medical advice" />
            <Callout cam={cam} frame={frame} rect={promises.p4} from={line('setup.5').local} until={toUnderstand - 42} label="Estimates, not facts" sub="Never for birth control" />
            <Callout cam={cam} frame={frame} rect={start.sample} from={word('setup.6', 'busy') + 4} until={len - 30} label="A busy week" sub="Midterm on Thursday" />
          </>
        )}
      />
      <ClickSounds take={id} time={time} length={len} />
      <Sfx at={toSample} name="tap" />
      <StepHeader step={1} name="Set up" morphAt={morph} until={len} />
    </AbsoluteFill>
  );
};
