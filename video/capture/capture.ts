import { fileURLToPath } from 'node:url';
import { captureTake, launch, startServer } from './engine.ts';
import { PHONE_TAKES, TAKES as LAPTOP_TAKES } from './takes.ts';

const TAKES = [...LAPTOP_TAKES, ...PHONE_TAKES];

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const PORT = Number(process.env.CAPTURE_PORT ?? 5199);
const wanted = process.argv.slice(2);
const takes = wanted.length ? TAKES.filter((t) => wanted.includes(t.id)) : TAKES;
if (wanted.length && takes.length !== wanted.length) throw new Error(`unknown take in: ${wanted.join(', ')}`);

const server = await startServer(here('../..'), PORT, here(`../.app-build-${PORT}`));
const browser = await launch();
try {
  for (const take of takes) {
    const t0 = Date.now();
    const data = await captureTake(browser, `http://localhost:${PORT}`, take, here(`../public/captures/${take.id}.mp4`), here(`../src/data/captures/${take.id}.json`));
    console.log(`${take.id}: ${data.frames} frames (${(data.frames / 30).toFixed(1)} s) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
} finally {
  await browser.close();
  server.kill();
}
