import React from 'react';
import { clicks, type TakeId } from './takes.ts';
import { C, ease } from './theme.ts';

type Pt = { x: number; y: number };

/** Where the pointer is at a take frame, and how it looks: it travels to each click on an arc. */
export function pointer(id: TakeId, tf: number): { x: number; y: number; opacity: number; press: number; ripple: number } | null {
  const list = clicks(id);
  if (!list.length) return null;
  const nextIdx = list.findIndex((c) => c.frame + 8 >= tf);
  const prev = nextIdx === -1 ? list.at(-1) : nextIdx > 0 ? list[nextIdx - 1] : undefined;

  if (nextIdx === -1) {
    const last = list.at(-1) as (typeof list)[number];
    const since = tf - last.frame;
    return { x: last.x, y: last.y, opacity: 1 - ease.in(Math.min(1, Math.max(0, (since - 40) / 12))), press: 0, ripple: since <= 14 ? since / 14 : 0 };
  }

  const c = list[nextIdx] as (typeof list)[number];
  const fromPrev = prev && c.hover - prev.frame < 150;
  const origin: Pt = fromPrev && prev ? prev : { x: c.x + 170, y: c.y + 130 };
  const dist = Math.hypot(c.x - origin.x, c.y - origin.y);
  const travel = Math.round(Math.min(26, Math.max(14, 10 + dist / 40)));
  const t0 = c.hover - travel;

  if (tf < t0) {
    if (prev && fromPrev) return { x: prev.x, y: prev.y, opacity: 1, press: 0, ripple: tf - prev.frame <= 14 ? (tf - prev.frame) / 14 : 0 };
    if (prev) {
      const since = tf - prev.frame;
      return { x: prev.x, y: prev.y, opacity: 1 - ease.in(Math.min(1, Math.max(0, (since - 40) / 12))), press: 0, ripple: since <= 14 ? since / 14 : 0 };
    }
    return null;
  }
  if (tf < c.hover) {
    const t = ease.inOut((tf - t0) / travel);
    const bow = Math.sin(Math.PI * t) * Math.min(36, dist * 0.08);
    const nx = dist ? -(c.y - origin.y) / dist : 0;
    const ny = dist ? (c.x - origin.x) / dist : 0;
    return {
      x: origin.x + (c.x - origin.x) * t + nx * bow,
      y: origin.y + (c.y - origin.y) * t + ny * bow,
      opacity: fromPrev ? 1 : Math.min(1, (tf - t0) / 8),
      press: 0,
      ripple: 0,
    };
  }
  const sincePress = tf - c.frame;
  const press = sincePress < 0 ? 0 : sincePress <= 2 ? sincePress / 2 : Math.max(0, 1 - (sincePress - 2) / 6);
  return { x: c.x, y: c.y, opacity: 1, press, ripple: sincePress >= 0 && sincePress <= 14 ? sincePress / 14 : 0 };
}

/** A macOS-style arrow pointer drawn in app pixels, so it scales with the camera. */
export const Cursor: React.FC<{ take: TakeId; tf: number }> = ({ take: id, tf }) => {
  const p = pointer(id, tf);
  if (!p || p.opacity <= 0) return null;
  const scale = 1 - 0.14 * p.press;
  return (
    <>
      {p.ripple > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: 44,
            height: 44,
            marginLeft: -22,
            marginTop: -22,
            borderRadius: 999,
            border: `2px solid ${C.ink}`,
            opacity: 0.32 * (1 - ease.out(p.ripple)),
            transform: `scale(${0.3 + 0.9 * ease.out(p.ripple)})`,
          }}
        />
      ) : null}
      <svg
        width={30}
        height={30}
        viewBox="0 0 30 30"
        style={{ position: 'absolute', left: p.x - 5, top: p.y - 3, opacity: p.opacity, transform: `scale(${scale})`, transformOrigin: '5px 3px', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.28))', overflow: 'visible' }}
      >
        <path d="M5 3 L5 24 L10.2 19.2 L13.6 27 L17.2 25.4 L13.8 17.8 L20.8 17.8 Z" fill="#111" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </>
  );
};
