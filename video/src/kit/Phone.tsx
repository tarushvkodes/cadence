import React from 'react';
import { PHONE, PHONE_BEZEL, PHONE_BOTTOM, PHONE_TOP } from './camera.ts';
import { clicks, type TakeId } from './takes.ts';
import { C, ease, FONT, SHADOW } from './theme.ts';

const SCREEN_W = PHONE.w - 2 * PHONE_BEZEL;
const SCREEN_H = PHONE.h - 2 * PHONE_BEZEL;

const Battery: React.FC = () => (
  <svg width={25} height={12} viewBox="0 0 25 12">
    <rect x={0.5} y={0.5} width={21} height={11} rx={3} fill="none" stroke={C.ink} strokeOpacity={0.4} />
    <rect x={2} y={2} width={15} height={8} rx={1.6} fill={C.ink} />
    <rect x={22.5} y={4} width={1.6} height={4} rx={0.8} fill={C.ink} fillOpacity={0.4} />
  </svg>
);

const Signal: React.FC = () => (
  <svg width={17} height={11} viewBox="0 0 17 11">
    {[0, 1, 2, 3].map((i) => (
      <rect key={i} x={i * 4.5} y={8 - i * 2.6} width={3} height={3 + i * 2.6} rx={0.8} fill={C.ink} />
    ))}
  </svg>
);

/**
 * A plain, unbranded phone: a dark body with side keys, a punch-hole camera, a status row, and the
 * browser's address shown small under it, because Cadence runs in the phone's browser.
 */
export const Phone: React.FC<{ time: string; children: React.ReactNode }> = ({ time, children }) => (
  <div style={{ position: 'relative', width: PHONE.w, height: PHONE.h }}>
    {[
      { side: 'left', top: 150, h: 28 },
      { side: 'left', top: 196, h: 54 },
      { side: 'left', top: 262, h: 54 },
      { side: 'right', top: 210, h: 84 },
    ].map((k, i) => (
      <span key={i} style={{ position: 'absolute', top: k.top, [k.side]: -3, width: 4, height: k.h, borderRadius: 2, background: '#2B2825' }} />
    ))}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 66,
        background: '#1C1A18',
        boxShadow: `${SHADOW.window}, inset 0 0 0 1.5px #3A3632, inset 0 0 0 4px #141210`,
        padding: PHONE_BEZEL,
      }}
    >
      <div style={{ position: 'relative', width: SCREEN_W, height: SCREEN_H, borderRadius: 54, overflow: 'hidden', background: C.bg }}>
        <div style={{ position: 'relative', height: PHONE_TOP, font: `600 15px/1 ${FONT.sans}`, color: C.ink, letterSpacing: '-0.01em' }}>
          <span style={{ position: 'absolute', left: 34, top: 15 }}>{time}</span>
          <span style={{ position: 'absolute', left: SCREEN_W / 2 - 6, top: 11, width: 12, height: 12, borderRadius: 99, background: '#0B0A09' }} />
          <span style={{ position: 'absolute', right: 30, top: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
            <Signal />
            <Battery />
          </span>
          <span style={{ position: 'absolute', left: 0, right: 0, top: 31, textAlign: 'center', font: `500 11px/1 ${FONT.sans}`, color: C.ink3, letterSpacing: 0 }}>localhost:5173</span>
        </div>
        <div style={{ position: 'relative', width: SCREEN_W, height: 844, overflow: 'hidden' }}>{children}</div>
        <div style={{ height: PHONE_BOTTOM, position: 'relative' }}>
          <span style={{ position: 'absolute', left: SCREEN_W / 2 - 67, bottom: 7, width: 134, height: 5, borderRadius: 3, background: C.ink, opacity: 0.85 }} />
        </div>
      </div>
    </div>
  </div>
);

/** A fingertip: it lands just before the tap, presses, and lifts with a soft ring. */
export const Touch: React.FC<{ take: TakeId; tf: number }> = ({ take: id, tf }) => {
  const near = clicks(id).find((c) => tf >= c.frame - 9 && tf <= c.frame + 16);
  if (!near) return null;
  const d = tf - near.frame;
  const land = ease.out(Math.min(1, (d + 9) / 7));
  const lift = ease.in(Math.max(0, Math.min(1, (d - 4) / 10)));
  const press = d >= 0 && d < 5 ? 0.88 : 1;
  const ring = d >= 0 ? Math.min(1, d / 14) : 0;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: near.x - 22,
          top: near.y - 22,
          width: 44,
          height: 44,
          borderRadius: 99,
          background: 'rgba(31, 27, 23, 0.16)',
          boxShadow: 'inset 0 0 0 2px rgba(255, 255, 255, 0.7), 0 2px 8px rgba(31, 27, 23, 0.18)',
          opacity: land * (1 - lift),
          transform: `scale(${(1.25 - 0.25 * land) * press})`,
        }}
      />
      {ring > 0 && ring < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: near.x - 22,
            top: near.y - 22,
            width: 44,
            height: 44,
            borderRadius: 99,
            border: `2px solid ${C.ink}`,
            opacity: 0.28 * (1 - ring),
            transform: `scale(${1 + 0.9 * ease.out(ring)})`,
          }}
        />
      ) : null}
    </>
  );
};
