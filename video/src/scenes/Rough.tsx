import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AppShot } from '../kit/AppShot.tsx';
import { Callout } from '../kit/Callout.tsx';
import { focusPhone, PHONE_ASIDE, type Box } from '../kit/camera.ts';
import { ClickSounds } from '../kit/Sounds.tsx';
import { StepHeader } from '../kit/StepHeader.tsx';
import { beatMap, click, countSteps, mark, pad, rects, union, when } from '../kit/takes.ts';
import { PHASE } from '../kit/theme.ts';
import { chapter, line, word } from '../timeline.ts';

const MIDDLE: Box = { x: 560, y: 120, w: 800, h: 760 };

/** Step 5, on the phone: a period morning before a midterm. Log it in a few taps; the Guide changes today only. */
export const Rough: React.FC = () => {
  const c = chapter('rough');
  const len = c.end - c.from;
  const morph = line('rough.1').localEnd - 8;
  const r3 = line('rough.3');
  const r4 = line('rough.4');

  const id = 'rough-phone';
  const today = rects(id, 'today', ['dial', 'title'] as const);
  const check = rects(id, 'checkin', ['checkin', 'save'] as const);
  const saved = rects(id, 'saved', ['checkin'] as const);
  const cards = rects(id, 'cards', ['card', 'head', 'i0'] as const);
  const [low, flat, cramps, save, toGuide, ask] = [0, 1, 2, 3, 4, 5].map((i) => click(id, i));
  if (!low || !flat || !cramps || !save || !toGuide || !ask) throw new Error('rough-phone taps');
  const drafted = when(id, 'steps', (v) => v.includes('is-done kind-propose'));
  const reading = when(id, 'steps', (v) => countSteps(v, 'kind-read') >= 1);
  const checkAt = mark(id, 'checkin').frame;
  const cardsAt = mark(id, 'cards').frame;

  const time = beatMap([
    [morph - 4, 0],
    [morph + 70, 74],
    [r3.local - 8, checkAt],
    [word('rough.3', 'low') + 2, low.frame],
    [word('rough.3', 'flat') + 2, flat.frame],
    [word('rough.3', 'cramps') + 2, cramps.frame],
    [r3.localEnd + 14, save.frame],
    [word('rough.4', 'ask') - 2, toGuide.frame],
    [word('rough.4', 'change') + 2, ask.frame],
    [word('rough.5', 'only') - 4, reading + 12],
    [word('rough.5', 'today'), drafted + 10],
    [word('rough.5', 'midterm') - 2, cardsAt],
  ]);

  return (
    <AbsoluteFill>
      <AppShot
        take={id}
        phone={{ time: '8:10' }}
        time={time}
        start={PHONE_ASIDE}
        cam={[
          { at: morph, to: focusPhone(pad(union(today.title, today.dial), 16, 30), MIDDLE, 1.6), dur: 34 },
          { at: r3.local - 14, to: focusPhone(pad(check.checkin, 10, 16), MIDDLE, 1.3), dur: 36 },
          { at: r4.local + 4, to: focusPhone({ x: 0, y: 40, w: 390, h: 700 }, MIDDLE, 1.2), dur: 34 },
          { at: word('rough.5', 'midterm') - 12, to: focusPhone(pad(union(cards.head, cards.i0), 16, 24), MIDDLE, 1.6), dur: 32 },
          { at: len - 30, to: PHONE_ASIDE, dur: 30 },
        ]}
        overlay={({ cam, frame }) => (
          <>
            <Callout cam={cam} frame={frame} rect={today.dial} from={word('rough.2', '1') - 2} until={r3.local - 16} label="Day 1" sub="Period started today" side="left" ring={false} />
            <Callout cam={cam} frame={frame} rect={check.save} from={word('rough.3', 'cramps') + 8} until={r3.localEnd + 12} inset={6} color={PHASE.menstrual.solid} />
            <Callout cam={cam} frame={frame} rect={saved.checkin} from={r3.localEnd + 22} until={r4.local + 2} inset={6} label="Logged in seconds" side="right" />
            <Callout cam={cam} frame={frame} rect={cards.head} from={word('rough.5', 'midterm')} until={len - 32} inset={8} label="Three changes, today only" sub="The midterm stays put" side="right" />
          </>
        )}
      />
      <ClickSounds take={id} time={time} length={len} />
      <StepHeader step={5} name="A rough morning" morphAt={morph} until={len} />
    </AbsoluteFill>
  );
};
