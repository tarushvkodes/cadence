import { Easing, interpolate, spring, type SpringConfig } from 'remotion';
import { PALETTE } from '../../../src/ui/palette.ts';

/** The app's own light palette, read from its source so the film can never drift from it. */
export const C = PALETTE.light;
export const PHASE = C.phases;

export const FONT = {
  sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, 'Helvetica Neue', Arial, sans-serif",
  serif: "ui-serif, 'New York', 'Iowan Old Style', Charter, 'Palatino Linotype', Palatino, Georgia, serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
} as const;

export const W = 1920;
export const H = 1080;

/** The app's motion curves (`--ease-out`, `--ease-in-out` in base.css) plus an exit curve. */
export const ease = {
  out: Easing.bezier(0.23, 1, 0.32, 1),
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  camera: Easing.bezier(0.7, 0, 0.2, 1),
  in: Easing.bezier(0.55, 0, 1, 0.45),
};

/** Critically damped by default (Apple's house style); entrances settle without a bounce. */
export const SETTLE: Partial<SpringConfig> = { mass: 1, stiffness: 170, damping: 26 };
export const SOFT: Partial<SpringConfig> = { mass: 1, stiffness: 110, damping: 22 };

export const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const rise = (frame: number, at: number, fps: number, config: Partial<SpringConfig> = SETTLE) =>
  spring({ frame: frame - at, fps, config });

/** 0 to 1 over `dur` frames from `at`, with an easing. */
export const tween = (frame: number, at: number, dur: number, curve = ease.inOut) =>
  interpolate(frame, [at, at + dur], [0, 1], { ...CLAMP, easing: curve });

/** Fade in with a spring, then out with an accelerating exit. */
export function presence(frame: number, fps: number, from: number, until: number, exit = 9) {
  const inP = rise(frame, from, fps);
  const outP = tween(frame, until - exit, exit, ease.in);
  return Math.min(inP, 1 - outP);
}

export const SHADOW = {
  card: '0 1px 1px rgba(40, 30, 20, 0.04), 0 2px 4px rgba(40, 30, 20, 0.04), 0 12px 32px -12px rgba(40, 30, 20, 0.14)',
  lift: '0 2px 4px rgba(40, 30, 20, 0.06), 0 18px 44px -16px rgba(40, 30, 20, 0.24)',
  window: '0 1px 2px rgba(40, 30, 20, 0.10), 0 10px 24px -8px rgba(40, 30, 20, 0.16), 0 40px 90px -30px rgba(40, 30, 20, 0.34)',
} as const;
