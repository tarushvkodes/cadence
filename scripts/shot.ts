import { chromium } from 'playwright';

const [url = 'http://localhost:5173/?demo=plan-week', out = 'shot.png', size = '1440x900', theme = 'light', extra = ''] = process.argv.slice(2);
const [width, height] = size.split('x').map(Number) as [number, number];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: theme === 'dark' ? 'dark' : 'light' });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(Number(process.env.WAIT ?? 2200));
if (extra.startsWith('scroll:')) {
  await page.mouse.wheel(0, Number(extra.slice(7)));
  await page.waitForTimeout(700);
}
await page.screenshot({ path: out, fullPage: process.env.FULL === '1' });
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
await browser.close();
