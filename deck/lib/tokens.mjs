// Design tokens, taken from the app's light theme in src/ui/palette.ts and src/styles/base.css.

export const W = 13.333;
export const H = 7.5;
export const MX = 0.75;
export const CW = W - 2 * MX;

export const Y = {
	eyebrow: 0.62,
	title: 0.92,
	source: 6.5,
	footer: 6.98,
};

export const C = {
	paper: 'F5F1EB',
	card: 'FFFDF9',
	sunken: 'ECE6DD',
	ink: '1F1B17',
	ink2: '5B534B',
	ink3: '6F665D',
	line: 'E2DED8',
	lineStrong: 'D3CFC9',
	ink3Dark: '9A9187',
	shadow: '3A2A1C',
};

export const HUES = {
	garnet: { solid: 'A13A4F', tint: 'F4E2E4', ink: '7A2236' },
	sage: { solid: '467550', tint: 'E2ECDF', ink: '2C5534' },
	apricot: { solid: 'A6590F', tint: 'F8E7D3', ink: '743D08' },
	plum: { solid: '5A5791', tint: 'E6E5F2', ink: '3E3B70' },
};

export const FONT = {
	serif: 'Instrument Serif',
	sans: 'Inter',
	mono: 'JetBrains Mono',
};

export const THEME_COLORS = {
	dk1: C.ink,
	lt1: C.paper,
	dk2: C.ink2,
	lt2: C.card,
	accent1: HUES.garnet.solid,
	accent2: HUES.sage.solid,
	accent3: HUES.apricot.solid,
	accent4: HUES.plum.solid,
	accent5: C.ink3,
	accent6: C.sunken,
	hlink: HUES.plum.ink,
	folHlink: HUES.garnet.ink,
};

/** Twelve columns across the content width, 0.3 in gutters. */
export function col(start, span) {
	const gutter = 0.3;
	const unit = (CW - 11 * gutter) / 12;
	return { x: MX + start * (unit + gutter), w: span * unit + (span - 1) * gutter };
}
