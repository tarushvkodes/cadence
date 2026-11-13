import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderBed, type Cues } from "./bed.ts";
import { gain, integratedLufs, samplePeak, truePeakDb, writeWav24, type Stereo } from "./dsp.ts";
import { chime, tap, tick, whoosh } from "./oneshots.ts";

const BED_LUFS = -20;
const BED_MAX_TP = -2;
const ONESHOT_PEAK_DB = -6;

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "audio");
mkdirSync(outDir, { recursive: true });

function parseCues(raw: unknown): Cues {
  const c = raw as Partial<Cues>;
  if (typeof c.durationSec !== "number" || c.durationSec <= 0) throw new Error("cues.json: durationSec must be a positive number");
  if (!Array.isArray(c.sections) || c.sections.some((s) => typeof s?.id !== "string" || typeof s?.start !== "number"))
    throw new Error("cues.json: sections must be [{ id, start }]");
  return { fps: c.fps ?? 30, durationSec: c.durationSec, sections: c.sections };
}

const cues = parseCues(JSON.parse(readFileSync(join(here, "cues.json"), "utf8")));

const t0 = Date.now();
const { audio: bed, plan } = renderBed(cues);
const raw = integratedLufs(bed);
gain(bed, 10 ** ((BED_LUFS - raw) / 20));
const lufs = integratedLufs(bed);
const tp = truePeakDb(bed);
if (tp > BED_MAX_TP) throw new Error(`bed true peak ${tp.toFixed(2)} dBTP exceeds ${BED_MAX_TP} dBTP at ${BED_LUFS} LUFS`);
writeWav24(join(outDir, "bed.wav"), bed);
console.log(
  `bed.wav  ${cues.durationSec}s  ${plan.bpm.toFixed(2)} BPM  ${plan.bars.length} bars + end at ${plan.endSec}s  ` +
    `${lufs.toFixed(2)} LUFS  ${tp.toFixed(2)} dBTP  (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
);
console.log(`  chords: ${plan.bars.map((b) => b.chord.name).join(" ")}`);

const shots: Record<string, () => Stereo> = { tap, tick, chime, whoosh };
for (const [name, make] of Object.entries(shots)) {
  const b = make();
  gain(b, 10 ** (ONESHOT_PEAK_DB / 20) / samplePeak(b));
  writeWav24(join(outDir, `${name}.wav`), b);
  console.log(`${name}.wav  ${(b.L.length / 48000).toFixed(3)}s  peak ${ONESHOT_PEAK_DB} dBFS  ${truePeakDb(b).toFixed(2)} dBTP`);
}
