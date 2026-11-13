import guidePhone from '../data/captures/guide-phone.json';
import guidePlan from '../data/captures/guide-plan.json';
import learn from '../data/captures/learn.json';
import onboardingPhone from '../data/captures/onboarding-phone.json';
import roughPhone from '../data/captures/rough-phone.json';
import safetyPhone from '../data/captures/safety-phone.json';
import settings from '../data/captures/settings.json';
import todayPhone from '../data/captures/today-phone.json';

export type Rect = { x: number; y: number; w: number; h: number; lines?: { x: number; y: number; w: number; h: number }[] };
type Click = { frame: number; hover?: number; x: number; y: number; target: string };
type TakeData = {
  id: string;
  frames: number;
  marks: { name: string; frame: number; rects: Record<string, Rect> }[];
  clicks: Click[];
  watch?: Record<string, { frame: number; value: string }[]>;
};

const TAKES = {
  'guide-plan': guidePlan,
  learn,
  settings,
  'onboarding-phone': onboardingPhone,
  'today-phone': todayPhone,
  'guide-phone': guidePhone,
  'rough-phone': roughPhone,
  'safety-phone': safetyPhone,
} as unknown as Record<TakeId, TakeData>;
export type TakeId =
  | 'guide-plan'
  | 'learn'
  | 'settings'
  | 'onboarding-phone'
  | 'today-phone'
  | 'guide-phone'
  | 'rough-phone'
  | 'safety-phone';

export const take = (id: TakeId): TakeData => TAKES[id];

export function mark(id: TakeId, name: string) {
  const m = take(id).marks.find((x) => x.name === name);
  if (!m) throw new Error(`no mark ${name} in ${id}`);
  return m;
}

export const rect = (id: TakeId, name: string, key: string): Rect => {
  const r = mark(id, name).rects[key];
  if (!r) throw new Error(`no rect ${key} in ${id}/${name}`);
  return r;
};

export const clicks = (id: TakeId) =>
  take(id).clicks.map((c) => ({ ...c, hover: c.hover ?? c.frame - 12 }));

export function click(id: TakeId, n: number) {
  const c = clicks(id)[n];
  if (!c) throw new Error(`no click ${n} in ${id}`);
  return c;
}

/** The take frame where a watched page value first matched. */
export function when(id: TakeId, key: string, test: (value: string) => boolean): number {
  const hit = take(id).watch?.[key]?.find((w) => test(w.value));
  if (!hit) throw new Error(`watch ${key} in ${id} never matched`);
  return hit.frame;
}

/** Union of rects, for framing several elements at once. */
export function union(...rs: Rect[]): Rect {
  const x = Math.min(...rs.map((r) => r.x));
  const y = Math.min(...rs.map((r) => r.y));
  const r = Math.max(...rs.map((q) => q.x + q.w));
  const b = Math.max(...rs.map((q) => q.y + q.h));
  return { x, y, w: r - x, h: b - y };
}

export const pad = (r: Rect, px: number, py = px): Rect => ({ x: r.x - px, y: r.y - py, w: r.w + 2 * px, h: r.h + 2 * py });

/**
 * Maps film frames (relative to the shot) onto take frames. Between pairs the take plays at the rate
 * the pair implies; past the last pair it holds that frame.
 */
export function timeMap(pairs: readonly (readonly [number, number])[]) {
  return (f: number) => {
    const first = pairs[0];
    if (!first) return 0;
    if (f <= first[0]) return first[1];
    for (let i = 1; i < pairs.length; i++) {
      const [f1, t1] = pairs[i] as readonly [number, number];
      const [f0, t0] = pairs[i - 1] as readonly [number, number];
      if (f <= f1) return t0 + ((t1 - t0) * (f - f0)) / Math.max(1, f1 - f0);
    }
    return (pairs.at(-1) as readonly [number, number])[1];
  };
}

/** Several rects of one mark, typed by the keys asked for. */
export function rects<K extends string>(id: TakeId, name: string, keys: readonly K[]): Record<K, Rect> {
  return Object.fromEntries(keys.map((k) => [k, rect(id, name, k)])) as Record<K, Rect>;
}

/**
 * A time map from beats: each pair says "show take frame T at film frame F". Between beats the take
 * waits and then plays into the next beat at normal speed; a gap too long to play is fast-forwarded,
 * and one far too long is cut, with `lead` frames played into the beat.
 */
export function beatMap(beats: readonly (readonly [number, number])[], lead = 10) {
  const pairs: [number, number][] = [];
  beats.forEach(([F, T], i) => {
    const prev = beats[i - 1];
    if (!prev) {
      pairs.push([F, T]);
      return;
    }
    const [F0, T0] = prev;
    const dF = F - F0;
    const dT = T - T0;
    if (dT <= 0) pairs.push([F, T0]);
    else if (dT <= dF) pairs.push([F - dT, T0], [F, T]);
    else if (dT <= 4 * dF) pairs.push([F, T]);
    else {
      const d = Math.min(lead, dF - 1);
      pairs.push([F - d - 1, T0], [F - d, T - d], [F, T]);
    }
  });
  return timeMap(pairs);
}

/** Counts the tool steps in a watched `steps` value that match a class fragment. */
export const countSteps = (value: string, cls: string) => value.split('|').filter((s) => s.includes(cls)).length;

/** The watched value of a key at a take frame. */
export function watched(id: TakeId, key: string, tf: number): string {
  const list = take(id).watch?.[key] ?? [];
  let v = '';
  for (const w of list) {
    if (w.frame > tf) break;
    v = w.value;
  }
  return v;
}
