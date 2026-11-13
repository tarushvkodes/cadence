import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Sfx } from '../kit/Sounds.tsx';
import { C, CLAMP, ease, FONT, PHASE, rise, SHADOW, tween } from '../kit/theme.ts';

/** Frames, relative to the diagram's start, of the narration beats it follows. */
export type DiagramCues = {
  model: number;
  claude: number;
  chatbot: number;
  sees: number;
  agent: number;
  tools: number;
  tool: number;
  code: number;
  calendar: number;
  result: number;
  loop: number;
  decides: number;
  calls: number;
  reads: number;
  repeats: number;
  propose: number;
  exit: number;
};

const MODEL = { x: 760, y: 410, r: 118 };
const CHIP_Y = 690;
/** The tools Cadence gives the model (src/agent/schemas.ts), in the order the Guide calls them. */
const TOOLS = [
  { id: 'get_cycle_status', x: 310 },
  { id: 'list_events', x: 535 },
  { id: 'list_habits', x: 760 },
  { id: 'get_check_ins', x: 985 },
  { id: 'propose_changes', x: 1210 },
] as const;
const CALENDAR = 1;
const SUGGESTIONS = { x: 1420, y: MODEL.y };

/** The calendar tool as the app's source has it (src/agent/tools.ts), types left out. */
const CODE = [
  'function listEvents({ snapshot }, input) {',
  '  const from = (input.from && parseISODate(input.from)) || snapshot.today;',
  '  const to = (input.to && parseISODate(input.to)) || addDays(from, 6);',
  '  const events = snapshot.events.filter((ev) => {',
  '    const date = dateOf(ev.start);',
  '    return compareDates(from, date) <= 0 && compareDates(date, to) <= 0;',
  '  });',
  '  …',
];

type Pt = { x: number; y: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const chipTop = (i: number): Pt => ({ x: TOOLS[i]?.x ?? MODEL.x, y: CHIP_Y - 26 });
const modelFoot: Pt = { x: MODEL.x, y: MODEL.y + MODEL.r };

/** Swaps one short title for the next as the explanation moves on. */
const Eyebrow: React.FC<{ frame: number; steps: readonly (readonly [number, string])[] }> = ({ frame, steps }) => (
  <div style={{ position: 'absolute', left: 150, top: 110, height: 40 }}>
    {steps.map(([at, text], i) => {
      const next = steps[i + 1]?.[0];
      const inP = tween(frame, at, 14, ease.out);
      const outP = next === undefined ? 0 : tween(frame, next - 9, 9, ease.in);
      const o = Math.min(inP, 1 - outP);
      if (o <= 0.001) return null;
      return (
        <div key={text} style={{ position: 'absolute', whiteSpace: 'nowrap', opacity: o, filter: `blur(${(1 - o) * 4}px)`, transform: `translateY(${(1 - inP) * 14 - outP * 10}px)`, font: `600 26px/1 ${FONT.sans}`, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ink2 }}>
          {text}
        </div>
      );
    })}
  </div>
);

/**
 * What an agent is, in four moves on one stage: the model; a plain chatbot that sees only your
 * message; the same model with tools, one of them opened to its real code; and the loop the agent runs
 * through those tools until it can propose changes. The bead is the Today dial's marker.
 */
export const AgentDiagram: React.FC<{ cues: DiagramCues }> = ({ cues: q }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = tween(frame, q.exit, 14, ease.in);
  if (exit >= 1) return null;

  const ringDraw = tween(frame, q.model - 6, 30, ease.inOut);
  const modelIn = rise(frame, q.model + 4, fps);
  const claudeIn = rise(frame, q.claude - 4, fps);
  const youIn = rise(frame, q.chatbot - 2, fps);
  const arrowIn = tween(frame, q.chatbot + 6, 16, ease.out);
  const answerIn = rise(frame, q.chatbot + 16, fps);
  const seesIn = rise(frame, q.sees - 4, fps);
  const chatbotOut = tween(frame, q.agent - 6, 14, ease.in);
  const chipIn = (i: number) => rise(frame, q.tools + i * 3, fps);
  const lineIn = (i: number) => tween(frame, q.tools - 4 + i * 3, 18, ease.out);
  const focusTool = tween(frame, q.tool - 2, 16, ease.inOut) * (1 - tween(frame, q.loop - 10, 14, ease.inOut));
  const codeIn = rise(frame, q.code - 6, fps);
  const resultIn = rise(frame, q.result - 4, fps);
  const codeOut = tween(frame, q.loop - 10, 12, ease.in);
  const thinking = interpolate(frame, [q.decides - 4, q.decides + 6, q.calls - 2, q.calls + 6], [0, 1, 1, 0], CLAMP);
  const proposeIn = rise(frame, q.propose + 10, fps);

  // The bead's trip: out to a tool and back, again for each tool, then out to propose.
  const legs: { at: number; dur: number; from: Pt; to: Pt }[] = [];
  const trip = (at: number, i: number, dur: number) => {
    legs.push({ at, dur, from: modelFoot, to: chipTop(i) });
    legs.push({ at: at + dur + 2, dur, from: chipTop(i), to: modelFoot });
  };
  trip(q.calls - 4, 0, 14);
  const gap = Math.max(8, Math.floor((q.propose - q.repeats - 6) / 6));
  trip(q.repeats - 2, 1, gap);
  trip(q.repeats - 2 + 2 * (gap + 2), 2, gap);
  trip(q.repeats - 2 + 4 * (gap + 2), 3, gap);
  const proposeAt = Math.max(q.propose - 2, q.repeats - 2 + 6 * (gap + 2));
  legs.push({ at: proposeAt, dur: 14, from: modelFoot, to: chipTop(4) });
  legs.push({ at: proposeAt + 16, dur: 18, from: chipTop(4), to: { x: SUGGESTIONS.x - 190, y: SUGGESTIONS.y } });
  let bead: Pt = modelFoot;
  for (const leg of legs) {
    if (frame < leg.at) break;
    const t = ease.inOut(Math.min(1, (frame - leg.at) / leg.dur));
    bead = { x: lerp(leg.from.x, leg.to.x, t), y: lerp(leg.from.y, leg.to.y, t) };
  }
  const visits = legs.flatMap((leg, k) => {
    const chip = TOOLS.findIndex((tool) => tool.x === leg.to.x && leg.to.y === CHIP_Y - 26);
    const back = legs[k + 1];
    return chip < 0 ? [] : [{ chip, from: leg.at + leg.dur * 0.6, to: (back?.at ?? leg.at + leg.dur) + (back?.dur ?? 10) * 0.4 }];
  });
  const beadIn = rise(frame, q.decides, fps);
  const lit = (i: number) => (beadIn > 0.5 && visits.some((v) => v.chip === i && frame >= v.from && frame <= v.to) ? 1 : 0);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit, transform: `scale(${1 - 0.03 * exit})` }}>
      <Eyebrow
        frame={frame}
        steps={[
          [q.model - 8, 'How the Guide works'],
          [q.chatbot - 4, 'A plain chatbot'],
          [q.agent - 4, 'An agent'],
          [q.tool - 4, 'A tool'],
          [q.loop - 4, 'The agent loop'],
        ]}
      />

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <circle cx={MODEL.x} cy={MODEL.y} r={MODEL.r} fill="none" stroke={C.ink} strokeOpacity={0.1} strokeWidth={14} strokeDasharray={`${ringDraw * 2 * Math.PI * MODEL.r} 9999`} transform={`rotate(-90 ${MODEL.x} ${MODEL.y})`} />
        <circle cx={MODEL.x} cy={MODEL.y} r={MODEL.r} fill="none" stroke={PHASE.luteal.solid} strokeWidth={4} opacity={thinking} />
        <line x1={540} y1={MODEL.y} x2={MODEL.x - MODEL.r - 16} y2={MODEL.y} stroke={C.ink3} strokeWidth={2.5} strokeDasharray="2 9" strokeLinecap="round" opacity={arrowIn} />
        <line x1={MODEL.x + MODEL.r + 16} y1={MODEL.y} x2={1000} y2={MODEL.y} stroke={C.ink3} strokeWidth={2.5} strokeDasharray="2 9" strokeLinecap="round" opacity={arrowIn * (1 - chatbotOut)} />
        {TOOLS.map((t, i) => {
          const p = lineIn(i);
          const a = modelFoot;
          const b = chipTop(i);
          const dim = i === CALENDAR ? 1 : 1 - 0.65 * focusTool;
          return <line key={t.id} x1={a.x} y1={a.y} x2={lerp(a.x, b.x, p)} y2={lerp(a.y, b.y, p)} stroke={lit(i) ? PHASE.luteal.solid : C.ink3} strokeOpacity={0.55 * dim} strokeWidth={lit(i) ? 3 : 2} strokeLinecap="round" />;
        })}
        <line x1={TOOLS[4].x + 100} y1={CHIP_Y - 26} x2={SUGGESTIONS.x - 200} y2={SUGGESTIONS.y + 30} stroke={C.ink3} strokeWidth={2.5} strokeDasharray="2 9" strokeLinecap="round" opacity={proposeIn} />
      </svg>

      <div style={{ position: 'absolute', left: MODEL.x - 160, top: MODEL.y - 40, width: 320, textAlign: 'center' }}>
        <div style={{ font: `500 50px/1 ${FONT.serif}`, letterSpacing: '-0.02em', color: C.ink, opacity: modelIn, transform: `translateY(${(1 - modelIn) * 12}px)` }}>The model</div>
        <div style={{ font: `500 22px/1.35 ${FONT.sans}`, color: C.ink2, marginTop: 12, opacity: claudeIn }}>
          Claude, a large
          <br />
          language model
        </div>
      </div>

      <div style={{ position: 'absolute', left: 150, top: MODEL.y, transform: `translate(${(1 - youIn) * -24}px, -50%)`, opacity: youIn }}>
        <div style={{ font: `600 18px/1 ${FONT.sans}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink3, marginBottom: 12 }}>You type</div>
        <div style={{ position: 'relative' }}>
          <div style={{ background: PHASE.luteal.solid, color: PHASE.luteal.onSolid, font: `600 28px/1.25 ${FONT.sans}`, padding: '18px 26px', borderRadius: 26, borderBottomRightRadius: 8, boxShadow: SHADOW.lift, width: 340 }}>
            Plan my week around my cycle.
          </div>
          <div style={{ position: 'absolute', inset: -14, borderRadius: 36, border: `2px dashed ${C.ink3}`, opacity: seesIn * (1 - chatbotOut) }} />
          <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 24, font: `600 22px/1 ${FONT.sans}`, color: C.ink2, whiteSpace: 'nowrap', opacity: seesIn * (1 - chatbotOut) }}>
            All a chatbot sees
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 1010, top: MODEL.y, transform: `translate(${(1 - answerIn) * 24}px, -50%)`, opacity: answerIn * (1 - chatbotOut) }}>
        <div style={{ font: `600 18px/1 ${FONT.sans}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink3, marginBottom: 12 }}>It answers</div>
        <div style={{ background: C.elevated, border: `1px solid ${C.line}`, borderRadius: 22, padding: '22px 26px', boxShadow: SHADOW.card, width: 300 }}>
          {[1, 0.84, 0.6].map((w, i) => (
            <div key={i} style={{ height: 12, width: `${w * 100}%`, borderRadius: 6, background: C.lineStrong, marginTop: i ? 12 : 0 }} />
          ))}
        </div>
      </div>

      {TOOLS.map((t, i) => {
        const s = chipIn(i);
        const dim = i === CALENDAR ? 1 : 1 - 0.65 * focusTool;
        const hot = lit(i) || (i === CALENDAR ? focusTool : 0);
        return (
          <div
            key={t.id}
            style={{
              position: 'absolute',
              left: t.x,
              top: CHIP_Y,
              transform: `translate(-50%, -50%) translateY(${(1 - s) * 18}px) scale(${1 + 0.05 * lit(i)})`,
              opacity: s * dim,
              background: C.elevated,
              border: `1px solid ${C.line}`,
              boxShadow: hot > 0 ? `0 0 0 3px ${PHASE.luteal.solid}, ${SHADOW.card}` : SHADOW.card,
              borderRadius: 14,
              padding: '12px 16px',
              font: `500 19px/1 ${FONT.mono}`,
              color: C.ink,
              whiteSpace: 'nowrap',
            }}
          >
            {t.id}
          </div>
        );
      })}

      <div style={{ position: 'absolute', left: 1000, top: 210, width: 820, opacity: codeIn * (1 - codeOut), transform: `translateY(${(1 - codeIn) * 22 - codeOut * 12}px)` }}>
        <div style={{ font: `600 18px/1 ${FONT.sans}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink3, marginBottom: 12 }}>The calendar tool, in our code</div>
        <div style={{ background: C.elevated, border: `1px solid ${C.line}`, borderRadius: 20, padding: '20px 24px', boxShadow: SHADOW.lift }}>
          <div style={{ font: `500 17px/1.6 ${FONT.mono}`, color: C.ink3 }}>{"// list_events: Read the user's calendar for a date range."}</div>
          {CODE.map((l) => (
            <div key={l} style={{ font: `500 17px/1.6 ${FONT.mono}`, color: C.ink, whiteSpace: 'pre' }}>
              {l}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 14, opacity: resultIn, transform: `translateY(${(1 - resultIn) * 12}px)` }}>
          <span style={{ font: `600 18px/1 ${FONT.sans}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink3 }}>It returns</span>
          <span style={{ background: PHASE.luteal.tint, borderRadius: 12, padding: '10px 16px', font: `600 24px/1.2 ${FONT.sans}`, letterSpacing: '-0.012em', color: C.ink }}>Read your calendar: 25 events, Nov 16 to 22</span>
        </div>
      </div>

      <div style={{ position: 'absolute', left: SUGGESTIONS.x - 180, top: SUGGESTIONS.y, transform: `translate(${(1 - proposeIn) * 24}px, -50%)`, opacity: proposeIn }}>
        <div style={{ font: `600 18px/1 ${FONT.sans}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink3, marginBottom: 12 }}>Then it proposes</div>
        <div style={{ background: C.elevated, borderRadius: 22, padding: '18px 24px', boxShadow: SHADOW.lift, border: `2px dashed ${PHASE.luteal.solid}`, width: 360 }}>
          <div style={{ font: `600 28px/1.2 ${FONT.sans}`, color: C.ink, letterSpacing: '-0.015em' }}>Suggested changes</div>
          <div style={{ font: `500 22px/1.35 ${FONT.sans}`, color: C.ink2, marginTop: 6 }}>Waiting for you to decide</div>
        </div>
      </div>

      {beadIn > 0.01 ? (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: beadIn * (1 - tween(frame, proposeAt + 30, 10, ease.in)) }}>
          <defs>
            <filter id="diagram-bead" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#281e14" floodOpacity="0.22" />
            </filter>
          </defs>
          <g transform={`translate(${bead.x} ${bead.y}) scale(${0.6 + 0.4 * beadIn})`} filter="url(#diagram-bead)">
            <circle r={19} fill={C.elevated} />
            <circle r={12} fill="none" stroke={PHASE.luteal.solid} strokeWidth={4} />
            <circle r={4} fill={C.ink} />
          </g>
        </svg>
      ) : null}

      <Sfx at={q.tools} name="tick" gain={0.8} />
      <Sfx at={q.code - 6} name="whoosh" gain={0.5} />
      <Sfx at={q.calls + 10} name="tick" />
      <Sfx at={q.reads + 4} name="tick" />
      <Sfx at={q.propose + 10} name="tick" />
    </AbsoluteFill>
  );
};
