import { SR, addDecaying, biquad, filter, filterStereo, mtof, mulberry32, panGains, reverb, stereo, type Send, type Stereo } from "./dsp.ts";

const buffer = (sec: number): { b: Stereo; dry: Send } => {
  const b = stereo(Math.round(sec * SR));
  return { b, dry: { dry: b, wet: stereo(b.L.length), pan: 0, send: 0 } };
};

function fadeTail(b: Stereo, sec: number): void {
  const n = b.L.length;
  const f = Math.round(sec * SR);
  for (let i = n - f; i < n; i++) {
    const g = 0.5 + 0.5 * Math.cos((Math.PI * (i - (n - f))) / f);
    b.L[i] *= g;
    b.R[i] *= g;
  }
}

// A felt-tipped tap on a small wooden block: a low body thump plus a few short wood modes, softened attack.
export function tap(): Stereo {
  const { b, dry } = buffer(0.12);
  const modes: [number, number, number][] = [
    [190, 0.7, 0.07],
    [640, 1.0, 0.06],
    [1480, 0.35, 0.035],
    [2750, 0.08, 0.02],
  ];
  for (const [f, a, t60] of modes) addDecaying(dry, 0.001, { freq: f, amp: a, t60 }, 0.0035, 1, t60);
  filterStereo(b, biquad("lowpass", 3500, 0.7));
  fadeTail(b, 0.03);
  return b;
}

// Lighter and shorter than the tap: a fingertip on thin wood, no body.
export function tick(): Stereo {
  const { b, dry } = buffer(0.07);
  const modes: [number, number, number][] = [
    [760, 1.0, 0.025],
    [1830, 0.35, 0.015],
    [330, 0.25, 0.03],
  ];
  for (const [f, a, t60] of modes) addDecaying(dry, 0.001, { freq: f, amp: a, t60 }, 0.003, 1, t60);
  filterStereo(b, biquad("lowpass", 3500, 0.7));
  fadeTail(b, 0.02);
  return b;
}

// Two soft mallet notes, A4 rising to D5 (dominant to tonic of D major), in a small room.
export function chime(): Stereo {
  const len = 1.6;
  const b = stereo(Math.round(len * SR));
  const wet = stereo(b.L.length);
  const out: Send = { dry: b, wet, pan: 0, send: 0.5 };
  const note = (t: number, midi: number, vel: number, pan: number) => {
    const f0 = mtof(midi);
    out.pan = pan;
    addDecaying(out, t, { freq: f0, amp: vel, t60: 1.8 }, 0.008, 10, 1.8);
    addDecaying(out, t, { freq: 2 * f0, amp: vel * 0.05, t60: 0.7 }, 0.008, 10, 0.7);
    addDecaying(out, t, { freq: 4 * f0, amp: vel * 0.08, t60: 0.35 }, 0.008, 10, 0.35);
  };
  note(0.005, 69, 0.8, -0.15);
  note(0.2, 74, 1.0, 0.15);
  const verb = reverb(wet, 0.8, 0.5, 0.012);
  for (let i = 0; i < b.L.length; i++) {
    b.L[i] += verb.L[i] * 0.8;
    b.R[i] += verb.R[i] * 0.8;
  }
  filterStereo(b, biquad("highpass", 120, 0.7), biquad("highshelf", 5000, 0.7, -4));
  fadeTail(b, 0.35);
  return b;
}

// Pink noise through a resonant band-pass that sweeps up and back down as the air passes left to right.
export function whoosh(): Stereo {
  const len = 0.55;
  const N = Math.round(len * SR);
  const b = stereo(N);
  const rand = mulberry32(7);
  let b0 = 0, b1 = 0, b2 = 0;
  const pink = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const w = rand() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    pink[i] = b0 + b1 + b2 + w * 0.1848;
  }
  const apex = 0.24;
  const y = new Float32Array(N);
  let s1 = 0, s2 = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const shape = t < apex ? Math.sin((Math.PI / 2) * (t / apex)) ** 2 : Math.cos((Math.PI / 2) * ((t - apex) / (len - apex))) ** 2;
    const fc = 260 + 520 * shape;
    const g = Math.tan((Math.PI * fc) / SR);
    const k = 1 / 0.9;
    const a1 = 1 / (1 + g * (g + k));
    const v1 = a1 * (s1 * 1 + g * (pink[i] - s2));
    const v2 = s2 + g * v1;
    s1 = 2 * v1 - s1;
    s2 = 2 * v2 - s2;
    y[i] = v1 * k * shape;
  }
  filter(y, biquad("lowpass", 2500, 0.7));
  for (let i = 0; i < N; i++) {
    const [l, r] = panGains(-0.35 + 0.7 * (i / N));
    b.L[i] = y[i] * l;
    b.R[i] = y[i] * r;
  }
  fadeTail(b, 0.05);
  return b;
}
