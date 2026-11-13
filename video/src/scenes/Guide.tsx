import React from 'react';
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { Glass } from '../../../src/ui/Glass.tsx';
import { AppShot } from '../kit/AppShot.tsx';
import { Callout } from '../kit/Callout.tsx';
import { ASIDE, focusPhone, PHONE_ASIDE, PHONE_REST, REST, type Box, type Cam } from '../kit/camera.ts';
import { Ring } from '../kit/Ring.tsx';
import { ClickSounds, Sfx } from '../kit/Sounds.tsx';
import { StepHeader } from '../kit/StepHeader.tsx';
import { beatMap, click, countSteps, mark, pad, rects, union, watched, when, type TakeId } from '../kit/takes.ts';
import { C, CLAMP, ease, FONT, presence, rise, SHADOW, tween } from '../kit/theme.ts';
import { chapter, line, word } from '../timeline.ts';
import { AgentLoop } from './AgentLoop.tsx';

const PHONE_TAKE: TakeId = 'guide-phone';
const MIDDLE: Box = { x: 560, y: 120, w: 800, h: 760 };

/** The loop, small, in the corner: which station the real agent is at right now. */
const LoopHud: React.FC<{ frame: number; tf: number; from: number; until: number }> = ({ frame, tf, from, until }) => {
  const { fps } = useVideoConfig();
  const p = presence(frame, fps, from, until);
  if (p <= 0.001) return null;
  const v = watched(PHONE_TAKE, 'steps', tf);
  const last = v.split('|').at(-1) ?? '';
  const station = last.includes('is-running') ? 1 : v ? 2 : 0;
  const names = ['Decides', 'Calls a tool', 'Reads the result'];
  const calls = v ? v.split('|').length : 0;
  return (
    <div style={{ position: 'absolute', right: 120, top: 120, opacity: p, transform: `translateY(${(1 - p) * -12}px)` }}>
      <Glass radius={30} frost={16} style={{ padding: '16px 26px 16px 18px', boxShadow: SHADOW.lift, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Ring size={64} bead={station / 3} stroke={6.5} gap={7.5} />
        <div>
          <div style={{ font: `600 15px/1 ${FONT.sans}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink3, marginBottom: 8 }}>The loop · tool call {Math.max(1, calls)}</div>
          <div style={{ font: `600 28px/1.1 ${FONT.sans}`, letterSpacing: '-0.015em', color: C.ink, minWidth: 236 }}>{names[station]}</div>
        </div>
      </Glass>
    </div>
  );
};

/** The same proposal on a laptop, said once in words on screen. */
const SameApp: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = rise(frame, from, fps);
  const sub = rise(frame, from + 10, fps);
  if (p <= 0.001) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 86, textAlign: 'center' }}>
      <div style={{ font: `500 64px/1.05 ${FONT.serif}`, letterSpacing: '-0.026em', color: C.ink, opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>Same app, phone or laptop.</div>
      <div style={{ font: `500 26px/1.3 ${FONT.sans}`, color: C.ink2, marginTop: 14, opacity: sub, transform: `translateY(${(1 - sub) * 12}px)` }}>Cadence runs in the browser.</div>
    </div>
  );
};

/** Step 3, on the phone: asking the Guide, what an agent is, and the real agent working its tools. */
export const Guide: React.FC = () => {
  const c = chapter('guide');
  const len = c.end - c.from;
  const g3 = line('guide.3');
  const g5 = line('guide.5');
  const g7 = line('guide.7');
  const g8 = line('guide.8');
  const morph = line('guide.1').localEnd - 8;

  const ask = click(PHONE_TAKE, 0);
  const steps = (test: (v: string) => boolean) => when(PHONE_TAKE, 'steps', test);
  const read = (k: number) => steps((v) => countSteps(v, 'is-done kind-read') >= k);
  const firstRun = steps((v) => v.includes('is-running'));
  const draft = (k: number) => steps((v) => countSteps(v, 'kind-propose') >= k);
  const bounced = (k: number) => steps((v) => countSteps(v, 'is-error') >= k);
  const drafted = steps((v) => v.includes('is-done kind-propose'));
  const cardsAt = mark(PHONE_TAKE, 'cards').frame;

  const clickAt = word('guide.2', 'Plan');
  const loopFrom = g3.local - 10;
  const loopTo = g5.localEnd + 22;
  const bridge = g8.localEnd + 4;
  const time = beatMap([
    [morph - 2, ask.frame - 20],
    [clickAt, ask.frame],
    [clickAt + 30, firstRun - 2],
    [word('guide.6', 'checks') + 2, firstRun + 4],
    [word('guide.6', 'cycle'), read(1) + 2],
    [word('guide.6', 'calendar'), read(2) + 2],
    [word('guide.6', 'habits'), read(3) + 2],
    [word('guide.6', 'check-ins') + 4, read(4) + 2],
    [word('guide.6', 'drafts'), draft(1) + 6],
    [word('guide.7', 'fit'), bounced(1) + 3],
    [word('guide.7', 'fixes'), draft(2) + 4],
    [g7.localEnd + 8, bounced(2) + 3],
    [g8.local - 14, draft(3) + 3],
    [g8.local + 10, drafted + 8],
    [word('guide.8', 'five'), cardsAt - 12],
    [word('guide.8', 'five') + 12, cardsAt],
  ]);

  const empty = rects(PHONE_TAKE, 'empty', ['starter', 'head'] as const);
  const reads = rects(PHONE_TAKE, 'reads', ['steps', 's0', 's1', 's2', 's3', 'user'] as const);
  const drafts = rects(PHONE_TAKE, 'drafts', ['steps', 's4'] as const);
  const cards = rects(PHONE_TAKE, 'cards', ['card', 'head', 'i0'] as const);

  const away: Partial<Cam> = { ...PHONE_REST, z: 0.55, sy: 620 };
  const fadeAway = (f: number) => 1 - tween(f, loopFrom, 16, ease.in) + tween(f, loopTo - 6, 18, ease.out);
  const phoneLeft: Partial<Cam> = { ...PHONE_REST, z: 0.74, sx: 600, sy: 600 };
  const laptopCards = mark('guide-plan', 'cards').frame;
  const laptopIn = (f: number) => interpolate(f, [bridge, bridge + 14], [0, 1], CLAMP);

  return (
    <AbsoluteFill>
      <AppShot
        take={PHONE_TAKE}
        phone={{ time: '9:10' }}
        time={time}
        start={PHONE_ASIDE}
        opacity={(f) => interpolate(fadeAway(f), [0, 1], [0, 1], CLAMP) * (1 - interpolate(f, [len - 26, len - 8], [0, 1], CLAMP))}
        cam={[
          { at: morph, to: focusPhone(pad(union(empty.head, empty.starter), 16, 30), MIDDLE, 1.7), dur: 34 },
          { at: clickAt + 8, to: focusPhone(pad(union(reads.user, reads.steps), 16, 40), MIDDLE, 1.8), dur: 36 },
          { at: loopFrom, to: away, dur: 22 },
          { at: loopTo - 8, to: focusPhone(pad(reads.steps, 16, 40), MIDDLE, 2.0), dur: 34 },
          { at: g7.local - 10, to: focusPhone(pad(drafts.steps, 16, 40), MIDDLE, 1.9), dur: 34 },
          { at: g8.local - 4, to: { ...PHONE_REST }, dur: 30 },
          { at: word('guide.8', 'five') - 6, to: focusPhone(pad(union(cards.head, cards.i0), 16, 24), MIDDLE, 1.6), dur: 34 },
          { at: bridge, to: phoneLeft, dur: 36 },
          { at: len - 28, to: { ...phoneLeft, sx: 360, z: 0.6 }, dur: 28, curve: ease.in },
        ]}
        overlay={({ cam, frame, tf }) => (
          <>
            <Callout cam={cam} frame={frame} rect={empty.starter} from={morph + 30} until={clickAt - 2} label="One tap to ask" side="right" />
            <Callout cam={cam} frame={frame} rect={reads.s0} from={word('guide.6', 'checks')} until={word('guide.6', 'calendar')} inset={4} />
            <Callout cam={cam} frame={frame} rect={reads.s1} from={word('guide.6', 'calendar')} until={word('guide.6', 'habits')} inset={4} />
            <Callout cam={cam} frame={frame} rect={reads.s2} from={word('guide.6', 'habits')} until={word('guide.6', 'check-ins')} inset={4} />
            <Callout cam={cam} frame={frame} rect={reads.s3} from={word('guide.6', 'check-ins')} until={word('guide.6', 'drafts')} inset={4} />
            <Callout cam={cam} frame={frame} rect={drafts.s4} from={word('guide.7', 'fit') + 4} until={g7.localEnd + 18} inset={4} label="Didn't fit." sub="The model fixes it." side="left" />
            <Callout cam={cam} frame={frame} rect={cards.head} from={word('guide.8', 'five') + 10} until={bridge - 2} inset={8} label="5 suggestions" sub="Waiting for you" side="right" />
            <LoopHud frame={frame} tf={tf} from={loopTo + 10} until={g8.local + 20} />
          </>
        )}
      />
      <AppShot
        take="guide-plan"
        time={() => laptopCards}
        start={{ ...REST, z: 0.5, sx: 1700, sy: 600 }}
        opacity={laptopIn}
        cam={[
          { at: bridge, to: { ...REST, z: 0.56, sx: 1330, sy: 600 }, dur: 36 },
          { at: len - 28, to: ASIDE, dur: 28 },
        ]}
      />
      <Sequence from={bridge + 14} layout="none">
        <SameAppHold until={len - bridge - 14} />
      </Sequence>
      <Sequence from={loopFrom} durationInFrames={loopTo - loopFrom + 20} layout="none">
        <AgentLoop
          cues={{
            title: 10,
            ask: 22,
            ring: line('guide.4').local - loopFrom - 4,
            decide: word('guide.4', 'decides') - loopFrom,
            tool: word('guide.4', 'calls') - loopFrom,
            result: word('guide.4', 'reads') - loopFrom,
            repeat: word('guide.4', 'repeats') - loopFrom,
            propose: word('guide.5', 'proposes') - loopFrom,
            exit: loopTo - loopFrom - 4,
          }}
        />
      </Sequence>
      <ClickSounds take={PHONE_TAKE} time={time} length={len} />
      <Sfx at={loopFrom} name="whoosh" />
      <Sfx at={loopTo - 8} name="whoosh" />
      <Sfx at={bridge} name="whoosh" gain={0.8} />
      <StepHeader step={3} name="Ask the Guide" morphAt={morph} until={bridge + 4} />
    </AbsoluteFill>
  );
};

const SameAppHold: React.FC<{ until: number }> = ({ until }) => {
  const frame = useCurrentFrame();
  const out = tween(frame, until - 16, 14, ease.in);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - out }}>
      <SameApp from={0} />
    </div>
  );
};

