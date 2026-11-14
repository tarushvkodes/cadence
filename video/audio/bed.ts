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

// Pitch classes are semitones above D (D=0, E=2, F#=4, G=5, A=7, B=9, C=10, C#=11).
interface Chord {
  name: string;
  bass: number;
  tones: number[];
}

const CHORDS = {
  I: { name: "D", bass: 0, tones: [0, 4, 7] },
  I3: { name: "D/F#", bass: 4, tones: [0, 4, 7] },
  IV: { name: "G", bass: 5, tones: [5, 9, 0] },
  V: { name: "A", bass: 7, tones: [7, 11, 2] },
  Vsus: { name: "Asus4", bass: 7, tones: [7, 0, 2] },
  ii: { name: "Em7", bass: 2, tones: [2, 5, 9, 0] },
  bVII: { name: "C", bass: 10, tones: [10, 2, 5] },
} satisfies Record<string, Chord>;
type ChordKey = keyof typeof CHORDS;

// Major chords throughout; the one minor chord stands in when a section boundary would repeat IV.
const SUBSTITUTE: Record<ChordKey, ChordKey> = { I: "I3", I3: "I", IV: "ii", V: "Vsus", Vsus: "V", ii: "IV", bVII: "IV" };

const PROGS: Record<string, ChordKey[]> = {
  home: ["I", "IV", "I3", "Vsus"],
  lift: ["I", "V", "IV", "I3"],
  turn: ["IV", "I3", "IV", "Vsus"],
  open: ["IV", "V", "I3", "IV"],
  warm: ["I", "bVII", "IV", "I"],
};

// Texture per section. Levels are 0..1. `keys` at 0.5 or more adds a sparse right-hand line; `pulse` sets how firmly the
// eighth-note figure is picked; `bells` is a soft mallet every other bar; `hold` is bars per chord.
interface Texture {
  pad: number;
  bass: number;
  keys: number;
  pulse: number;
  bells: number;
  progs: string[];
  hold: number;
}

const TEXTURES: Record<string, Texture> = {
  title: { pad: 0.7, bass: 0.4, keys: 0.6, pulse: 0.4, bells: 0.6, progs: ["home"], hold: 1 },
  idea: { pad: 0.6, bass: 0.6, keys: 0.6, pulse: 0.45, bells: 0, progs: ["home", "lift"], hold: 1 },
  setup: { pad: 0.5, bass: 0.7, keys: 0.5, pulse: 0.8, bells: 0, progs: ["lift", "open"], hold: 1 },
  today: { pad: 0.5, bass: 0.7, keys: 0.6, pulse: 0.8, bells: 0.6, progs: ["home", "warm"], hold: 1 },
  guide: { pad: 0.6, bass: 0.8, keys: 0.6, pulse: 0.9, bells: 0, progs: ["lift", "turn", "home", "open"], hold: 1 },
  decide: { pad: 0.5, bass: 0.7, keys: 0.7, pulse: 0.6, bells: 0.6, progs: ["open", "home"], hold: 1 },
  rough: { pad: 0.6, bass: 0.5, keys: 0.7, pulse: 0.4, bells: 0, progs: ["warm", "open"], hold: 1 },
  safety: { pad: 0.7, bass: 0.6, keys: 0.6, pulse: 0.45, bells: 0, progs: ["home", "turn"], hold: 1 },
  inside: { pad: 0.5, bass: 0.8, keys: 0.6, pulse: 0.9, bells: 0.6, progs: ["lift", "warm"], hold: 1 },
  end: { pad: 0.6, bass: 0.5, keys: 0.7, pulse: 0.4, bells: 0.5, progs: ["warm", "turn"], hold: 2 },
};
const FALLBACK: Texture[] = [
  { pad: 0.6, bass: 0.7, keys: 0.6, pulse: 0.6, bells: 0, progs: ["home", "lift"], hold: 1 },
  { pad: 0.5, bass: 0.7, keys: 0.6, pulse: 0.8, bells: 0.5, progs: ["open", "warm"], hold: 1 },
];

const textureFor = (s: Section, index: number): Texture => TEXTURES[s.id] ?? FALLBACK[index % FALLBACK.length];

// The resolving chord lands this long before the film ends, and rings under the end card.
const TAIL_SEC = 7;
const CADENCE: ChordKey[] = ["IV", "Vsus", "V"];

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

// Fit a whole number of 4/4 bars at 84..92 BPM before the resolution, so the last chord lands on it exactly.
export function plan(cues: Cues): Plan {
  const sections = [...cues.sections].sort((a, b) => a.start - b.start);
  const endSec = cues.durationSec - TAIL_SEC;
  let n = Math.max(CADENCE.length + 1, Math.round(endSec / (240 / 88)));
  while (n > CADENCE.length + 1 && (n * 240) / endSec > 92) n--;
  while ((n * 240) / endSec < 84) n++;
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
    const step = Math.floor(k / tex.hold);
    const prog = PROGS[tex.progs[Math.floor(step / 4) % tex.progs.length]];
    const fromEnd = n - i;
    keys.push(i === 0 ? "I" : fromEnd <= CADENCE.length ? CADENCE[CADENCE.length - fromEnd] : prog[step % 4]);
    bars.push({ t, chord: CHORDS.I, tex, section: s });
    k++;
  }
  // A section boundary can restart a progression on the chord just played; swap one of the pair for a relative.
  // A chord held on purpose for two bars stays, unless it runs into the cadence.
  const cadenceAt = n - CADENCE.length;
  for (let i = 1; i < n; i++) {
    if (keys[i] !== keys[i - 1] || (bars[i].tex.hold > 1 && i < cadenceAt)) continue;
    const j = i >= cadenceAt ? i - 1 : i;
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

// Pick the pad's pitch classes, then place them so each voice moves as little as possible.
function voiceLead(prev: number[], chord: Chord): number[] {
  const pcs = chord.tones.filter((t) => t !== chord.bass || chord.tones.length <= 3).slice(0, 3);
  let best: number[] = [];
  let cost = Infinity;
  for (const perm of permutations(pcs)) {
    const voices = perm.map((p, v) => {
      const target = prev[v] ?? 64 + v * 4;
      let m = 2 + p + 12 * Math.round((target - 2 - p) / 12);
      while (m < 60) m += 12;
      while (m > 76) m -= 12;
      return m;
    });
    const c = voices.reduce((a, m, v) => a + Math.abs(m - (prev[v] ?? 64 + v * 4)), 0) + (new Set(voices).size < voices.length ? 99 : 0);
    if (c < cost) {
      cost = c;
      best = voices;
    }
  }
  return best;
}

// Four ascending chord tones around a fixed centre, for the plucked figure.
function arpeggio(chord: Chord): number[] {
  const all: number[] = [];
  for (let m = 55; m <= 81; m++) if (chord.tones.includes(pc(m))) all.push(m);
  let best = 0;
  let cost = Infinity;
  for (let w = 0; w + 4 <= all.length; w++) {
    const c = Math.abs((all[w] + all[w + 1] + all[w + 2] + all[w + 3]) / 4 - 69);
    if (c < cost) {
      cost = c;
      best = w;
    }
  }
  return all.slice(best, best + 4);
}

// Fingerpicking orders over the four arpeggio notes, lowest first.
const PICKS: number[][] = [
  [0, 2, 1, 3, 0, 2, 1, 3],
  [0, 1, 2, 3, 0, 2, 1, 2],
  [0, 2, 3, 1, 0, 2, 3, 2],
];
const RH_TEMPLATES: number[][] = [[2], [1.5], [2.5], [1.5, 3], [1, 2.5], [2, 3.5], [0.5, 2]];

interface Voices {
  keys: Send;
  pluck: Send;
  mallet: Send;
  pad: Send;
  bass: Send;
}

const FELT = [biquad("highpass", 700, 0.6), biquad("lowpass", 4000, 0.6)];
const THUMB = [biquad("highpass", 150, 0.6), biquad("lowpass", 1600, 0.6)];
const noise = mulberry32(31);

function pianoNote(out: Send, t: number, midi: number, vel: number, hold: number): void {
  const f0 = mtof(midi);
  const B = 0.0003;
  const fc = 1000 + 1400 * vel;
  const T0 = Math.min(9, Math.max(1.6, 9 * 2 ** (-(midi - 40) / 16)));
  const amp = 0.22 * vel ** 1.4;
  const attack = 0.008 + 0.01 * (1 - vel);
  out.pan = Math.max(-0.4, Math.min(0.4, (midi - 64) / 40));
  addNoiseBurst(out, t, amp * 0.03, 0.003, 0.01, FELT, noise);
  for (let n = 1; n <= 20; n++) {
    const f = n * f0 * Math.sqrt(1 + B * n * n);
    if (f > 8000) break;
    // The hammer strikes near 1/8 of the string, which notches the partials near multiples of 8.
    const strike = 0.25 + 0.75 * Math.abs(Math.sin(Math.PI * n * 0.122));
    const a = (amp * strike * (0.8 + 0.4 * noise())) / n ** 1.2 / Math.sqrt(1 + (f / fc) ** 4);
    const t60 = T0 / (1 + 0.55 * (n - 1));
    // Unison strings drift apart: a prompt sound that dies fast and a slower aftersound, detuned against each other.
    const det = 2 ** ((0.6 + 0.3 * Math.sin(n * 1.7)) / 1200);
    addDecaying(out, t, { freq: f * det, amp: a * 0.65, t60: t60 * 0.35 }, attack, hold, 0.45);
    addDecaying(out, t, { freq: f / det, amp: a * 0.35, t60: t60 * 1.3 }, attack, hold, 0.45);
  }
}

// A nylon string plucked with the thumb a fifth of the way along it: round, short, little above 2 kHz.
function pluckNote(out: Send, t: number, midi: number, vel: number): void {
  const f0 = mtof(midi);
  const amp = 0.06 * vel;
  const T0 = Math.min(3, Math.max(1.1, 3 * 2 ** (-(midi - 52) / 18)));
  out.pan = Math.max(-0.5, Math.min(0.5, (midi - 64) / 24));
  addNoiseBurst(out, t, amp * 0.05, 0.002, 0.006, THUMB, noise);
  for (let n = 1; n <= 12; n++) {
    const f = n * f0 * Math.sqrt(1 + 0.00004 * n * n);
    if (f > 6000) break;
    const pos = 0.15 + 0.85 * Math.abs(Math.sin(Math.PI * n * 0.2));
    const a = (amp * pos * (0.85 + 0.3 * noise())) / n / Math.sqrt(1 + (f / 1100) ** 4);
    addDecaying(out, t, { freq: f, amp: a, t60: T0 / (1 + 0.8 * (n - 1)) }, 0.005, 10, T0);
  }
}

// A soft rubber mallet on a wooden bar: the fundamental and a short fourth partial, as on a marimba.
function malletNote(out: Send, t: number, midi: number, vel: number): void {
  const f0 = mtof(midi);
  const amp = 0.04 * vel;
  out.pan = (midi - 76) / 24;
  addDecaying(out, t, { freq: f0, amp, t60: 1.8 }, 0.006, 10, 1.8);
  addDecaying(out, t, { freq: 3.93 * f0, amp: amp * 0.07, t60: 0.22 }, 0.004, 10, 0.22);
}

function bassNote(out: Send, t: number, midi: number, vel: number, hold: number): void {
  const f0 = mtof(midi);
  const amp = 0.055 * vel;
  out.pan = 0;
  addDecaying(out, t, { freq: f0, amp, t60: 3.5 }, 0.015, hold, 0.35);
  addDecaying(out, t, { freq: 2 * f0, amp: amp * 0.3, t60: 1.6 }, 0.015, hold, 0.3);
  addDecaying(out, t, { freq: 3 * f0, amp: amp * 0.08, t60: 0.8 }, 0.015, hold, 0.3);
}

function padNote(out: Send, t: number, len: number, midi: number, level: number, seed: number): void {
  const f0 = mtof(midi);
  const det = 2 ** (4 / 1200);
  for (let h = 1; h <= 4; h++) {
    const f = h * f0;
    const a = (0.006 * level) / h ** 2 / (1 + (f / 900) ** 2);
    for (const [d, p] of [[det, -0.4], [1 / det, 0.4]] as const) {
      out.pan = p;
      addSustained(out, t, len, f * d, a, 0.6, 1.2, 0, seed + h * 1.3 + p);
    }
  }
}

function score(p: Plan, cues: Cues, v: Voices): void {
  const rand = mulberry32(110);
  const beat = p.barSec / 4;
  let pad: number[] = [];
  let rh = 74;
  const padRuns: { midi: number; start: number; end: number; level: number }[][] = [[], [], []];

  p.bars.forEach((bar, i) => {
    const { chord, tex } = bar;
    const t = i === 0 ? 0.02 : bar.t;
    const toEnd = p.bars.length - 1 - i;
    // The first bar is the entrance: soft picking and a quiet chord, the bass from the second bar. The cadence's
    // three bars settle a little softer each.
    const entry = i === 0 ? 0.5 : Math.min(1, 0.6 + (0.4 * toEnd) / CADENCE.length);
    const humanize = () => (rand() - 0.5) * 0.024;

    pad = voiceLead(pad, chord);
    pad.forEach((m, vi) => {
      const runs = padRuns[vi];
      const last = runs[runs.length - 1];
      if (last && last.midi === m && last.level === tex.pad && last.end >= bar.t - 1e-6) last.end = bar.t + p.barSec;
      else runs.push({ midi: m, start: bar.t, end: bar.t + p.barSec, level: tex.pad });
    });

    if (tex.bass > 0 && i > 0) {
      const root = 38 + chord.bass - (chord.bass > 7 ? 12 : 0);
      bassNote(v.bass, t + humanize(), root, entry * (0.5 + 0.3 * tex.bass), 2 * beat);
      if (tex.bass >= 0.7 && toEnd > 0 && rand() < 0.7) bassNote(v.bass, t + 2 * beat + humanize(), root + 7, entry * (0.4 + 0.2 * tex.bass), 2 * beat);
    }

    if (tex.keys > 0) {
      [...pad].sort((a, b) => a - b).forEach((m, j) => pianoNote(v.keys, t + j * 0.025 + humanize(), m, entry * (0.2 + 0.1 * tex.keys + rand() * 0.04), p.barSec));
      if (tex.keys >= 0.5 && i > 0) {
        const tmpl = RH_TEMPLATES[Math.floor(rand() * RH_TEMPLATES.length)];
        const cands: number[] = [];
        for (let m = 67; m <= 79; m++) if (chord.tones.includes(pc(m))) cands.push(m);
        for (const pos of tmpl) {
          const steps = cands.filter((m) => m !== rh && Math.abs(m - rh) <= 5);
          rh = steps.length ? steps[Math.floor(rand() * steps.length)] : cands.reduce((a, m) => (Math.abs(m - rh) < Math.abs(a - rh) ? m : a), cands[0]);
          pianoNote(v.keys, t + pos * beat + humanize(), rh, entry * (0.26 + rand() * 0.1 - Math.max(0, rh - 74) * 0.01), p.barSec - pos * beat + 0.3);
        }
      }
    }

    if (tex.pulse > 0) {
      const notes = arpeggio(chord);
      const pick = PICKS[Math.floor(rand() * PICKS.length)];
      for (let s = 0; s < 8; s += toEnd <= 1 ? 2 : 1) {
        const accent = s % 4 === 0 ? 1 : 0.75;
        pluckNote(v.pluck, t + s * (beat / 2) + humanize(), notes[pick[s]], entry * (0.35 + 0.4 * tex.pulse) * accent * (0.9 + rand() * 0.2));
      }
    }

    if (tex.bells > 0 && i % 2 === 1 && toEnd > 1 && rand() < 0.7) {
      const mc: number[] = [];
      for (let m = 74; m <= 79; m++) if (chord.tones.includes(pc(m)) && [0, 2, 4, 7, 9].includes(pc(m))) mc.push(m);
      const positions = rand() < 0.5 ? [2.5] : [1.5, 3];
      for (const pos of positions) malletNote(v.mallet, t + pos * beat + humanize(), mc[Math.floor(rand() * mc.length)], tex.bells * (0.7 + rand() * 0.3));
    }
  });

  // The resolution: a slow, quiet rolled D on the downbeat after the cadence, no louder than the bars before it, and a
  // last mallet note, left to ring under the end card.
  const end = p.endSec;
  const tail = cues.durationSec - end;
  [38, 50, 57, 62, 66, 74].forEach((m, j) => pianoNote(v.keys, end + j * 0.08, m, 0.17 - j * 0.01, tail));
  bassNote(v.bass, end, 38, 0.3, tail);
  malletNote(v.mallet, end + 2 * beat, 74, 0.4);
  [57, 62, 66].forEach((m, vi) => padRuns[vi].push({ midi: m, start: end, end: end + tail * 0.7, level: 0.6 }));

  padRuns.forEach((runs, vi) => {
    for (const r of runs) padNote(v.pad, r.start, r.end - r.start + 1.2, r.midi, r.level, vi * 3 + Math.round(r.start));
  });
}

export function renderBed(cues: Cues): { audio: Stereo; plan: Plan } {
  const N = Math.round(cues.durationSec * SR);
  const p = plan(cues);
  const dry = stereo(N);
  const wet = stereo(N);
  const send = (s: number): Send => ({ dry, wet, pan: 0, send: s });
  score(p, cues, { keys: send(0.35), pluck: send(0.3), mallet: send(0.5), pad: send(0.35), bass: send(0.05) });

  const verb = reverb(wet, 0.78, 0.3, 0.02);
  const mix = stereo(N);
  for (let i = 0; i < N; i++) {
    mix.L[i] = dry.L[i] + verb.L[i] * 0.7;
    mix.R[i] = dry.R[i] + verb.R[i] * 0.7;
  }
  filterStereo(
    mix,
    biquad("highpass", 40, 0.7),
    biquad("lowshelf", 250, 0.7, -6),
    biquad("peak", 700, 1, 3),
    biquad("peak", 1250, 1.4, -6),
    biquad("peak", 2500, 0.9, -4),
    biquad("lowpass", 12000, 0.7),
  );

  // A 10 ms ramp keeps the first sample click-free; the music itself is present from the first frame.
  const fadeIn = Math.round(0.01 * SR);
  const fadeOut = Math.round(2.5 * SR);
  for (let i = 0; i < N; i++) {
    let g = 1;
    if (i < fadeIn) g = i / fadeIn;
    if (i >= N - fadeOut) g *= 0.5 + 0.5 * Math.cos((Math.PI * (i - (N - fadeOut))) / fadeOut);
    mix.L[i] *= g;
    mix.R[i] *= g;
  }
  return { audio: mix, plan: p };
}
