import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { AppShot } from '../kit/AppShot.tsx';
import { Callout } from '../kit/Callout.tsx';
import { focusPhone, PHONE_ASIDE, type Box } from '../kit/camera.ts';
import { ClickSounds } from '../kit/Sounds.tsx';
import { StepHeader } from '../kit/StepHeader.tsx';
import { beatMap, click, mark, pad, rects, union } from '../kit/takes.ts';
import { C, FONT, PHASE, presence, SHADOW } from '../kit/theme.ts';
import { chapter, line, word } from '../timeline.ts';

const MIDDLE: Box = { x: 560, y: 130, w: 800, h: 740 };

/** Where a number on screen comes from, set small in the corner while it is said. */
const Source: React.FC<{ from: number; until: number }> = ({ from, until }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = presence(frame, fps, from, until, 10);
  if (p <= 0.001) return null;
  return (
    <div style={{ position: 'absolute', left: 120, top: 760, width: 400, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
      <div style={{ background: C.elevated, border: `1px solid ${C.line}`, borderRadius: 18, padding: '18px 22px', boxShadow: SHADOW.card }}>
        <div style={{ font: `600 16px/1 ${FONT.sans}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink3, marginBottom: 10 }}>Source</div>
        <div style={{ font: `600 24px/1.25 ${FONT.sans}`, letterSpacing: '-0.012em', color: C.ink }}>13% of cycles were exactly 28 days</div>
        <div style={{ font: `500 19px/1.35 ${FONT.sans}`, color: C.ink2, marginTop: 6 }}>
          Bull et al., <i>npj Digital Medicine</i>, 2019. Over 600,000 cycles.
        </div>
      </div>
    </div>
  );
};

/** Step 2, on the phone: the dial, the predicted range and how sure it is, and the check-in. */
export const Today: React.FC = () => {
  const c = chapter('today');
  const len = c.end - c.from;
  const morph = line('today.1').localEnd - 8;
  const t3 = line('today.3');
  const t6 = line('today.6');

  const id = 'today-phone';
  const today = rects(id, 'today', ['dial', 'day'] as const);
  const facts = rects(id, 'facts', ['facts', 'next', 'estimate', 'phase'] as const);
  const why = rects(id, 'why', ['why', 'facts'] as const);
  const check = rects(id, 'checkin', ['checkin', 'energy', 'mood', 'symptoms'] as const);
  const whyTap = click(id, 0);
  const factsAt = mark(id, 'facts').frame;
  const whyAt = mark(id, 'why').frame;
  const checkAt = mark(id, 'checkin').frame;

  const tapAt = word('today.5', 'tap') + 2;
  const time = beatMap([
    [morph - 4, 0],
    [morph + 100, 104],
    [t3.local + 6, factsAt],
    [tapAt, whyTap.frame],
    [tapAt + (whyAt - whyTap.frame), whyAt],
    [t6.local - 16, whyAt + 34],
    [t6.local + 36, checkAt],
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
          { at: t3.local - 16, to: focusPhone(pad(union(facts.phase, facts.facts), 16, 36), MIDDLE, 2.0), dur: 40 },
          { at: tapAt + 14, to: focusPhone(pad(union(why.facts, why.why), 16, 30), MIDDLE, 2.0), dur: 30 },
          { at: t6.local - 18, to: focusPhone(pad(check.checkin, 10, 16), MIDDLE, 1.3), dur: 42 },
          { at: len - 30, to: PHONE_ASIDE, dur: 30 },
        ]}
        overlay={({ cam, frame }) => (
          <>
            <Callout cam={cam} frame={frame} rect={facts.next} from={t3.local + 4} until={tapAt - 24} label="A range, not a date" side="left" color={PHASE.menstrual.solid} gap={48} />
            <Callout cam={cam} frame={frame} rect={facts.estimate} from={word('today.5', 'sure') - 4} until={tapAt + 12} label="How sure it is" side="right" gap={48} />
            <Callout cam={cam} frame={frame} rect={why.why} from={tapAt + 30} until={t6.local - 14} label="Why, in plain words" side="right" inset={6} gap={48} />
            <Callout cam={cam} frame={frame} rect={check.energy} from={word('today.6', 'energy')} until={word('today.6', 'mood')} label="Energy" side="left" gap={48} />
            <Callout cam={cam} frame={frame} rect={check.mood} from={word('today.6', 'mood')} until={word('today.6', 'symptoms')} label="Mood" side="left" gap={48} />
            <Callout cam={cam} frame={frame} rect={check.symptoms} from={word('today.6', 'symptoms')} until={len - 34} label="Symptoms" sub="Tap all that fit" side="left" gap={48} />
          </>
        )}
      />
      <Source from={word('today.4', 'only') - 4} until={line('today.5').local + 6} />
      <ClickSounds take={id} time={time} length={len} />
      <StepHeader step={2} name="Read your day" morphAt={morph} until={len} />
    </AbsoluteFill>
  );
};
