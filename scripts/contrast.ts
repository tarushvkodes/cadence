import { PALETTE, type Theme } from '../src/ui/palette.ts';
import { PHASES } from '../src/domain/types.ts';

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

type Pair = { name: string; fg: string; bg: string; min: number };

function pairs(theme: Theme): Pair[] {
  const list: Pair[] = [
    { name: 'ink on bg', fg: theme.ink, bg: theme.bg, min: 4.5 },
    { name: 'ink-2 on bg', fg: theme.ink2, bg: theme.bg, min: 4.5 },
    { name: 'ink-2 on elevated', fg: theme.ink2, bg: theme.elevated, min: 4.5 },
    { name: 'ink-3 on bg', fg: theme.ink3, bg: theme.bg, min: 4.5 },
    { name: 'ink-3 on elevated', fg: theme.ink3, bg: theme.elevated, min: 4.5 },
    { name: 'danger on elevated', fg: theme.danger, bg: theme.elevated, min: 4.5 },
    { name: 'focus ring on bg', fg: theme.focus, bg: theme.bg, min: 3 },
  ];
  for (const p of PHASES) {
    const h = theme.phases[p];
    list.push(
      { name: `${p} on-solid on solid`, fg: h.onSolid, bg: h.solid, min: 4.5 },
      { name: `${p} ink on tint`, fg: h.ink, bg: h.tint, min: 4.5 },
      { name: `${p} ink on bg`, fg: h.ink, bg: theme.bg, min: 4.5 },
      { name: `${p} ink on elevated`, fg: h.ink, bg: theme.elevated, min: 4.5 },
      { name: `${p} solid on bg (marks)`, fg: h.solid, bg: theme.bg, min: 3 },
      { name: `${p} solid on tint (marks)`, fg: h.solid, bg: h.tint, min: 3 },
    );
  }
  return list;
}

let failed = 0;
for (const [name, theme] of Object.entries(PALETTE)) {
  console.log(`\n${name}`);
  for (const p of pairs(theme)) {
    const ratio = contrast(p.fg, p.bg);
    const ok = ratio >= p.min;
    if (!ok) failed++;
    console.log(`  ${ok ? 'pass' : 'FAIL'}  ${ratio.toFixed(2).padStart(5)}  (min ${p.min})  ${p.name}`);
  }
}
console.log(failed ? `\n${failed} pairings below AA` : '\nAll pairings meet WCAG AA');
process.exit(failed ? 1 : 0);
