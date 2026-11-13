import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

export const FPS = 30;
export const VIEWPORT = { width: 1440, height: 900 } as const;
export const SCALE = 2;

export type Rect = { x: number; y: number; w: number; h: number; lines?: { x: number; y: number; w: number; h: number }[] };

/** A Playwright selector for something on the page. */
export type Target = string;

/** One step of a take. Recorded steps write frames; `skip` advances time without recording. */
export type Action =
  | { do: 'hold'; ms: number }
  | { do: 'skip'; ms: number }
  | { do: 'click'; target: Target; hoverMs?: number; at?: 'center' | 'left' }
  | { do: 'mark'; name: string; targets: Record<string, Target> }
  | { do: 'scroll'; to: Target | number; ms: number; offset?: number }
  | { do: 'scrollBy'; by: number; ms: number }
  | { do: 'type'; target: Target; text: string; msPerChar?: number }
  | { do: 'route'; hash: string };

export type Take = {
  id: string;
  url: string;
  /** Local wall-clock time the page believes it is when it loads. */
  clock: string;
  script: Action[];
  /** Page expressions sampled on every recorded frame; each change is saved with its frame. */
  watch?: Record<string, string>;
};

export type Mark = { name: string; frame: number; rects: Record<string, Rect> };
export type Click = { frame: number; hover: number; x: number; y: number; target: string };
export type TakeData = {
  id: string;
  fps: number;
  frames: number;
  viewport: { width: number; height: number };
  scale: number;
  marks: Mark[];
  clicks: Click[];
  scrolls: { from: number; to: number; frame: number; frames: number }[];
  watch: Record<string, { frame: number; value: string }[]>;
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Drives every animation on the page from virtual time. Timers, rAF and Date come from Playwright's
 * fake clock; CSS transitions, CSS animations and WAAPI animations (Motion's included) are paused
 * when first seen and then seeked to the virtual clock each frame.
 */
const STEP_ANIMATIONS = (now: number) => {
  type Stepped = Animation & { __vt0?: number };
  for (const a of document.getAnimations() as Stepped[]) {
    if (a.__vt0 === undefined) {
      const seen = typeof a.currentTime === 'number' ? Math.min(a.currentTime, 34) : 0;
      a.__vt0 = now - seen;
      a.pause();
    }
    a.currentTime = now - a.__vt0;
  }
};

/**
 * Serves a production build of the app. A build has no hot reload, so editing files while a capture
 * runs cannot reload the page under it.
 */
export async function startServer(root: string, port: number, outDir: string): Promise<ChildProcess> {
  execFileSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], { cwd: root, stdio: 'ignore' });
  const server = spawn('npx', ['vite', 'preview', '--outDir', outDir, '--port', String(port), '--strictPort'], { cwd: root, stdio: 'pipe' });
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return server;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  server.kill();
  throw new Error(`vite preview did not start on ${url}`);
}

class Recorder {
  private ffmpeg: ChildProcess | null = null;
  frame = 0;
  virtualMs = 0;
  private advanced = 0;

  constructor(
    private readonly page: Page,
    private readonly out: string,
    private readonly watch: Record<string, string> = {},
    readonly watched: Record<string, { frame: number; value: string }[]> = {},
  ) {}

  open() {
    mkdirSync(dirname(this.out), { recursive: true });
    this.ffmpeg = spawn(
      'ffmpeg',
      ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', this.out],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    );
  }

  /** Advance virtual time by one frame and let React and the stepped animations catch up. */
  async tick() {
    const target = Math.round(((this.frame + 1) * 1000) / FPS) + this.advanced;
    const delta = target - this.virtualMs;
    await this.page.clock.runFor(delta);
    this.virtualMs = target;
    await this.settle();
  }

  /** Advance without writing frames (setup that the film never shows). */
  async skip(ms: number) {
    const steps = Math.ceil(ms / 50);
    for (let i = 0; i < steps; i++) {
      await this.page.clock.runFor(50);
      this.virtualMs += 50;
      this.advanced += 50;
      await this.settle();
    }
  }

  private async settle() {
    await this.page.evaluate(
      () => new Promise<void>((resolve) => {
        const ch = new MessageChannel();
        ch.port1.onmessage = () => resolve();
        ch.port2.postMessage(0);
      }),
    );
    await this.page.evaluate(STEP_ANIMATIONS, this.virtualMs);
  }

  async shoot() {
    for (const [key, expr] of Object.entries(this.watch)) {
      const value = String(await this.page.evaluate(expr));
      const seen = (this.watched[key] ??= []);
      if (seen.at(-1)?.value !== value) seen.push({ frame: this.frame, value });
    }
    const png = await this.page.screenshot({ type: 'png', caret: 'initial', scale: 'device' });
    const stdin = this.ffmpeg?.stdin;
    if (!stdin) throw new Error('recorder not open');
    if (!stdin.write(png)) await new Promise((r) => stdin.once('drain', r));
    this.frame++;
  }

  async record(ms: number) {
    const n = Math.round((ms * FPS) / 1000);
    for (let i = 0; i < n; i++) {
      await this.tick();
      await this.shoot();
    }
  }

  async close() {
    const ff = this.ffmpeg;
    if (!ff) return;
    await new Promise<void>((resolve, reject) => {
      ff.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
      ff.stdin?.end();
    });
  }
}

/**
 * Finds a run of text in the page and measures it. Kept as a string so the TypeScript loader cannot
 * wrap it with helpers that do not exist inside the page.
 */
const FIND_TEXT = `function (needle) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  const starts = [];
  let all = '';
  for (let n = walker.nextNode(); n; n = walker.nextNode()) { nodes.push(n); starts.push(all.length); all += n.data; }
  const at = all.indexOf(needle);
  if (at < 0) return null;
  function locate(pos, isEnd) {
    for (let k = 0; k < nodes.length; k++) {
      const s = starts[k], e = s + nodes[k].data.length;
      if (isEnd ? pos > s && pos <= e : pos >= s && pos < e) return [nodes[k], pos - s];
    }
    const last = nodes[nodes.length - 1];
    return [last, last.data.length];
  }
  const a = locate(at, false), b = locate(at + needle.length, true);
  const range = document.createRange();
  range.setStart(a[0], a[1]);
  range.setEnd(b[0], b[1]);
  const box = range.getBoundingClientRect();
  const lines = Array.from(range.getClientRects()).filter((r) => r.width > 1).map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height }));
  return { x: box.x, y: box.y, w: box.width, h: box.height, lines };
}`;

/** `range=<text>` measures a run of text rather than an element, with one rect per line it wraps onto. */
async function rectOf(page: Page, target: Target): Promise<Rect> {
  if (target.startsWith('range=')) {
    const found = (await page.evaluate(`(${FIND_TEXT})(${JSON.stringify(target.slice(6))})`)) as Rect | null;
    if (!found) throw new Error(`no text ${target}`);
    return found;
  }
  const box = await page.locator(target).first().boundingBox();
  if (!box) throw new Error(`no box for ${target}`);
  return { x: box.x, y: box.y, w: box.width, h: box.height };
}

export async function captureTake(browser: Browser, base: string, take: Take, outVideo: string, outData: string) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, colorScheme: 'light', reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.clock.install({ time: new Date(take.clock) });
  await page.clock.pauseAt(new Date(new Date(take.clock).getTime() + 1000));
  await page.goto(base + take.url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(VIEWPORT.width - 4, VIEWPORT.height - 4);

  const data: TakeData = { id: take.id, fps: FPS, frames: 0, viewport: { ...VIEWPORT }, scale: SCALE, marks: [], clicks: [], scrolls: [], watch: {} };
  const rec = new Recorder(page, outVideo, take.watch, data.watch);
  rec.open();

  for (const step of take.script) {
    switch (step.do) {
      case 'hold':
        await rec.record(step.ms);
        break;
      case 'skip':
        await rec.skip(step.ms);
        break;
      case 'mark': {
        const rects: Record<string, Rect> = {};
        for (const [k, t] of Object.entries(step.targets)) rects[k] = await rectOf(page, t);
        data.marks.push({ name: step.name, frame: rec.frame, rects });
        break;
      }
      case 'click': {
        const r = await rectOf(page, step.target);
        const x = step.at === 'left' ? r.x + Math.min(24, r.w / 2) : r.x + r.w / 2;
        const y = r.y + r.h / 2;
        const hover = rec.frame;
        await page.mouse.move(x, y);
        await rec.record(step.hoverMs ?? 400);
        data.clicks.push({ frame: rec.frame, hover, x, y, target: step.target });
        await page.mouse.down();
        await rec.record(100);
        await page.mouse.up();
        break;
      }
      case 'type': {
        await page.locator(step.target).first().focus();
        for (const ch of step.text) {
          await page.keyboard.type(ch);
          await rec.record(step.msPerChar ?? 45);
        }
        break;
      }
      case 'scroll':
      case 'scrollBy': {
        const from = await page.evaluate(() => window.scrollY);
        const to =
          step.do === 'scrollBy'
            ? from + step.by
            : typeof step.to === 'number'
              ? step.to
              : await page.locator(step.to).first().evaluate((el, off) => el.getBoundingClientRect().top + window.scrollY - off, step.offset ?? 120);
        const frames = Math.round((step.ms * FPS) / 1000);
        data.scrolls.push({ from, to, frame: rec.frame, frames });
        for (let i = 1; i <= frames; i++) {
          const y = from + (to - from) * easeInOut(i / frames);
          await page.evaluate((v) => window.scrollTo(0, v), y);
          await rec.tick();
          await rec.shoot();
        }
        break;
      }
      case 'route':
        await page.evaluate((h) => (window.location.hash = h), step.hash);
        break;
    }
  }

  data.frames = rec.frame;
  await rec.close();
  mkdirSync(dirname(outData), { recursive: true });
  writeFileSync(outData, JSON.stringify(data, null, 1) + '\n');
  if (errors.length) console.warn(`[${take.id}] page errors:\n  ${errors.join('\n  ')}`);
  await context.close();
  return data;
}

export async function launch() {
  return chromium.launch();
}
