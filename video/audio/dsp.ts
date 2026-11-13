import { writeFileSync } from "node:fs";

export const SR = 48000;

export interface Stereo {
  L: Float32Array;
  R: Float32Array;
}

export const stereo = (n: number): Stereo => ({ L: new Float32Array(n), R: new Float32Array(n) });

export const mtof = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function panGains(pos: number): [number, number] {
  const a = ((pos + 1) * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
}

export interface Send {
  dry: Stereo;
  wet: Stereo;
  pan: number;
  send: number;
}

export interface Partial {
  freq: number;
  amp: number;
  t60: number;
}

// One exponentially decaying sinusoid, rendered as a rotating phasor so long notes cost a few flops per sample.
// The note rings at `t60` for `hold` seconds, then a damper takes it down at `releaseT60`.
export function addDecaying(
  out: Send,
  startSec: number,
  p: Partial,
  attackSec: number,
  holdSec: number,
  releaseT60: number,
): void {
  if (p.freq <= 0 || p.freq >= SR * 0.45 || p.amp <= 0) return;
  const w = (2 * Math.PI * p.freq) / SR;
  const c = Math.cos(w);
  const s = Math.sin(w);
  const d1 = 10 ** (-3 / (p.t60 * SR));
  const d2 = 10 ** (-3 / (Math.min(p.t60, releaseT60) * SR));
  const atk = Math.max(1, Math.round(attackSec * SR));
  const hold = Math.round(holdSec * SR);
  const [pl, pr] = panGains(out.pan);
  const wl = pl * out.send, wr = pr * out.send;
  const N = out.dry.L.length;
  const start = Math.round(startSec * SR);
  let re = 0;
  let im = p.amp;
  let mag = p.amp;
  for (let n = 0, i = start; i < N; n++, i++) {
    const d = n < hold ? d1 : d2;
    const nr = d * (re * c - im * s);
    im = d * (re * s + im * c);
    re = nr;
    mag *= d;
    if (mag < 1e-6) break;
    let v = re;
    if (n < atk) v *= 0.5 - 0.5 * Math.cos((Math.PI * n) / atk);
    if (i < 0) continue;
    out.dry.L[i] += v * pl;
    out.dry.R[i] += v * pr;
    out.wet.L[i] += v * wl;
    out.wet.R[i] += v * wr;
  }
}

// A sustained sinusoid with raised-cosine attack and release and a slow breathing LFO, for pads.
export function addSustained(
  out: Send,
  startSec: number,
  lenSec: number,
  freq: number,
  amp: number,
  attackSec: number,
  releaseSec: number,
  lfoHz: number,
  lfoPhase: number,
): void {
  if (freq >= SR * 0.45 || amp <= 0) return;
  const w = (2 * Math.PI * freq) / SR;
  const c = Math.cos(w);
  const s = Math.sin(w);
  const start = Math.round(startSec * SR);
  const len = Math.round(lenSec * SR);
  const atk = Math.max(1, Math.round(attackSec * SR));
  const rel = Math.max(1, Math.round(releaseSec * SR));
  const [pl, pr] = panGains(out.pan);
  const N = out.dry.L.length;
  const lw = (2 * Math.PI * lfoHz) / SR;
  let re = Math.cos(lfoPhase * 7.1);
  let im = Math.sin(lfoPhase * 7.1);
  for (let n = 0, i = start; n < len && i < N; n++, i++) {
    const nr = re * c - im * s;
    im = re * s + im * c;
    re = nr;
    if (i < 0) continue;
    let env = 1;
    if (n < atk) env = 0.5 - 0.5 * Math.cos((Math.PI * n) / atk);
    const r = len - n;
    if (r < rel) env *= 0.5 - 0.5 * Math.cos((Math.PI * r) / rel);
    env *= 1 + 0.15 * Math.sin(lw * n + lfoPhase);
    const v = re * amp * env;
    out.dry.L[i] += v * pl;
    out.dry.R[i] += v * pr;
    out.wet.L[i] += v * pl * out.send;
    out.wet.R[i] += v * pr * out.send;
  }
}

export interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

export type FilterKind = "lowpass" | "highpass" | "bandpass" | "peak" | "highshelf" | "lowshelf";

export function biquad(kind: FilterKind, f0: number, q: number, gainDb = 0): Biquad {
  const A = 10 ** (gainDb / 40);
  const w = (2 * Math.PI * f0) / SR;
  const cw = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  switch (kind) {
    case "lowpass":
      [b0, b1, b2] = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2];
      [a0, a1, a2] = [1 + alpha, -2 * cw, 1 - alpha];
      break;
    case "highpass":
      [b0, b1, b2] = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2];
      [a0, a1, a2] = [1 + alpha, -2 * cw, 1 - alpha];
      break;
    case "bandpass":
      [b0, b1, b2] = [alpha, 0, -alpha];
      [a0, a1, a2] = [1 + alpha, -2 * cw, 1 - alpha];
      break;
    case "peak":
      [b0, b1, b2] = [1 + alpha * A, -2 * cw, 1 - alpha * A];
      [a0, a1, a2] = [1 + alpha / A, -2 * cw, 1 - alpha / A];
      break;
    case "highshelf":
    case "lowshelf": {
      const sq = 2 * Math.sqrt(A) * alpha;
      const sgn = kind === "highshelf" ? 1 : -1;
      b0 = A * (A + 1 + sgn * (A - 1) * cw + sq);
      b1 = -2 * sgn * A * (A - 1 + sgn * (A + 1) * cw);
      b2 = A * (A + 1 + sgn * (A - 1) * cw - sq);
      a0 = A + 1 - sgn * (A - 1) * cw + sq;
      a1 = 2 * sgn * (A - 1 - sgn * (A + 1) * cw);
      a2 = A + 1 - sgn * (A - 1) * cw - sq;
      break;
    }
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

export function filter(x: Float32Array, f: Biquad): void {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const x0 = x[i];
    const y0 = f.b0 * x0 + f.b1 * x1 + f.b2 * x2 - f.a1 * y1 - f.a2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    x[i] = y0;
  }
}

export function filterStereo(b: Stereo, ...fs: Biquad[]): void {
  for (const f of fs) {
    filter(b.L, f);
    filter(b.R, f);
  }
}

// Freeverb topology (parallel damped combs, serial allpasses), tuned long and dark.
export function reverb(input: Stereo, feedback: number, damp: number, predelaySec: number): Stereo {
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const aps = [556, 441, 341, 225];
  const spread = 23;
  const N = input.L.length;
  const out = stereo(N);
  const pre = Math.round(predelaySec * SR);
  for (const [chan, off] of [["L", 0], ["R", spread]] as const) {
    const dst = out[chan];
    const acc = new Float32Array(N);
    for (const len0 of combs) {
      const len = Math.round((len0 + off) * scale);
      const buf = new Float32Array(len);
      let idx = 0;
      let store = 0;
      for (let i = 0; i < N; i++) {
        const j = i - pre;
        const x = j >= 0 ? (input.L[j] + input.R[j]) * 0.5 * 0.03 : 0;
        const y = buf[idx];
        store = y * (1 - damp) + store * damp;
        buf[idx] = x + store * feedback;
        if (++idx >= len) idx = 0;
        acc[i] += y;
      }
    }
    for (const len0 of aps) {
      const len = Math.round((len0 + off) * scale);
      const buf = new Float32Array(len);
      let idx = 0;
      for (let i = 0; i < N; i++) {
        const b = buf[idx];
        const x = acc[i];
        acc[i] = b - x;
        buf[idx] = x + b * 0.5;
        if (++idx >= len) idx = 0;
      }
    }
    dst.set(acc);
  }
  // Freeverb's width mix, slightly narrowed.
  const w1 = 0.85, w2 = 0.15;
  for (let i = 0; i < N; i++) {
    const l = out.L[i], r = out.R[i];
    out.L[i] = l * w1 + r * w2;
    out.R[i] = r * w1 + l * w2;
  }
  return out;
}

// ITU-R BS.1770-4 integrated loudness with the absolute and relative gates.
export function integratedLufs(b: Stereo): number {
  const k1: Biquad = { b0: 1.53512485958697, b1: -2.69169618940638, b2: 1.19839281085285, a1: -1.69065929318241, a2: 0.73248077421585 };
  const k2: Biquad = { b0: 1, b1: -2, b2: 1, a1: -1.99004745483398, a2: 0.99007225036621 };
  const L = Float32Array.from(b.L);
  const R = Float32Array.from(b.R);
  for (const x of [L, R]) {
    filter(x, k1);
    filter(x, k2);
  }
  const block = Math.round(0.4 * SR);
  const step = Math.round(0.1 * SR);
  const z: number[] = [];
  for (let s = 0; s + block <= L.length; s += step) {
    let acc = 0;
    for (let i = s; i < s + block; i++) acc += L[i] * L[i] + R[i] * R[i];
    z.push(acc / block);
  }
  const lk = (ms: number) => -0.691 + 10 * Math.log10(ms);
  const abs = z.filter((m) => lk(m) > -70);
  if (abs.length === 0) return -Infinity;
  const relGate = lk(abs.reduce((a, m) => a + m, 0) / abs.length) - 10;
  const rel = abs.filter((m) => lk(m) > relGate);
  return lk(rel.reduce((a, m) => a + m, 0) / rel.length);
}

// 4x oversampled peak via windowed-sinc interpolation.
export function truePeakDb(b: Stereo): number {
  const taps = 8;
  const phases = [0.25, 0.5, 0.75].map((p) => {
    const h: number[] = [];
    for (let j = -taps + 1; j <= taps; j++) {
      const t = j - p;
      const sinc = Math.sin(Math.PI * t) / (Math.PI * t);
      const win = 0.5 + 0.5 * Math.cos((Math.PI * t) / taps);
      h.push(sinc * win);
    }
    return h;
  });
  let peak = 0;
  for (const x of [b.L, b.R]) {
    for (let n = 0; n < x.length; n++) {
      const a = Math.abs(x[n]);
      if (a > peak) peak = a;
      if (n < taps || n + taps >= x.length) continue;
      for (const h of phases) {
        let y = 0;
        for (let k = 0; k < h.length; k++) y += x[n - taps + 1 + k] * h[k];
        const ay = Math.abs(y);
        if (ay > peak) peak = ay;
      }
    }
  }
  return 20 * Math.log10(peak);
}

export function samplePeak(b: Stereo): number {
  let p = 0;
  for (const x of [b.L, b.R]) for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
  return p;
}

export function gain(b: Stereo, g: number): void {
  for (const x of [b.L, b.R]) for (let i = 0; i < x.length; i++) x[i] *= g;
}

export function writeWav24(path: string, b: Stereo): void {
  const n = b.L.length;
  const data = n * 2 * 3;
  const buf = Buffer.alloc(44 + data);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + data, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 6, 28);
  buf.writeUInt16LE(6, 32);
  buf.writeUInt16LE(24, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(data, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (const x of [b.L, b.R]) {
      const v = Math.max(-8388608, Math.min(8388607, Math.round(x[i] * 8388607)));
      buf.writeIntLE(v, o, 3);
      o += 3;
    }
  }
  writeFileSync(path, buf);
}

// A short band-limited noise burst (felt on string, fingertip on wood): raised-cosine attack, exponential decay.
export function addNoiseBurst(out: Send, startSec: number, amp: number, attackSec: number, decaySec: number, band: Biquad[], rand: () => number): void {
  const atk = Math.max(1, Math.round(attackSec * SR));
  const len = atk + Math.round(decaySec * 7 * SR);
  const x = new Float32Array(len);
  const d = Math.exp(-1 / (decaySec * SR));
  let e = 1;
  for (let n = 0; n < len; n++) {
    const env = n < atk ? 0.5 - 0.5 * Math.cos((Math.PI * n) / atk) : (e *= d);
    x[n] = (rand() * 2 - 1) * env * amp;
  }
  for (const f of band) filter(x, f);
  const [pl, pr] = panGains(out.pan);
  const start = Math.round(startSec * SR);
  for (let n = 0, i = start; n < len && i < out.dry.L.length; n++, i++) {
    if (i < 0) continue;
    out.dry.L[i] += x[n] * pl;
    out.dry.R[i] += x[n] * pr;
    out.wet.L[i] += x[n] * pl * out.send;
    out.wet.R[i] += x[n] * pr * out.send;
  }
}
