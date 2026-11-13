import type { Phase } from '../domain/types.ts';

/** One phase hue: a soft tint for fills, a solid for marks, and the text colors that sit on each. */
export type PhaseHue = {
  readonly solid: string;
  readonly onSolid: string;
  readonly tint: string;
  readonly ink: string;
};

export type Theme = {
  readonly bg: string;
  readonly elevated: string;
  readonly sunken: string;
  readonly ink: string;
  readonly ink2: string;
  readonly ink3: string;
  readonly line: string;
  readonly lineStrong: string;
  readonly focus: string;
  readonly danger: string;
  readonly phases: Record<Phase, PhaseHue>;
};

/** The authoritative palette. `npm run contrast` checks every text pairing against WCAG AA. */
export const PALETTE: Record<'light' | 'dark', Theme> = {
  light: {
    bg: '#F5F1EB',
    elevated: '#FFFDF9',
    sunken: '#ECE6DD',
    ink: '#1F1B17',
    ink2: '#5B534B',
    ink3: '#6F665D',
    line: 'rgba(31, 27, 23, 0.09)',
    lineStrong: 'rgba(31, 27, 23, 0.16)',
    focus: '#2D63C8',
    danger: '#A3352B',
    phases: {
      menstrual: { solid: '#A13A4F', onSolid: '#FFFFFF', tint: '#F4E2E4', ink: '#7A2236' },
      follicular: { solid: '#467550', onSolid: '#FFFFFF', tint: '#E2ECDF', ink: '#2C5534' },
      ovulatory: { solid: '#A6590F', onSolid: '#FFFFFF', tint: '#F8E7D3', ink: '#743D08' },
      luteal: { solid: '#5A5791', onSolid: '#FFFFFF', tint: '#E6E5F2', ink: '#3E3B70' },
    },
  },
  dark: {
    bg: '#131211',
    elevated: '#1C1A18',
    sunken: '#0E0D0C',
    ink: '#F2EDE6',
    ink2: '#B3AAA0',
    ink3: '#9A9187',
    line: 'rgba(255, 250, 240, 0.08)',
    lineStrong: 'rgba(255, 250, 240, 0.15)',
    focus: '#8DB3FF',
    danger: '#F0857A',
    phases: {
      menstrual: { solid: '#E58A9B', onSolid: '#2A0C14', tint: '#33191F', ink: '#F5B9C4' },
      follicular: { solid: '#8EBF8E', onSolid: '#0F2412', tint: '#1C2A1C', ink: '#B7DDB4' },
      ovulatory: { solid: '#EDA762', onSolid: '#2D1904', tint: '#33251A', ink: '#F7CB97' },
      luteal: { solid: '#ABA6E6', onSolid: '#191737', tint: '#232238', ink: '#D0CDF6' },
    },
  },
};

function themeVars(t: Theme): string {
  const base = [
    `--bg:${t.bg}`,
    `--elevated:${t.elevated}`,
    `--sunken:${t.sunken}`,
    `--ink:${t.ink}`,
    `--ink-2:${t.ink2}`,
    `--ink-3:${t.ink3}`,
    `--line:${t.line}`,
    `--line-strong:${t.lineStrong}`,
    `--focus:${t.focus}`,
    `--danger:${t.danger}`,
  ];
  const phases = (Object.entries(t.phases) as [Phase, PhaseHue][]).flatMap(([p, h]) => [
    `--${p}:${h.solid}`,
    `--${p}-on:${h.onSolid}`,
    `--${p}-tint:${h.tint}`,
    `--${p}-ink:${h.ink}`,
  ]);
  return [...base, ...phases].join(';');
}

/** CSS custom properties for both themes: system preference by default, `data-theme` to force one. */
export function paletteCss(): string {
  const light = themeVars(PALETTE.light);
  const dark = themeVars(PALETTE.dark);
  return [
    `:root{${light};color-scheme:light}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark};color-scheme:dark}}`,
    `:root[data-theme="dark"]{${dark};color-scheme:dark}`,
  ].join('\n');
}
