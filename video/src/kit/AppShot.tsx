import React from 'react';
import { AbsoluteFill, Freeze, OffthreadVideo, staticFile, useCurrentFrame } from 'remotion';
import { APP_H, APP_W, BAR, LAPTOP, PHONE, PHONE_REST, REST, sampleCam, WIN_H, type Cam, type CamKey } from './camera.ts';
import { Cursor } from './Cursor.tsx';
import { Phone, Touch } from './Phone.tsx';
import { take, type TakeId } from './takes.ts';
import { C, FONT, SHADOW } from './theme.ts';

export type ShotState = { frame: number; cam: Cam; tf: number };

/** The browser window the app runs in: a quiet title bar, then the real capture, 1:1 in app pixels. */
const Window: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ width: APP_W, height: WIN_H, borderRadius: 16, overflow: 'hidden', background: C.bg, boxShadow: SHADOW.window, outline: `1px solid ${C.line}` }}>
    <div style={{ height: BAR, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', background: '#EEE9E1', borderBottom: `1px solid ${C.line}`, position: 'relative' }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: '#DCD5CB', boxShadow: 'inset 0 0 0 0.5px rgba(31,27,23,0.12)' }} />
      ))}
      <span
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          height: 24,
          padding: '0 14px',
          borderRadius: 8,
          background: 'rgba(255,253,249,0.75)',
          display: 'flex',
          alignItems: 'center',
          font: `500 13px/1 ${FONT.sans}`,
          color: C.ink3,
          letterSpacing: '-0.01em',
        }}
      >
        localhost:5173
      </span>
    </div>
    <div style={{ position: 'relative', width: APP_W, height: APP_H }}>{children}</div>
  </div>
);

/**
 * One shot of the app: a take played through a time map, inside a laptop window or a phone, under a
 * keyframed camera. `overlay` draws in screen space with the live camera, for callouts pinned to the app.
 */
export const AppShot: React.FC<{
  take: TakeId;
  time: (frame: number) => number;
  cam: readonly CamKey[];
  start?: Cam;
  phone?: { time: string };
  opacity?: (frame: number) => number;
  overlay?: (s: ShotState) => React.ReactNode;
}> = ({ take: id, time, cam: keys, start, phone, opacity, overlay }) => {
  const frame = useCurrentFrame();
  const device = phone ? PHONE : LAPTOP;
  const cam = sampleCam(keys, frame, start ?? (phone ? PHONE_REST : REST));
  const tf = Math.max(0, Math.min(take(id).frames - 1, Math.round(time(frame))));
  const state = { frame, cam, tf };
  const o = opacity ? opacity(frame) : 1;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ perspective: 2600, perspectiveOrigin: `${cam.sx}px ${cam.sy}px`, opacity: o }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: device.w,
            height: device.h,
            transformOrigin: '0 0',
            transform: `translate(${cam.sx}px, ${cam.sy}px) rotateY(${cam.ry}deg) rotateX(${cam.rx}deg) scale(${cam.z}) translate(${-cam.cx}px, ${-cam.cy}px)`,
          }}
        >
          {phone ? (
            <Phone time={phone.time}>
              <Freeze frame={tf}>
                <OffthreadVideo src={staticFile(`captures/${id}.mp4`)} muted style={{ width: device.appW, height: device.appH, display: 'block' }} />
              </Freeze>
              <Touch take={id} tf={tf} />
            </Phone>
          ) : (
            <Window>
              <Freeze frame={tf}>
                <OffthreadVideo src={staticFile(`captures/${id}.mp4`)} muted style={{ width: APP_W, height: APP_H, display: 'block' }} />
              </Freeze>
              <Cursor take={id} tf={tf} />
            </Window>
          )}
        </div>
      </AbsoluteFill>
      {o > 0.01 ? overlay?.(state) : null}
    </AbsoluteFill>
  );
};
