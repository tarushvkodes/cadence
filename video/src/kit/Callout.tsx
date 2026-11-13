import React from 'react';
import { useVideoConfig } from 'remotion';
import { projectRect, type Cam } from './camera.ts';
import { pad, type Rect } from './takes.ts';
import { C, FONT, PHASE, presence, SHADOW } from './theme.ts';

type Side = 'right' | 'left' | 'top' | 'bottom';

/** A short label on a paper card, so it reads cleanly over any part of the app. */
export const Label: React.FC<{ text: string; sub?: string; size?: number; style?: React.CSSProperties }> = ({ text, sub, size = 36, style }) => (
  <div style={{ background: C.elevated, borderRadius: 18, border: `1px solid ${C.line}`, padding: `${size * 0.46}px ${size * 0.72}px`, boxShadow: SHADOW.lift, whiteSpace: 'nowrap', ...style }}>
    <div style={{ font: `600 ${size}px/1.15 ${FONT.sans}`, letterSpacing: '-0.018em', color: C.ink }}>{text}</div>
    {sub ? <div style={{ font: `500 ${size * 0.68}px/1.3 ${FONT.sans}`, color: C.ink2, marginTop: 4, letterSpacing: '-0.01em' }}>{sub}</div> : null}
  </div>
);

/**
 * Rings an element of the app and labels it. The ring and label follow the element through camera
 * moves because both are projected from the app rect every frame.
 */
export const Callout: React.FC<{
  cam: Cam;
  frame: number;
  rect: Rect;
  from: number;
  until: number;
  label?: string;
  sub?: string;
  side?: Side;
  color?: string;
  inset?: number;
  radius?: number;
  gap?: number;
  size?: number;
  ring?: boolean;
}> = ({ cam, frame, rect, from, until, label, sub, side = 'right', color = PHASE.luteal.solid, inset = 8, radius = 14, gap = 22, size, ring = true }) => {
  const { fps } = useVideoConfig();
  const p = presence(frame, fps, from, until);
  if (p <= 0.001) return null;
  const r = projectRect(cam, pad(rect, inset));
  const dx = side === 'right' ? 1 : side === 'left' ? -1 : 0;
  const dy = side === 'bottom' ? 1 : side === 'top' ? -1 : 0;
  const anchor =
    side === 'right'
      ? { left: r.x + r.w + gap, top: r.y + r.h / 2, transform: 'translateY(-50%)' }
      : side === 'left'
        ? { left: r.x - gap, top: r.y + r.h / 2, transform: 'translate(-100%, -50%)' }
        : side === 'bottom'
          ? { left: r.x + r.w / 2, top: r.y + r.h + gap, transform: 'translateX(-50%)' }
          : { left: r.x + r.w / 2, top: r.y - gap, transform: 'translate(-50%, -100%)' };
  return (
    <>
      {ring ? (
        <div
          style={{
            position: 'absolute',
            left: r.x,
            top: r.y,
            width: r.w,
            height: r.h,
            borderRadius: radius * cam.z,
            boxShadow: `0 0 0 3px ${color}`,
            background: `color-mix(in oklab, ${color} 5%, transparent)`,
            opacity: p,
            transform: `scale(${1.03 - 0.03 * p})`,
          }}
        />
      ) : null}
      {label ? (
        <div style={{ position: 'absolute', ...anchor, opacity: p }}>
          <div style={{ transform: `translate(${dx * 16 * (1 - p)}px, ${dy * 16 * (1 - p)}px)` }}>
            <Label text={label} sub={sub} size={size} />
          </div>
        </div>
      ) : null}
    </>
  );
};

/** A highlighter pen across a run of text, one stroke per wrapped line, drawn left to right. */
export const Marker: React.FC<{ cam: Cam; frame: number; rect: Rect; from: number; until: number; color?: string }> = ({
  cam,
  frame,
  rect,
  from,
  until,
  color = PHASE.ovulatory.tint,
}) => {
  const { fps } = useVideoConfig();
  const out = presence(frame, fps, from, until + 1000);
  const fade = 1 - Math.min(1, Math.max(0, (frame - (until - 9)) / 9));
  const lines = rect.lines?.length ? rect.lines : [rect];
  const per = 10;
  return (
    <>
      {lines.map((l, i) => {
        const t = Math.min(1, Math.max(0, (frame - from - i * per) / per));
        const eased = 1 - Math.pow(1 - t, 3);
        const r = projectRect(cam, { x: l.x - 3, y: l.y + l.h * 0.08, w: l.w + 6, h: l.h * 0.88 });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              width: r.w * eased,
              height: r.h,
              borderRadius: 4 * cam.z,
              background: color,
              mixBlendMode: 'multiply',
              opacity: Math.min(out, fade),
            }}
          />
        );
      })}
    </>
  );
};
