import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AppShot } from '../kit/AppShot.tsx';
import { Callout, Marker } from '../kit/Callout.tsx';
import { focusPhone, PHONE_ASIDE, PHONE_REST, type Box } from '../kit/camera.ts';
import { ClickSounds } from '../kit/Sounds.tsx';
import { StepHeader } from '../kit/StepHeader.tsx';
import { beatMap, click, mark, pad, rects, union, watched, type Rect } from '../kit/takes.ts';
import { PHASE } from '../kit/theme.ts';
import { chapter, line, word } from '../timeline.ts';

const ID = 'safety-phone';
const MIDDLE: Box = { x: 560, y: 120, w: 800, h: 760 };

/** A rect measured at one take frame, moved to where the page had scrolled at another. */
function scrolled(r: Rect, measuredAt: number, tf: number): Rect {
  const dy = Number(watched(ID, 'scroll', measuredAt)) - Number(watched(ID, 'scroll', tf));
  return { ...r, y: r.y + dy, lines: r.lines?.map((l) => ({ ...l, y: l.y + dy })) };
}

/**
 * The same, for text measured while the reply is still streaming and the page auto-scrolls: there a
 * captured frame shows the page one frame of scrolling later than its mark was measured.
 */
const streamed = (r: Rect, measuredAt: number, tf: number) => scrolled(r, measuredAt, tf + 1);

/** Shows a pinned overlay only while its text is on the phone's screen, above the composer. */
const onScreen = (r: Rect) => r.y > 4 && r.y + r.h < 730;

/**
 * Step 6, on the phone: a red-flag symptom. No diagnosis, a clear nudge to a doctor and when to go to
 * urgent care, then the appointment notes it drafts from the check-ins, held long enough to read.
 */
export const Safety: React.FC = () => {
  const c = chapter('safety');
  const len = c.end - c.from;
  const morph = line('safety.1').localEnd - 8;
  const s3 = line('safety.3');
  const s4 = line('safety.4');
  const s5 = line('safety.5');

  const ask = click(ID, 0);
  const yes = click(ID, 1);
  const replyAt = mark(ID, 'reply').frame;
  const topAt = mark(ID, 'top').frame;
  const bottomAt = mark(ID, 'bottom').frame;
  const notesAt = mark(ID, 'cramps').frame;
  const empty = rects(ID, 'empty', ['starter'] as const);
  const top = rects(ID, 'top', ['doctor'] as const);
  const bottom = rects(ID, 'bottom', ['urgent', 'next'] as const);
  const notes = rects(ID, 'cramps', ['cramps', 'missed'] as const);

  const cramps = word('safety.2', 'cramps');
  const offers = word('safety.5', 'offers') + 4;
  const time = beatMap([
    [morph - 2, ask.frame - 20],
    [cramps, ask.frame],
    [cramps + 50, ask.frame + 200],
    [s3.local, replyAt],
    [word('safety.3', 'doctor'), topAt],
    [word('safety.4', 'urgent') - 2, bottomAt],
    [line('safety.5').local - 8, bottomAt + 6],
    [offers, yes.frame],
    [word('safety.5', 'does') - 12, notesAt - 14],
    [s5.localEnd + 10, notesAt],
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
          { at: cramps + 10, to: { ...PHONE_REST }, dur: 34 },
          { at: word('safety.4', 'checked') - 10, to: focusPhone({ x: 0, y: top.doctor.y - 70, w: 390, h: 300 }, MIDDLE, 1.8), dur: 30 },
          { at: word('safety.4', 'urgent') - 8, to: focusPhone({ x: 0, y: bottom.urgent.y - 120, w: 390, h: 300 }, MIDDLE, 1.8), dur: 30 },
          { at: s5.local - 4, to: focusPhone(pad(bottom.next, 20, 120), MIDDLE, 1.8), dur: 32 },
          { at: offers + 8, to: { ...PHONE_REST }, dur: 34 },
          { at: word('safety.5', 'does') - 6, to: focusPhone(pad(union(notes.cramps, notes.missed), 30, 60), MIDDLE, 1.9), dur: 36 },
          { at: len - 30, to: PHONE_ASIDE, dur: 30 },
        ]}
        overlay={({ cam, frame, tf }) => {
          const doctor = scrolled(top.doctor, topAt, tf);
          const urgent = scrolled(bottom.urgent, bottomAt, tf);
          return (
            <>
              {onScreen(doctor) ? <Marker cam={cam} frame={frame} rect={doctor} from={word('safety.4', 'checked') - 4} until={s5.local - 6} /> : null}
              {onScreen(urgent) ? <Marker cam={cam} frame={frame} rect={urgent} from={word('safety.4', 'urgent') - 2} until={s5.local - 6} color={PHASE.menstrual.tint} /> : null}
              {onScreen(doctor) ? <Callout cam={cam} frame={frame} rect={doctor} from={word('safety.4', 'checked') - 2} until={s5.local - 6} ring={false} label="See a doctor" side="left" gap={48} /> : null}
              {onScreen(urgent) ? <Callout cam={cam} frame={frame} rect={urgent} from={word('safety.4', 'urgent')} until={s5.local - 6} ring={false} label="When to go to urgent care" side="right" gap={48} /> : null}
              <Callout cam={cam} frame={frame} rect={scrolled(bottom.next, bottomAt, tf)} from={offers - 14} until={offers + 6} inset={6} />
              {tf >= notesAt - 2 ? <Marker cam={cam} frame={frame} rect={streamed(notes.missed, notesAt, tf)} from={s5.localEnd + 4} until={len - 30} /> : null}
              <Callout cam={cam} frame={frame} rect={{ x: -13, y: streamed(notes.missed, notesAt, tf).y, w: 1, h: notes.missed.h }} from={s5.localEnd} until={len - 30} ring={false} label="Notes for the appointment" sub="From your own check-ins" side="left" gap={48} />
            </>
          );
        }}
      />
      <ClickSounds take={ID} time={time} length={len} />
      <StepHeader step={6} name="Know the limits" morphAt={morph} until={len} />
    </AbsoluteFill>
  );
};
