import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Sfx } from '../kit/Sounds.tsx';
import { C, CLAMP, ease, FONT, PHASE, rise, SHADOW, tween } from '../kit/theme.ts';

const CX = 1010;
const CY = 600;
const R = 210;

/** Stations on the loop, as turns from the top, clockwise. */
const STATIONS = [
  { id: 'decide', turn: 0, title: 'Decides what it needs', side: 'top' },
  { id: 'tool', turn: 1 / 3, title: 'Calls a tool', side: 'right' },
  { id: 'result', turn: 2 / 3, title: 'Reads the result', side: 'left' },
] as const;

/** The tools Cadence offers the model (src/agent/schemas.ts), shown as they appear in the app. */
const TOOLS = ['get_cycle_status', 'list_events', 'list_habits', 'get_check_ins', 'propose_changes'];

const at = (turn: number, r = R) => {
  const a = turn * 2 * Math.PI - Math.PI / 2;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
};

function arc(from: number, to: number, r = R) {
  if (to - from <= 0.0005) return '';
  const a = at(from, r);
  const b = at(Math.min(to, from + 0.9999), r);
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

export type LoopCues = {
  /** Frames (relative to this component) for each beat of the narration. */
  title: number;
  ask: number;
  ring: number;
  decide: number;
  tool: number;
  result: number;
  repeat: number;
  propose: number;
  exit: number;
};

/**
 * What an agent is, drawn with the film's ring: the model decides, calls a tool, reads the result,
 * and goes round again until it can propose. The bead is the Today dial's marker.
 */
export const AgentLoop: React.FC<{ cues: LoopCues }> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = tween(frame, cues.exit, 14, ease.in);
  if (exit >= 1) return null;

  const titleIn = rise(frame, cues.title, fps);
  const askIn = rise(frame, cues.ask, fps);
  const ringDraw = tween(frame, cues.ring, 30, ease.inOut);
  const modelIn = rise(frame, cues.ring + 10, fps);

  // The bead's path, in turns travelled since it appeared at the top.
  const legs: [number, number, number][] = [
    [cues.tool - 16, 16, 1 / 3],
    [cues.result - 16, 16, 1 / 3],
    [cues.repeat - 4, 22, 1 / 3],
    [cues.repeat + 18, 14, 1 / 3],
    [cues.repeat + 32, 14, 1 / 3],
    [cues.repeat + 46, 14, 1 / 3],
  ];
  let travelled = 0;
  for (const [start, dur, size] of legs) travelled += size * tween(frame, start, dur, ease.inOut);
  const beadIn = rise(frame, cues.decide, fps);
  const leave = tween(frame, cues.propose - 6, 22, ease.inOut);
  const pos = at(travelled % 1);
  const out = { x: interpolate(leave, [0, 1], [pos.x, 1330]), y: interpolate(leave, [0, 1], [pos.y, at(0).y]) };
  const bead = leave > 0 ? out : pos;

  const lit = (id: string) => {
    const stationTurn = STATIONS.find((s) => s.id === id)?.turn ?? 0;
    const d = Math.abs(((travelled % 1) - stationTurn + 1.5) % 1 - 0.5);
    const near = beadIn > 0.5 && leave < 0.2 ? Math.max(0, 1 - d / 0.07) : 0;
    return near;
  };
  const stationIn = (id: string) => rise(frame, id === 'decide' ? cues.decide : id === 'tool' ? cues.tool - 10 : cues.result - 10, fps);
  const toolsIn = rise(frame, cues.tool + 4, fps);
  const proposeIn = rise(frame, cues.propose + 8, fps);
  const notOnce = interpolate(frame, [cues.ring, cues.ring + 14, cues.decide - 6, cues.decide + 6], [0, 1, 1, 0], CLAMP);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit, transform: `scale(${1 - 0.03 * exit})` }}>
      <div style={{ position: 'absolute', left: 150, top: 104, opacity: titleIn, transform: `translateY(${(1 - titleIn) * 20}px)` }}>
        <div style={{ font: `600 24px/1 ${FONT.sans}`, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ink2, marginBottom: 18 }}>How the Guide works</div>
        <div style={{ font: `500 64px/1.05 ${FONT.serif}`, letterSpacing: '-0.026em', color: C.ink }}>An agent is a model that can use tools, in a loop.</div>
      </div>

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <path d={arc(0, ringDraw)} stroke="rgba(31, 27, 23, 0.09)" strokeWidth={16} fill="none" strokeLinecap="round" />
        <path d={arc(0, Math.min(1, travelled) * beadIn)} stroke={C.ink} strokeOpacity={0.55} strokeWidth={4} fill="none" strokeLinecap="round" style={{ opacity: 1 - leave }} />
        <line x1={560} y1={at(0).y} x2={at(0).x - 30} y2={at(0).y} stroke={C.ink3} strokeWidth={2.5} strokeDasharray="2 9" strokeLinecap="round" opacity={askIn} />
        <line x1={at(0).x + 30} y1={at(0).y} x2={1320} y2={at(0).y} stroke={C.ink3} strokeWidth={2.5} strokeDasharray="2 9" strokeLinecap="round" opacity={proposeIn} />
      </svg>

      <div style={{ position: 'absolute', left: CX - 200, top: CY - 34, width: 400, textAlign: 'center', opacity: modelIn }}>
        <div style={{ font: `500 52px/1 ${FONT.serif}`, letterSpacing: '-0.02em', color: C.ink }}>The model</div>
        <div style={{ font: `500 22px/1.4 ${FONT.sans}`, color: C.ink3, marginTop: 10 }}>Claude</div>
      </div>
      <div style={{ position: 'absolute', left: CX - 260, top: CY + R + 46, width: 520, textAlign: 'center', opacity: notOnce, font: `500 26px/1.3 ${FONT.sans}`, color: C.ink2 }}>
        Not one answer in one shot.
      </div>

      <div
        style={{
          position: 'absolute',
          left: 150,
          top: at(0).y,
          transform: `translate(${(1 - askIn) * -30}px, -50%)`,
          opacity: askIn,
        }}
      >
        <div style={{ font: `600 20px/1 ${FONT.sans}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink3, marginBottom: 12 }}>You ask</div>
        <div style={{ background: PHASE.luteal.solid, color: PHASE.luteal.onSolid, font: `600 28px/1.25 ${FONT.sans}`, padding: '18px 26px', borderRadius: 26, borderBottomRightRadius: 8, boxShadow: SHADOW.lift, maxWidth: 380 }}>
          Plan my week around my cycle.
        </div>
      </div>

      {STATIONS.map((s) => {
        const p = at(s.turn);
        const shown = stationIn(s.id);
        const glow = lit(s.id);
        const place =
          s.side === 'top'
            ? { left: p.x, top: p.y - 46, transform: 'translate(-50%, -100%)' }
            : s.side === 'right'
              ? { left: p.x + 44, top: p.y, transform: 'translateY(-50%)' }
              : { left: p.x - 44, top: p.y, transform: 'translate(-100%, -50%)' };
        return (
          <React.Fragment key={s.id}>
            <div
              style={{
                position: 'absolute',
                left: p.x - 15,
                top: p.y - 15,
                width: 30,
                height: 30,
                borderRadius: 99,
                background: C.elevated,
                boxShadow: `0 0 0 3px ${glow > 0 ? PHASE.luteal.solid : C.lineStrong}, ${SHADOW.card}`,
                opacity: shown,
              }}
            />
            <div style={{ position: 'absolute', ...place, opacity: shown }}>
              <div
                style={{
                  background: C.elevated,
                  borderRadius: 18,
                  padding: '14px 22px',
                  boxShadow: glow > 0 ? `0 0 0 3px ${PHASE.luteal.solid}, ${SHADOW.lift}` : SHADOW.card,
                  border: `1px solid ${C.line}`,
                  font: `600 30px/1.1 ${FONT.sans}`,
                  letterSpacing: '-0.018em',
                  color: C.ink,
                  whiteSpace: 'nowrap',
                  transform: `scale(${1 + 0.04 * glow})`,
                }}
              >
                {s.title}
              </div>
              {s.id === 'tool' ? (
                <div style={{ marginTop: 14, paddingLeft: 6, opacity: toolsIn }}>
                  {TOOLS.map((t, i) => (
                    <div key={t} style={{ font: `500 20px/1.55 ${FONT.mono}`, color: C.ink3, opacity: interpolate(frame, [cues.tool + 4 + i * 3, cues.tool + 14 + i * 3], [0, 1], CLAMP) }}>
                      {t}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </React.Fragment>
        );
      })}

      {beadIn > 0.01 ? (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: beadIn }}>
          <defs>
            <filter id="loop-bead" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#281e14" floodOpacity="0.22" />
            </filter>
          </defs>
          <g transform={`translate(${bead.x} ${bead.y}) scale(${0.6 + 0.4 * beadIn})`} filter="url(#loop-bead)">
            <circle r={21} fill={C.elevated} />
            <circle r={13} fill="none" stroke={PHASE.luteal.solid} strokeWidth={4} />
            <circle r={4.5} fill={C.ink} />
          </g>
        </svg>
      ) : null}

      <div style={{ position: 'absolute', left: 1350, top: at(0).y, transform: `translate(${(1 - proposeIn) * 24}px, -50%)`, opacity: proposeIn }}>
        <div style={{ font: `600 20px/1 ${FONT.sans}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink3, marginBottom: 12 }}>Then it proposes</div>
        <div style={{ background: C.elevated, borderRadius: 22, padding: '18px 24px', boxShadow: SHADOW.lift, border: `1px dashed ${PHASE.luteal.solid}`, width: 380 }}>
          <div style={{ font: `600 28px/1.2 ${FONT.sans}`, color: C.ink, letterSpacing: '-0.015em' }}>Suggestions</div>
          <div style={{ font: `500 22px/1.35 ${FONT.sans}`, color: C.ink2, marginTop: 6 }}>Nothing changes until you approve.</div>
        </div>
      </div>

      <Sfx at={cues.tool} name="tick" />
      <Sfx at={cues.result} name="tick" />
      <Sfx at={cues.propose + 8} name="tick" />
    </AbsoluteFill>
  );
};
