import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AppShot } from '../kit/AppShot.tsx';
import { Callout, Marker } from '../kit/Callout.tsx';
import { focusPhone, PHONE_ASIDE, PHONE_REST, type Box } from '../kit/camera.ts';
import { ClickSounds } from '../kit/Sounds.tsx';
import { StepHeader } from '../kit/StepHeader.tsx';
import { beatMap, click, mark, pad, rects, watched, type Rect } from '../kit/takes.ts';
import { PHASE } from '../kit/theme.ts';
import { chapter, line, word } from '../timeline.ts';

const ID = 'safety-phone';
const MIDDLE: Box = { x: 560, y: 120, w: 800, h: 760 };

/** A rect measured at one take frame, moved to where the page had scrolled at another. */
function scrolled(r: Rect, measuredAt: number, tf: number): Rect {
  const dy = Number(watched(ID, 'scroll', measuredAt)) - Number(watched(ID, 'scroll', tf));
  return { ...r, y: r.y + dy, lines: r.lines?.map((l) => ({ ...l, y: l.y + dy })) };
}

/** Shows a pinned overlay only while its text is on the phone's screen, above the composer. */
const onScreen = (r: Rect) => r.y > 4 && r.y + r.h < 730;

/** Step 6, on the phone: a red-flag symptom. No diagnosis, a clear nudge to a clinician, notes for the visit. */
export const Safety: React.FC = () => {
  const c = chapter('safety');
  const len = c.end - c.from;
  const morph = line('safety.1').localEnd - 8;
  const s3 = line('safety.3');
  const s4 = line('safety.4');

  const ask = click(ID, 0);
  const yes = click(ID, 1);
  const replyAt = mark(ID, 'reply').frame;
  const topAt = mark(ID, 'top').frame;
  const bottomAt = mark(ID, 'bottom').frame;
  const notesAt = mark(ID, 'notes').frame;
  const empty = rects(ID, 'empty', ['starter'] as const);
  const top = rects(ID, 'top', ['doctor'] as const);
  const bottom = rects(ID, 'bottom', ['urgent', 'next'] as const);
  const notesTail = len - 34;

  const cramps = word('safety.2', 'cramps');
  const time = beatMap([
    [morph - 2, ask.frame - 20],
    [cramps, ask.frame],
    [cramps + 50, ask.frame + 200],
    [s3.local, replyAt],
    [word('safety.3', 'clinician') - 2, topAt],
    [word('safety.3', 'urgent') - 2, bottomAt],
    [s4.local - 8, bottomAt + 6],
    [word('safety.4', 'offers') + 4, yes.frame],
    [notesTail, Math.min(notesAt, yes.frame + 4 * (notesTail - word('safety.4', 'offers') - 4))],
  ]);

  return (
    <AbsoluteFill>
      <AppShot
        take={ID}
        phone={{ time: '10:00' }}
        time={time}
        start={PHONE_ASIDE}
        cam={[
          { at: morph, to: focusPhone(pad(empty.starter, 20, 160), MIDDLE, 1.7), dur: 34 },
          { at: word('safety.2', 'cramps') + 10, to: { ...PHONE_REST }, dur: 34 },
          { at: word('safety.3', 'clinician') - 10, to: focusPhone({ x: 0, y: top.doctor.y - 70, w: 390, h: 300 }, MIDDLE, 1.8), dur: 30 },
          { at: word('safety.3', 'urgent') - 8, to: focusPhone({ x: 0, y: bottom.urgent.y - 120, w: 390, h: 300 }, MIDDLE, 1.8), dur: 30 },
          { at: s4.local - 4, to: focusPhone(pad(bottom.next, 20, 120), MIDDLE, 1.8), dur: 32 },
          { at: word('safety.4', 'notes') - 4, to: { ...PHONE_REST }, dur: 36 },
          { at: len - 30, to: PHONE_ASIDE, dur: 30 },
        ]}
        overlay={({ cam, frame, tf }) => {
          const doctor = scrolled(top.doctor, topAt, tf);
          const urgent = scrolled(bottom.urgent, bottomAt, tf);
          return (
          <>
            {onScreen(doctor) ? <Marker cam={cam} frame={frame} rect={doctor} from={word('safety.3', 'clinician') - 4} until={s4.local - 6} /> : null}
            {onScreen(urgent) ? <Marker cam={cam} frame={frame} rect={urgent} from={word('safety.3', 'urgent') - 2} until={s4.local - 6} color={PHASE.menstrual.tint} /> : null}
            {onScreen(doctor) ? <Callout cam={cam} frame={frame} rect={doctor} from={word('safety.3', 'clinician') - 2} until={s4.local - 6} ring={false} label="See a clinician" side="left" /> : null}
            {onScreen(urgent) ? <Callout cam={cam} frame={frame} rect={urgent} from={word('safety.3', 'urgent')} until={s4.local - 6} ring={false} label="When to go to urgent care" side="right" /> : null}
            <Callout cam={cam} frame={frame} rect={scrolled(bottom.next, bottomAt, tf)} from={word('safety.4', 'offers') - 14} until={word('safety.4', 'notes') - 6} inset={6} />
            <Callout cam={cam} frame={frame} rect={{ x: 0, y: 120, w: 390, h: 600 }} from={notesTail - 40} until={len - 30} ring={false} label="Notes for the appointment" sub="From your own check-ins" side="right" />
          </>
          );
        }}
      />
      <ClickSounds take={ID} time={time} length={len} />
      <StepHeader step={6} name="Know the limits" morphAt={morph} until={len} />
    </AbsoluteFill>
  );
};
