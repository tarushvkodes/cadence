/**
 * Screenshots of every screen and the key demo states, light and dark, desktop and phone.
 *
 *   npm run screens                 writes .audit/screens/<name>-<theme>-<device>.png
 *   npm run screens -- today plan   only the named shots
 *
 * Needs the web app running (`npm run dev`). Agent states come from the recorded fixtures, replayed fast.
 */
import { mkdir } from 'node:fs/promises';
import { chromium, type Browser, type Page } from 'playwright';

const BASE = process.env.CADENCE_URL ?? 'http://localhost:5173';
const OUT = new URL('../.audit/screens/', import.meta.url);
const DEVICES = {
  desktop: { width: 1440, height: 900 },
  phone: { width: 390, height: 844 },
  hd: { width: 1920, height: 1080 },
} as const;
type Device = keyof typeof DEVICES;

async function replayTurns(page: Page, turns: number) {
  for (let i = 0; i < turns; i++) {
    await page.locator('.starter').last().click();
    await page.waitForFunction((n) => document.querySelectorAll('.msg-assistant').length >= n, i + 1);
    await page.waitForFunction(() => !document.querySelector('.msg-assistant[aria-busy="true"]'), null, { timeout: 60_000 });
    await page.waitForTimeout(1600);
  }
}

type Shot = { name: string; url: string; devices?: Device[]; full?: boolean; setup?: (page: Page) => Promise<void> };

const SHOTS: Shot[] = [
  { name: 'onboarding', url: '/#/today', setup: async (page) => void (await page.evaluate(() => localStorage.clear()), await page.reload()) },
  {
    name: 'onboarding-promises',
    url: '/#/today',
    setup: async (page) => {
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.getByLabel('I don’t remember').check();
      await page.getByRole('button', { name: 'Continue' }).click();
    },
  },
  { name: 'today', url: '/?demo=plan-week#/today', devices: ['desktop', 'phone', 'hd'] },
  { name: 'today-period-day-1', url: '/?demo=rough-morning#/today' },
  { name: 'plan', url: '/?demo=plan-week#/plan' },
  { name: 'guide-empty', url: '/?demo=plan-week#/guide' },
  {
    name: 'guide-plan-week',
    url: '/?demo=plan-week&speed=12&gap=0.4#/guide',
    devices: ['desktop', 'phone', 'hd'],
    setup: async (page) => {
      await replayTurns(page, 1);
      await page.locator('.proposal-card').scrollIntoViewIfNeeded();
    },
  },
  {
    name: 'plan-suggestions',
    url: '/?demo=plan-week&speed=12&gap=0.4#/guide',
    devices: ['desktop', 'phone', 'hd'],
    setup: async (page) => {
      await replayTurns(page, 1);
      await page.evaluate(() => (window.location.hash = '/plan'));
      await page.waitForTimeout(900);
      await page.mouse.wheel(0, 260);
    },
  },
  {
    name: 'guide-rough-morning',
    url: '/?demo=rough-morning&speed=12&gap=0.4#/guide',
    setup: async (page) => {
      await replayTurns(page, 1);
      await page.locator('.proposal-card').scrollIntoViewIfNeeded();
    },
  },
  {
    name: 'guide-safety',
    url: '/?demo=safety&speed=12&gap=0.4#/guide',
    setup: async (page) => {
      await replayTurns(page, 1);
      await page.locator('.msg-assistant').first().scrollIntoViewIfNeeded();
    },
  },
  {
    name: 'guide-safety-notes',
    url: '/?demo=safety&speed=12&gap=0.4#/guide',
    setup: async (page) => {
      await replayTurns(page, 2);
      await page.locator('.msg-user').last().scrollIntoViewIfNeeded();
    },
  },
  { name: 'learn', url: '/?demo=plan-week#/learn' },
  { name: 'learn-ai', url: '/?demo=plan-week#/learn', setup: async (page) => void (await page.locator('#ai-title').scrollIntoViewIfNeeded(), await page.waitForTimeout(800)) },
  { name: 'settings', url: '/?demo=plan-week#/settings' },
];

async function capture(browser: Browser, shot: Shot, theme: 'light' | 'dark', device: Device) {
  const page = await browser.newPage({ viewport: DEVICES[device], deviceScaleFactor: 2, colorScheme: theme, reducedMotion: 'no-preference' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}${shot.url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  if (shot.setup) await shot.setup(page);
  await page.waitForTimeout(1600);
  const file = new URL(`${shot.name}-${theme}-${device}.png`, OUT);
  await page.screenshot({ path: file.pathname, fullPage: shot.full ?? false });
  await page.close();
  console.log(`${errors.length ? 'ERR ' : 'ok  '} ${shot.name}-${theme}-${device}${errors.length ? `: ${errors.join('; ')}` : ''}`);
  return errors.length;
}

const only = process.argv.slice(2);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
let errors = 0;
for (const shot of SHOTS.filter((s) => !only.length || only.includes(s.name))) {
  for (const device of shot.devices ?? (['desktop', 'phone'] as Device[])) {
    for (const theme of ['light', 'dark'] as const) {
      if (device === 'hd' && theme === 'dark') continue;
      errors += await capture(browser, shot, theme, device);
    }
  }
}
await browser.close();
process.exit(errors ? 1 : 0);
