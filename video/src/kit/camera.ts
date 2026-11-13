import { ease } from './theme.ts';
import type { Rect } from './takes.ts';

/** Height of the window's title bar, in app pixels. The app itself is 1440 x 900 below it. */
export const BAR = 38;
export const APP_W = 1440;
export const APP_H = 900;
export const WIN_H = APP_H + BAR;

/**
 * A device the app is shown in: its outer size in app pixels, and where the app's viewport starts
 * inside it. The laptop is a browser window; the phone is a handset with a status row on top.
 */
export type Device = { readonly w: number; readonly h: number; readonly ox: number; readonly oy: number; readonly appW: number; readonly appH: number };
export const LAPTOP: Device = { w: APP_W, h: WIN_H, ox: 0, oy: BAR, appW: APP_W, appH: APP_H };
export const PHONE_BEZEL = 13;
export const PHONE_TOP = 48;
export const PHONE_BOTTOM = 20;
export const PHONE: Device = {
  w: 390 + 2 * PHONE_BEZEL,
  h: 844 + PHONE_TOP + PHONE_BOTTOM + 2 * PHONE_BEZEL,
  ox: PHONE_BEZEL,
  oy: PHONE_BEZEL + PHONE_TOP,
  appW: 390,
  appH: 844,
};

/**
 * Where the camera looks: the window point (cx, cy) appears at screen point (sx, sy), scaled by z,
 * with an optional turn of the window in depth (ry, rx in degrees).
 */
export type Cam = { cx: number; cy: number; z: number; sx: number; sy: number; ry: number; rx: number; ox: number; oy: number };
export type CamKey = { at: number; to: Partial<Cam>; dur?: number; curve?: (t: number) => number };

export const REST: Cam = { cx: APP_W / 2, cy: WIN_H / 2, z: 0.9, sx: 960, sy: 508, ry: 0, rx: 0, ox: LAPTOP.ox, oy: LAPTOP.oy };

/** The window waiting on the right, turned toward the step title. */
export const ASIDE: Cam = { cx: APP_W / 2, cy: WIN_H / 2, z: 0.6, sx: 1395, sy: 540, ry: -16, rx: 2, ox: LAPTOP.ox, oy: LAPTOP.oy };

/** The phone, whole, a little above centre so captions clear it. */
export const PHONE_REST: Cam = { cx: PHONE.w / 2, cy: PHONE.h / 2, z: 0.95, sx: 960, sy: 506, ry: 0, rx: 0, ox: PHONE.ox, oy: PHONE.oy };

/** The phone waiting on the right of a step title, turned toward it. */
export const PHONE_ASIDE: Cam = { ...PHONE_REST, z: 0.8, sx: 1360, sy: 540, ry: -14, rx: 2 };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function mix(a: Cam, b: Cam, t: number): Cam {
  return {
    cx: lerp(a.cx, b.cx, t),
    cy: lerp(a.cy, b.cy, t),
    z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), t)),
    sx: lerp(a.sx, b.sx, t),
    sy: lerp(a.sy, b.sy, t),
    ry: lerp(a.ry, b.ry, t),
    rx: lerp(a.rx, b.rx, t),
    ox: b.ox,
    oy: b.oy,
  };
}

/** Each key starts a move from wherever the camera is, eases over `dur` frames, then holds. */
export function sampleCam(keys: readonly CamKey[], frame: number, start: Cam = REST): Cam {
  let cam = start;
  for (const k of keys) {
    if (frame < k.at) break;
    const target = { ...cam, ...k.to };
    const dur = k.dur ?? 40;
    const t = Math.min(1, (frame - k.at) / dur);
    const settled = frame >= k.at + dur;
    cam = settled ? target : mix(cam, target, (k.curve ?? ease.camera)(t));
    if (!settled) return cam;
  }
  return cam;
}

/** The screen box a focus frames its rect into, by default the frame minus room for captions. */
export type Box = { x: number; y: number; w: number; h: number };
export const FULL: Box = { x: 150, y: 110, w: 1620, h: 760 };

/** A camera that frames an app rect (viewport pixels) inside a screen box. */
export function focus(r: Rect, box: Box = FULL, maxZ = 1.9, device: Device = LAPTOP): Partial<Cam> {
  const z = Math.min(box.w / r.w, box.h / r.h, maxZ);
  return { cx: r.x + r.w / 2 + device.ox, cy: r.y + r.h / 2 + device.oy, z, sx: box.x + box.w / 2, sy: box.y + box.h / 2, ry: 0, rx: 0, ox: device.ox, oy: device.oy };
}

/** Frames an app rect on the phone, with the phone's own zoom limit (its capture is 3x). */
export const focusPhone = (r: Rect, box: Box = FULL, maxZ = 2.2) => focus(r, box, maxZ, PHONE);

/** Screen position of an app point under a camera (ignores the depth turn, which is zero when reading). */
export function project(cam: Cam, x: number, y: number) {
  return { X: cam.sx + (x + cam.ox - cam.cx) * cam.z, Y: cam.sy + (y + cam.oy - cam.cy) * cam.z };
}

export function projectRect(cam: Cam, r: Rect): Rect {
  const a = project(cam, r.x, r.y);
  return { x: a.X, y: a.Y, w: r.w * cam.z, h: r.h * cam.z };
}
