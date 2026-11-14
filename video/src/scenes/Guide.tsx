import React from 'react';
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { Glass } from '../../../src/ui/Glass.tsx';
import { AppShot } from '../kit/AppShot.tsx';
import { Callout, Marker } from '../kit/Callout.tsx';
import { focusPhone, PHONE_ASIDE, PHONE_REST, type Box, type Cam } from '../kit/camera.ts';
import { ClickSounds, Sfx } from '../kit/Sounds.tsx';
import { StepHeader } from '../kit/StepHeader.tsx';
import { beatMap, click, countSteps, mark, pad, rects, take, union, watched, when, type TakeId } from '../kit/takes.ts';
import { C, CLAMP, ease, FONT, PHASE, presence, rise, SHADOW, tween } from '../kit/theme.ts';
import { chapter, line, word } from '../timeline.ts';
import { AgentDiagram } from './AgentDiagram.tsx';

const PHONE_TAKE: TakeId = 'guide-phone';
const MIDDLE: Box = { x: 520, y: 120, w: 800, h: 760 };

/** Each tool step the Guide shows, in order, with the tool it is and what the app says it did. */
const CALLS = [
  { tool: 'get_cycle_status', did: 'Checked your cycle' },
  { tool: 'list_events', did: 'Read your calendar' },
  { tool: 'list_habits', did: 'Read your habits' },
  { tool: 'get_check_ins', did: 'Read your check-ins' },
  { tool: 'propose_changes', did: 'Checked a draft' },
  { tool: 'propose_changes', did: 'Checked a draft' },
  { tool: 'propose_changes', did: 'Checked a draft' },
] as const;

/** The take frame where step `k` first shows up in the Guide. */
const appears = (k: number) => when(PHONE_TAKE, 'steps', (v) => v.split('|').filter(Boolean).length > k);

const HUD = { left: 1340, top: 150, row: 70 };
/** Inside the panel: where the rows start, the status icons' centre line, and the Claude node. */
const ROWS_TOP = 77;
const ICON_X = 15;
const NODE = { x: 240, y: 556 };
const rowY = (k: number) => ROWS_TOP + k * HUD.row + HUD.row / 2;

/**
 * The real agent's tool calls, named beside the phone as each step lands: the same tools as the
 * diagram, now doing the work. A draft the calendar check sends back is marked "adjusted".
 */
const ToolHud: React.FC<{ frame: number; tf: number; from: number; until: number; send: number }> = ({ frame, tf, from, until, send }) => {
  const { fps } = useVideoConfig();
  const p = presence(frame, fps, from, until, 12);
  if (p <= 0.001) return null;
  const states = watched(PHONE_TAKE, 'steps', tf).split('|').filter(Boolean);
  const sending = tween(frame, send, 40, ease.inOut);
  const claude = rise(frame, send - 10, fps) * (1 - tween(frame, send + 70, 14, ease.in));
  return (
    <div style={{ position: 'absolute', left: HUD.left, top: HUD.top, width: 500, opacity: p, transform: `translateX(${(1 - p) * 24}px)` }}>
      <div style={{ font: `600 20px/1 ${FONT.sans}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink3 }}>Tool calls</div>
      <div style={{ font: `500 24px/1.3 ${FONT.sans}`, color: C.ink2, marginTop: 10, marginBottom: 16 }}>Each step is the agent using a tool</div>
      {CALLS.map((call, k) => {
        const state = states[k];
        if (!state) return null;
        const t0 = appears(k);
        const show = interpolate(tf, [t0, t0 + 8], [0, 1], CLAMP);
        const running = state.includes('is-running');
        const adjusted = state.includes('is-error');
        const done = state.includes('is-done');
        return (
          <div key={k} style={{ position: 'relative', height: HUD.row, display: 'flex', alignItems: 'center', gap: 14, opacity: show, transform: `translateY(${(1 - show) * 10}px)` }}>
            <span
              style={{
                width: 30,
                height: 30,
                flex: 'none',
                borderRadius: 99,
                display: 'grid',
                placeItems: 'center',
                background: done ? PHASE.follicular.solid : adjusted ? PHASE.ovulatory.solid : 'transparent',
                boxShadow: running ? `inset 0 0 0 3px ${PHASE.luteal.solid}` : 'none',
                color: '#fff',
                font: `700 17px/1 ${FONT.sans}`,
              }}
            >
              {done ? '✓' : adjusted ? '↺' : ''}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ font: `500 23px/1.1 ${FONT.mono}`, color: C.ink }}>{call.tool}</div>
              <div style={{ font: `500 20px/1.3 ${FONT.sans}`, color: C.ink2, marginTop: 5 }}>
                {call.did}
                {adjusted ? <span style={{ color: PHASE.ovulatory.solid, fontWeight: 600 }}> · didn't fit, adjusted</span> : null}
                {done && k >= 4 ? <span style={{ color: PHASE.follicular.solid, fontWeight: 600 }}> · fits</span> : null}
              </div>
            </div>
          </div>
        );
      })}
      {claude > 0.001 ? (
        <svg width={500} height={640} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: claude }}>
          <path
            d={`M ${ICON_X} ${rowY(3) + 22} L ${ICON_X} ${NODE.y} L ${NODE.x} ${NODE.y}`}
            fill="none"
            stroke={C.ink3}
            strokeWidth={2.5}
            strokeDasharray="2 9"
            strokeLinecap="round"
          />
          {[0, 1, 2, 3].map((k) => {
            const t = interpolate(sending, [k * 0.16, k * 0.16 + 0.52], [0, 1], CLAMP);
            if (t <= 0 || t >= 1) return null;
            const down = NODE.y - rowY(k);
            const d = ease.inOut(t) * (down + NODE.x - ICON_X);
            const [x, y] = d < down ? [ICON_X, rowY(k) + d] : [ICON_X + d - down, NODE.y];
            return <circle key={k} cx={x} cy={y} r={7} fill={PHASE.luteal.solid} opacity={Math.min(1, Math.sin(Math.PI * t) * 2)} />;
          })}
        </svg>
      ) : null}
      {claude > 0.001 ? (
        <div style={{ position: 'absolute', left: NODE.x + 10, top: NODE.y - 36, opacity: claude, transform: `translateY(${(1 - claude) * 14}px)` }}>
          <Glass radius={24} frost={16} style={{ padding: '16px 24px', boxShadow: SHADOW.lift }}>
            <div style={{ font: `500 40px/1 ${FONT.serif}`, color: C.ink }}>Claude</div>
          </Glass>
          <div style={{ font: `600 24px/1.3 ${FONT.sans}`, color: C.ink2, marginTop: 14, whiteSpace: 'nowrap' }}>Only when you ask</div>
        </div>
      ) : null}
    </div>
  );
};

/** Step 3, on the phone: asking the Guide, what an agent is, and the real agent working its tools. */
export const Guide: React.FC = () => {
  const c = chapter('guide');
  const len = c.end - c.from;
  const g3 = line('guide.3');
  const g8 = line('guide.8');
  const g9 = line('guide.9');
  const g10 = line('guide.10');
  const g11 = line('guide.11');
  const g12 = line('guide.12');
  const g13 = line('guide.13');
  const morph = line('guide.1').localEnd - 8;

  const ask = click(PHONE_TAKE, 0);
  const steps = (test: (v: string) => boolean) => when(PHONE_TAKE, 'steps', test);
  const read = (k: number) => steps((v) => countSteps(v, 'is-done kind-read') >= k);
  const firstRun = steps((v) => v.includes('is-running'));
  const draft = (k: number) => steps((v) => countSteps(v, 'kind-propose') >= k);
  const bounced = (k: number) => steps((v) => countSteps(v, 'is-error') >= k);
  const drafted = steps((v) => v.includes('is-done kind-propose'));
  const cardsAt = mark(PHONE_TAKE, 'cards').frame;

  const clickAt = word('guide.2', 'Plan') + 2;
  const loopFrom = g3.local - 14;
  const loopTo = g9.local - 16;
  const five = word('guide.12', 'five');
  const time = beatMap([
    [morph - 2, ask.frame - 20],
    [clickAt, ask.frame],
    [clickAt + 30, firstRun - 2],
    [word('guide.9', 'checks'), firstRun + 4],
    [word('guide.9', 'cycle') + 2, read(1) + 2],
    [word('guide.9', 'calendar') + 2, read(2) + 2],
    [word('guide.9', 'habits') + 2, read(3) + 2],
    [word('guide.9', 'check-ins') + 4, read(4) + 2],
    [word('guide.11', 'drafts'), draft(1) + 6],
    [word('guide.11', 'catches') + 2, bounced(1) + 3],
    [word('guide.11', 'fit'), draft(2) + 4],
    [word('guide.11', 'fixes') + 2, bounced(2) + 3],
    [g11.localEnd + 14, draft(3) + 3],
    [g12.local + 4, drafted + 8],
    [five - 2, cardsAt - 50],
    [five + 30, cardsAt],
    [len, Math.min(take(PHONE_TAKE).frames - 1, cardsAt + 40)],
  ]);

  const empty = rects(PHONE_TAKE, 'empty', ['starter', 'head'] as const);
  const reads = rects(PHONE_TAKE, 'reads', ['steps', 's0', 's1', 's2', 's3', 'user'] as const);
  const drafts = rects(PHONE_TAKE, 'drafts', ['steps', 's4', 's5', 's6'] as const);
  const cards = rects(PHONE_TAKE, 'cards', ['card', 'head', 'i0', 'reason', 'day27'] as const);

  const away: Partial<Cam> = { ...PHONE_REST, z: 0.55, sy: 620 };
  const phoneOpacity = (f: number) => {
    const out = tween(f, loopFrom, 16, ease.in);
    const back = tween(f, loopTo - 6, 18, ease.out);
    const leave = tween(f, len - 12, 12, ease.in);
    return Math.max(0, 1 - out + back) * (1 - leave);
  };

  return (
    <AbsoluteFill>
      <AppShot
        take={PHONE_TAKE}
        phone={{ time: '9:10' }}
        time={time}
        start={PHONE_ASIDE}
        opacity={phoneOpacity}
        cam={[
          { at: morph, to: focusPhone(pad(union(empty.head, empty.starter), 16, 30), MIDDLE, 1.7), dur: 34 },
          { at: clickAt + 8, to: focusPhone(pad(union(reads.user, reads.steps), 16, 40), MIDDLE, 1.8), dur: 36 },
          { at: loopFrom, to: away, dur: 22 },
          { at: loopTo - 8, to: focusPhone(pad(union(reads.user, reads.steps), 16, 40), MIDDLE, 1.9), dur: 34 },
          { at: g11.local - 10, to: focusPhone(pad(drafts.steps, 16, 40), MIDDLE, 1.9), dur: 34 },
          { at: g12.local - 2, to: { ...PHONE_REST, sx: 860 }, dur: 30 },
          { at: five + 8, to: focusPhone(pad(union(cards.head, cards.i0), 16, 24), MIDDLE, 1.6), dur: 34 },
          { at: g13.local + 2, to: focusPhone(pad(cards.i0, 12, 20), MIDDLE, 2.1), dur: 36 },
          { at: len - 26, to: { ...PHONE_REST, z: 0.7, sx: -200 }, dur: 26, curve: ease.in },
        ]}
        overlay={({ cam, frame: f, tf }) => (
          <>
            <Callout cam={cam} frame={f} rect={empty.starter} from={morph + 30} until={clickAt - 2} label="One tap to ask" side="right" gap={48} />
            <Callout cam={cam} frame={f} rect={reads.s0} from={word('guide.9', 'checks')} until={word('guide.9', 'calendar')} inset={4} />
            <Callout cam={cam} frame={f} rect={reads.s1} from={word('guide.9', 'calendar')} until={word('guide.9', 'habits')} inset={4} />
            <Callout cam={cam} frame={f} rect={reads.s2} from={word('guide.9', 'habits')} until={word('guide.9', 'check-ins')} inset={4} />
            <Callout cam={cam} frame={f} rect={reads.s3} from={word('guide.9', 'check-ins')} until={g10.local - 6} inset={4} />
            <Callout cam={cam} frame={f} rect={drafts.s4} from={word('guide.11', 'catches') + 6} until={word('guide.11', 'fixes') + 2} inset={4} color={PHASE.ovulatory.solid} label="Didn't fit your calendar" sub="Caught by a tool" side="left" gap={48} />
            <Callout cam={cam} frame={f} rect={drafts.s5} from={word('guide.11', 'fixes') + 4} until={g12.local - 4} inset={4} color={PHASE.ovulatory.solid} label="Fixed by the model" sub="Then checked again" side="left" gap={48} />
            <Callout cam={cam} frame={f} rect={cards.head} from={five + 34} until={g13.local - 2} inset={8} label="5 suggestions" sub="Waiting for you" side="left" gap={48} />
            <Marker cam={cam} frame={f} rect={cards.day27} from={word('guide.13', 'around') - 2} until={len - 24} />
            <Callout cam={cam} frame={f} rect={{ x: 402, y: cards.reason.y, w: 1, h: cards.reason.h }} from={word('guide.13', 'logged') - 4} until={len - 26} ring={false} label="From your own check-ins" sub="Low energy, headaches" side="right" gap={48} />
            <ToolHud frame={f} tf={tf} from={loopTo + 6} until={g12.local + 6} send={g10.local + 4} />
          </>
        )}
      />
      <Sequence from={loopFrom} durationInFrames={loopTo - loopFrom + 20} layout="none">
        <AgentDiagram
          cues={{
            model: g3.local - loopFrom,
            claude: word('guide.3', 'Claude') - loopFrom,
            chatbot: line('guide.4').local - loopFrom,
            sees: word('guide.4', 'sees') - loopFrom,
            agent: line('guide.5').local - loopFrom,
            tools: word('guide.5', 'tools') - 6 - loopFrom,
            tool: line('guide.6').local - loopFrom,
            code: word('guide.6', 'code') - loopFrom,
            calendar: line('guide.7').local - loopFrom,
            result: word('guide.7', 'calendar') - loopFrom,
            loop: g8.local - loopFrom,
            decides: word('guide.8', 'decides') - loopFrom,
            calls: word('guide.8', 'calls') - loopFrom,
            reads: word('guide.8', 'reads') - loopFrom,
            repeats: word('guide.8', 'repeats') - loopFrom,
            propose: word('guide.8', 'propose') - loopFrom,
            exit: loopTo - loopFrom - 10,
          }}
        />
      </Sequence>
      <ClickSounds take={PHONE_TAKE} time={time} length={len} />
      <Sfx at={loopFrom - 10} name="whoosh" />
      <Sfx at={loopTo - 8} name="whoosh" />
      <Sfx at={len - 24} name="whoosh" gain={0.8} />
      <StepHeader step={3} name="Ask the Guide" morphAt={morph} until={len - 6} />
    </AbsoluteFill>
  );
};
