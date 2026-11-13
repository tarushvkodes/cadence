import {
  SR,
  addDecaying,
  addNoiseBurst,
  addSustained,
  biquad,
  filterStereo,
  mtof,
  mulberry32,
  reverb,
  stereo,
  type Send,
  type Stereo,
} from "./dsp.ts";

export interface Section {
  id: string;
  start: number;
}

export interface Cues {
  fps: number;
  durationSec: number;
  sections: Section[];
}

// Pitch classes are semitones above D (D=0, E=2, F#=4, G=5, A=7, B=9, C#=11).
interface Chord {
  name: string;
  bass: number;
  tones: number[];
}

const CHORDS = {
  I: { name: "Dmaj9", bass: 0, tones: [0, 4, 7, 11, 2] },
  I3: { name: "D/F#", bass: 4, tones: [0, 4, 7, 2] },
  ii: { name: "Em9", bass: 2, tones: [2, 5, 9, 0, 4] },
  iii: { name: "F#m7", bass: 4, tones: [4, 7, 11, 2] },
  IV: { name: "Gmaj9", bass: 5, tones: [5, 9, 0, 4, 7] },
  V: { name: "A(add9)", bass: 7, tones: [7, 11, 2, 9] },
  Vsus: { name: "Asus4", bass: 7, tones: [7, 0, 2, 9] },
  vi: { name: "Bm11", bass: 9, tones: [9, 0, 4, 7, 2] },
  Iend: { name: "Dadd9", bass: 0, tones: [0, 4, 7, 2] },
} satisfies Record<string, Chord>;
type ChordKey = keyof typeof CHORDS;

const SUBSTITUTE: Record<ChordKey, ChordKey> = { I: "I3", I3: "I", ii: "IV", iii: "vi", IV: "ii", V: "Vsus", Vsus: "V", vi: "iii", Iend: "I" };

const PROGS: Record<string, ChordKey[]> = {
  A: ["I", "vi", "IV", "Vsus"],
  B: ["IV", "I3", "ii", "Vsus"],
  C: ["vi", "IV", "I", "V"],
  E: ["vi", "iii", "IV", "I"],
  F: ["I", "IV", "vi", "Vsus"],
  G: ["ii", "IV", "I3", "Vsus"],
};

// Texture per section: levels 0..1 for each voice, piano density, and the progressions it cycles through.
interface Texture {
  pad: number;
  bass: number;
  piano: number;
  mallet: number;
  progs: string[];
}

const TEXTURES: Record<string, Texture> = {
  title: { pad: 1.0, bass: 0.5, piano: 0.3, mallet: 0, progs: ["A"] },
  idea: { pad: 0.85, bass: 0.8, piano: 0.55, mallet: 0, progs: ["A", "F"] },
  setup: { pad: 0.7, bass: 0.9, piano: 0.75, mallet: 0, progs: ["B", "A"] },
  today: { pad: 0.7, bass: 0.9, piano: 0.75, mallet: 0.8, progs: ["F", "B"] },
  guide: { pad: 0.8, bass: 0.9, piano: 0.65, mallet: 0, progs: ["C", "A", "G", "F"] },
  decide: { pad: 0.6, bass: 0.85, piano: 0.85, mallet: 0.8, progs: ["B", "F"] },
  rough: { pad: 1.0, bass: 0.55, piano: 0.35, mallet: 0, progs: ["E", "C"] },
  safety: { pad: 0.9, bass: 0.8, piano: 0.55, mallet: 0, progs: ["F", "A"] },
  inside: { pad: 0.7, bass: 0.9, piano: 0.75, mallet: 0.8, progs: ["A", "G"] },
};
const FALLBACK: Texture[] = [
  { pad: 0.8, bass: 0.8, piano: 0.6, mallet: 0, progs: ["A", "F"] },
  { pad: 0.7, bass: 0.9, piano: 0.75, mallet: 0.7, progs: ["B", "C"] },
];

const textureFor = (s: Section, index: number): Texture =>
  TEXTURES[s.id] ?? FALLBACK[index % FALLBACK.length];

interface Bar {
  t: number;
  chord: Chord;
  tex: Texture;
  section: number;
}

interface Plan {
  bpm: number;
  barSec: number;
  endSec: number;
  bars: Bar[];
}

// Fit a whole number of 4/4 bars between 0 and the end section, so the resolving chord lands on it exactly.
export function plan(cues: Cues): Plan {
  const sections = [...cues.sections].sort((a, b) => a.start - b.start);
  const endIdx = sections.findIndex((s) => s.id === "end");
  const endSec = endIdx >= 0 ? sections[endIdx].start : sections.length > 1 ? sections[sections.length - 1].start : cues.durationSec * 0.94;
  let n = Math.max(2, Math.round(endSec / (240 / 72)));
  while (n > 2 && (n * 240) / endSec > 80) n--;
  while ((n * 240) / endSec < 66) n++;
  const bpm = (n * 240) / endSec;
  const barSec = 240 / bpm;
  const bars: Bar[] = [];
  const keys: ChordKey[] = [];
  let section = -1;
  let k = 0;
  for (let i = 0; i < n; i++) {
    const t = i * barSec;
    const mid = t + barSec / 2;
    let s = 0;
    for (let j = 0; j < sections.length; j++) if (sections[j].start <= mid) s = j;
    if (s !== section) {
      section = s;
      k = 0;
    }
    const tex = textureFor(sections[s], s);
    const progs = tex.progs.map((p) => PROGS[p]);
    const prog = progs[Math.floor(k / 4) % progs.length];
    keys.push(i === 0 ? "I" : i === n - 2 ? "IV" : i === n - 1 ? "V" : prog[k % 4]);
    bars.push({ t, chord: CHORDS.I, tex, section: s });
    k++;
  }
  // A section boundary can restart a progression on the chord just played; swap one of the pair for a relative.
  for (let i = 1; i < n; i++) {
    if (keys[i] !== keys[i - 1]) continue;
    const j = i >= n - 2 ? i - 1 : i;
    keys[j] = SUBSTITUTE[keys[j]];
  }
  keys.forEach((key, i) => (bars[i].chord = CHORDS[key]));
  return { bpm, barSec, endSec, bars };
}

const pc = (m: number) => (((m - 2) % 12) + 12) % 12;

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

// Pick the pad's four pitch classes, then place them so each voice moves as little as possible.
function voiceLead(prev: number[], chord: Chord, rand: () => number): number[] {
  let pcs = chord.tones.filter((t) => t !== chord.bass || chord.tones.length <= 4).slice(0, 4);
  if (pcs.length > 3 && rand() < 0.3) pcs = [...pcs.slice(0, 2), ...pcs.slice(3)];
  let best: number[] = [];
  let cost = Infinity;
  for (const perm of permutations(pcs)) {
    const voices = perm.map((p, v) => {
      const target = prev[v] ?? 54 + v * 5;
      let m = 2 + p + 12 * Math.round((target - 2 - p) / 12);
      while (m < 50) m += 12;
      while (m > 71) m -= 12;
      return m;
    });
    const c = voices.reduce((a, m, v) => a + Math.abs(m - (prev[v] ?? 54 + v * 5)), 0) + (new Set(voices).size < voices.length ? 99 : 0);
    if (c < cost) {
      cost = c;
      best = voices;
    }
  }
  return best;
}

const RH_TEMPLATES: number[][] = [[2], [1.5], [2.5], [1.5, 3], [1, 2.5], [2, 3.5], [0.5, 2, 3], [1, 2.5, 3.5], [1.5, 2.5, 3.5], [0.5, 1.5, 3]];

interface Voices {
  piano: Send;
  mallet: Send;
  pad: Send;
}

const FELT = [biquad("highpass", 900, 0.6), biquad("lowpass", 7000, 0.6)];
const noise = mulberry32(31);

function pianoNote(out: Send, t: number, midi: number, vel: number, hold: number): void {
  const f0 = mtof(midi);
  const B = 0.0003;
  const fc = 1400 + 2600 * vel;
  const T0 = Math.min(9, Math.max(1.6, 9 * 2 ** (-(midi - 40) / 16)));
  const amp = 0.22 * vel ** 1.4;
  const attack = 0.01 + 0.012 * (1 - vel);
  out.pan = Math.max(-0.45, Math.min(0.45, (midi - 62) / 40));
  addNoiseBurst(out, t, amp * 0.05, 0.003, 0.012, FELT, noise);
  for (let n = 1; n <= 24; n++) {
    const f = n * f0 * Math.sqrt(1 + B * n * n);
    if (f > 10000) break;
    // The hammer strikes near 1/8 of the string, which notches the partials near multiples of 8.
    const strike = 0.25 + 0.75 * Math.abs(Math.sin(Math.PI * n * 0.122));
    const a = (amp * strike * (0.8 + 0.4 * noise())) / n ** 1.1 / Math.sqrt(1 + (f / fc) ** 4);
    const t60 = T0 / (1 + 0.55 * (n - 1));
    // Unison strings drift apart: a prompt sound that dies fast and a slower aftersound, detuned against each other.
    const det = 2 ** ((0.6 + 0.3 * Math.sin(n * 1.7)) / 1200);
    addDecaying(out, t, { freq: f * det, amp: a * 0.65, t60: t60 * 0.35 }, attack, hold, 0.45);
    addDecaying(out, t, { freq: f / det, amp: a * 0.35, t60: t60 * 1.3 }, attack, hold, 0.45);
  }
}

function malletNote(out: Send, t: number, midi: number, vel: number): void {
  const f0 = mtof(midi);
  const amp = 0.045 * vel;
  out.pan = (midi - 74) / 30;
  addDecaying(out, t, { freq: f0, amp, t60: 2.6 }, 0.012, 10, 2.6);
  addDecaying(out, t, { freq: 2 * f0, amp: amp * 0.04, t60: 0.9 }, 0.012, 10, 0.9);
  addDecaying(out, t, { freq: 4 * f0, amp: amp * 0.03, t60: 0.45 }, 0.012, 10, 0.45);
}

function padNote(out: Send, t: number, len: number, midi: number, level: number, seed: number): void {
  const f0 = mtof(midi);
  const det = 2 ** (5 / 1200);
  for (let h = 1; h <= 7; h++) {
    const f = h * f0;
    const a = (0.011 * level) / h ** 1.5 / (1 + (f / 1400) ** 2);
    for (const [d, p] of [[det, -0.5], [1 / det, 0.5]] as const) {
      out.pan = p;
      addSustained(out, t, len, f * d, a, 1.4, 2.2, 0.06 + 0.02 * ((seed * 7 + h) % 3), seed + h * 1.3 + p);
    }
  }
}

function score(p: Plan, cues: Cues, v: Voices): void {
  const rand = mulberry32(110);
  const beat = p.barSec / 4;
  let pad: number[] = [];
  let rh = 66;
  const padRuns: { midi: number; start: number; end: number; level: number }[][] = [[], [], [], []];

  p.bars.forEach((bar, i) => {
    const { chord, tex, t } = bar;
    const final = i === p.bars.length - 1;
    const humanize = () => (rand() - 0.5) * 0.03;

    pad = voiceLead(pad, chord, rand);
    pad.forEach((m, vi) => {
      const runs = padRuns[vi];
      const last = runs[runs.length - 1];
      if (last && last.midi === m && last.level === tex.pad && last.end >= t - 1e-6) last.end = t + p.barSec;
      else runs.push({ midi: m, start: t, end: t + p.barSec, level: tex.pad });
    });

    const lh = 38 + chord.bass;
    if (tex.bass > 0) pianoNote(v.piano, t + humanize(), lh, 0.26 + 0.12 * tex.bass + rand() * 0.04, p.barSec);
    if (i > 0 && tex.piano >= 0.5 && rand() < 0.6) {
      const upper = lh + (rand() < 0.5 ? 7 : 12);
      pianoNote(v.piano, t + beat * (rand() < 0.5 ? 1 : 0.5) + humanize(), upper, 0.26 + rand() * 0.06, p.barSec);
    }

    const pool = RH_TEMPLATES.filter((tp) => (tex.piano < 0.5 ? tp.length === 1 : tex.piano < 0.7 ? tp.length <= 2 : tp.length >= 2));
    const tmpl = i === 0 ? [2] : final ? [1.5, 2.5, 3.5] : pool[Math.floor(rand() * pool.length)];
    const cands: number[] = [];
    for (let m = 57; m <= 78; m++) if (chord.tones.includes(pc(m))) cands.push(m);
    for (const pos of tmpl) {
      const steps = cands.filter((m) => m !== rh && Math.abs(m - rh) <= 7);
      const choice = steps.length ? steps[Math.floor(rand() * steps.length)] : cands.reduce((a, m) => (Math.abs(m - rh) < Math.abs(a - rh) ? m : a), cands[0]);
      rh = choice;
      const hold = p.barSec - pos * beat + 0.3;
      const vel = 0.3 + rand() * 0.14 - Math.max(0, rh - 72) * 0.01;
      pianoNote(v.piano, t + pos * beat + humanize(), rh, vel, hold);
    }

    if (tex.mallet > 0 && i % 2 === 1 && rand() < 0.75) {
      const mc: number[] = [];
      for (let m = 69; m <= 81; m++) if (chord.tones.includes(pc(m)) && [0, 2, 4, 7, 9].includes(pc(m))) mc.push(m);
      const positions = rand() < 0.5 ? [2.5] : [1.5, 3];
      for (const pos of positions) malletNote(v.mallet, t + pos * beat + humanize(), mc[Math.floor(rand() * mc.length)], tex.mallet * (0.7 + rand() * 0.3));
    }
  });

  // The resolution: a slow rolled Dadd9 on the end section, left to ring out.
  const end = p.endSec;
  const tail = cues.durationSec - end;
  [38, 50, 57, 64, 66, 69, 74].forEach((m, j) => pianoNote(v.piano, end + j * 0.07, m, 0.42 - j * 0.02, tail));
  malletNote(v.mallet, end + 2 * beat, 74, 0.6);
  const endPad = voiceLead(pad, CHORDS.Iend, rand);
  endPad.forEach((m, vi) => padRuns[vi].push({ midi: m, start: end, end: end + tail * 0.8, level: 0.8 }));

  padRuns.forEach((runs, vi) => {
    for (const r of runs) {
      const len = r.end - r.start + 2.2;
      padNote(v.pad, r.start, len, r.midi, r.level, vi * 3 + Math.round(r.start));
    }
  });
}

export function renderBed(cues: Cues): { audio: Stereo; plan: Plan } {
  const N = Math.round(cues.durationSec * SR);
  const p = plan(cues);
  const dry = stereo(N);
  const wet = stereo(N);
  const send = (s: number): Send => ({ dry, wet, pan: 0, send: s });
  score(p, cues, { piano: send(0.4), mallet: send(0.55), pad: send(0.3) });

  const verb = reverb(wet, 0.88, 0.45, 0.025);
  const mix = stereo(N);
  for (let i = 0; i < N; i++) {
    mix.L[i] = dry.L[i] + verb.L[i] * 0.9;
    mix.R[i] = dry.R[i] + verb.R[i] * 0.9;
  }
  filterStereo(
    mix,
    biquad("highpass", 32, 0.7),
    biquad("lowshelf", 160, 0.7, -2),
    biquad("peak", 2600, 0.8, -2),
    biquad("highshelf", 9000, 0.7, -2),
    biquad("lowpass", 15000, 0.7),
  );

  const fadeIn = Math.round(2 * SR);
  const outStart = Math.round((p.endSec + 0.8 * (cues.durationSec - p.endSec)) * SR);
  for (let i = 0; i < N; i++) {
    let g = 1;
    if (i < fadeIn) g = 0.5 - 0.5 * Math.cos((Math.PI * i) / fadeIn);
    if (i >= outStart) g *= 0.5 + 0.5 * Math.cos((Math.PI * (i - outStart)) / (N - outStart));
    mix.L[i] *= g;
    mix.R[i] *= g;
  }
  return { audio: mix, plan: p };
}
