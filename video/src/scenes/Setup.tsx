import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AppShot } from '../kit/AppShot.tsx';
import { Callout } from '../kit/Callout.tsx';
import { focusPhone, PHONE_ASIDE, type Box } from '../kit/camera.ts';
import { ClickSounds } from '../kit/Sounds.tsx';
import { StepHeader } from '../kit/StepHeader.tsx';
import { click, pad, rects, timeMap, union } from '../kit/takes.ts';
import { chapter, line, word } from '../timeline.ts';

/** The phone sits left of centre so labels have clear paper on its right. */
const LEFTISH: Box = { x: 430, y: 96, w: 760, h: 820 };

/** Step 1, on the phone: the onboarding form, the four promises, and the sample week. */
export const Setup: React.FC = () => {
  const c = chapter('setup');
  const len = c.end - c.from;
  const s1 = line('setup.1');
  const s3 = line('setup.3');
  const s4 = line('setup.4');
  const s6 = line('setup.6');
  const s7 = line('setup.7');
  const morph = s1.localEnd - 8;

  const id = 'onboarding-phone';
  const dateTap = click(id, 0);
  const continueTap = click(id, 1);
  const understandTap = click(id, 2);
  const sampleTap = click(id, 3);

  const typed = dateTap.frame + 27;
  const toContinue = s3.local - 6;
  const toUnderstand = s6.local + 10;
  const time = timeMap([
    [morph, 30],
    [morph + (typed - 30), typed],
    [toContinue - (continueTap.frame - typed), typed],
    [toContinue, continueTap.frame],
    [toContinue + 46, continueTap.frame + 46],
    [toUnderstand - 50, 176],
    [toUnderstand, understandTap.frame],
    [toUnderstand + 40, understandTap.frame + 40],
    [s7.localEnd - 4, sampleTap.frame - 2],
    [s7.localEnd + 2, sampleTap.frame + 4],
  ]);

  const form = rects(id, 'form', ['card', 'headline', 'date', 'cycle', 'period', 'regular'] as const);
  const promises = rects(id, 'promises', ['card', 'title', 'p1', 'p2', 'p3', 'p4'] as const);
  const start = rects(id, 'start', ['card', 'sample'] as const);

  return (
    <AbsoluteFill>
      <AppShot
        take={id}
        phone={{ time: '9:00' }}
        time={time}
        start={PHONE_ASIDE}
        cam={[
          { at: morph, to: focusPhone(pad(union(form.headline, form.regular), 24, 30), LEFTISH, 1.45), dur: 34 },
          { at: s3.local - 10, to: focusPhone(pad(form.card, 10, 20), LEFTISH, 1.2), dur: 36 },
          { at: s4.local - 14, to: focusPhone(pad(union(promises.title, promises.p4), 20, 24), LEFTISH, 1.55), dur: 36 },
          { at: s6.local + 4, to: focusPhone(pad(start.card, 10, 20), LEFTISH, 1.3), dur: 34 },
          { at: s7.local + 4, to: focusPhone(pad(start.sample, 40, 80), LEFTISH, 1.7), dur: 34 },
          { at: len - 30, to: PHONE_ASIDE, dur: 30 },
        ]}
        overlay={({ cam, frame }) => (
          <>
            <Callout cam={cam} frame={frame} rect={form.date} from={word('setup.2', 'last')} until={word('setup.2', 'long')} label="Last period start" />
            <Callout cam={cam} frame={frame} rect={form.cycle} from={word('setup.2', 'long')} until={word('setup.2', 'regular')} label="Usual cycle length" />
            <Callout cam={cam} frame={frame} rect={form.regular} from={word('setup.2', 'regular')} until={s3.local - 8} label="How regular" />
            <Callout cam={cam} frame={frame} rect={promises.p1} from={word('setup.4', 'data')} until={word('setup.4', 'AI')} label="Stays on your device" />
            <Callout cam={cam} frame={frame} rect={promises.p2} from={word('setup.4', 'AI')} until={word('setup.4', "it's")} label="The AI only suggests" />
            <Callout cam={cam} frame={frame} rect={promises.p3} from={word('setup.4', "it's")} until={word('setup.4', 'dates')} label="Not medical advice" />
            <Callout cam={cam} frame={frame} rect={promises.p4} from={word('setup.4', 'dates')} until={toUnderstand - 52} label="Never for birth control" />
            <Callout cam={cam} frame={frame} rect={start.sample} from={s7.local + 18} until={len - 30} label="A busy week" sub="Midterm on Thursday" />
          </>
        )}
      />
      <ClickSounds take={id} time={time} length={len} />
      <StepHeader step={1} name="Set up" morphAt={morph} until={len} />
    </AbsoluteFill>
  );
};
