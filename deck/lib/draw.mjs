import { C, FONT, HUES, MX, CW, Y } from './tokens.mjs';
import { SOURCES } from './sources.mjs';

const softShadow = (strength = 1) => ({ type: 'outer', color: C.shadow, opacity: 0.1 * strength, blur: 16, offset: 3, angle: 90 });

/** Clock degrees (0 at the top, clockwise) to OOXML arc degrees (0 at three o'clock, clockwise). */
const ooxmlAngle = (deg) => (((deg + 270) % 360) + 360) % 360;

/** Visible extents of the four phase arcs in the app icon (assets/icon.svg), in clock degrees. */
export const BRAND_ARCS = [
	{ from: 2.7, to: 69.3, hue: 'garnet' },
	{ from: 74.7, to: 177.3, hue: 'sage' },
	{ from: 182.7, to: 231.3, hue: 'apricot' },
	{ from: 236.7, to: 357.3, hue: 'plum' },
];

export function kit(pres) {
	const SH = pres.shapes;

	const text = (s, content, o = {}) =>
		s.addText(content, { fontFace: FONT.sans, fontSize: 16, color: C.ink, margin: 0, valign: 'top', isTextBox: true, lineSpacingMultiple: 1.12, ...o });

	const serif = (s, content, o = {}) => text(s, content, { fontFace: FONT.serif, lineSpacingMultiple: 0.95, ...o });

	const eyebrow = (s, label, hue, o = {}) =>
		text(s, label, { bold: true, color: hue ? HUES[hue].ink : C.ink3, h: 0.3, ...o, fontSize: Math.max(o.fontSize ?? 13, 12) });

	const card = (s, { x, y, w, h, fill = C.card, line = C.line, lineWidth = 0.75, radius = 0.16, shadow = true, name }) =>
		s.addShape(SH.ROUNDED_RECTANGLE, {
			x,
			y,
			w,
			h,
			rectRadius: radius,
			fill: { color: fill },
			line: line ? { color: line, width: lineWidth } : { type: 'none' },
			shadow: shadow ? softShadow(shadow === true ? 1 : shadow) : undefined,
			objectName: name,
		});

	const pill = (s, label, { x, y, w, h = 0.36, fill = C.sunken, color = C.ink, fontSize = 12, bold = true, line, align = 'center', fontFace = FONT.sans }) => {
		s.addShape(SH.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: h / 2, fill: { color: fill }, line: line ? { color: line, width: 0.75 } : { type: 'none' } });
		text(s, label, { x, y, w, h, fontSize, bold, color, align, valign: 'middle', fontFace });
	};

	const disc = (s, { cx, cy, d, fill = C.ink, line, lineWidth = 0.75, name }) =>
		s.addShape(SH.OVAL, { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: fill ? { color: fill } : { type: 'none' }, line: line ? { color: line, width: lineWidth } : { type: 'none' }, objectName: name });

	const numDot = (s, n, { cx, cy, d = 0.42, fill = C.ink, color = C.card, fontSize = 13, line }) => {
		disc(s, { cx, cy, d, fill, line });
		text(s, String(n), { x: cx - d / 2, y: cy - d / 2, w: d, h: d, align: 'center', valign: 'middle', fontSize, bold: true, color });
	};

	const line = (s, { x1, y1, x2, y2, color = C.lineStrong, width = 1, dash, arrow }) =>
		s.addShape(SH.LINE, {
			x: Math.min(x1, x2),
			y: Math.min(y1, y2),
			w: Math.max(Math.abs(x2 - x1), 0.0001),
			h: Math.max(Math.abs(y2 - y1), 0.0001),
			flipH: x2 < x1,
			flipV: y2 < y1,
			line: { color, width, dashType: dash, endArrowType: arrow ? 'triangle' : undefined },
		});

	/** A screenshot in a rounded frame with a soft shadow. finish.mjs rounds every picture named "shot:*". */
	const shot = (s, file, { x, y, w, h, alt, radius = 0.14 }) => {
		card(s, { x, y, w, h, radius, line: null, shadow: 1.6 });
		s.addImage({ path: new URL(`../assets/${file}`, import.meta.url).pathname, x, y, w, h, altText: alt, objectName: `shot:${radius}:${file}` });
		s.addShape(SH.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: radius, fill: { type: 'none' }, line: { color: C.lineStrong, width: 0.75 } });
	};

	/** Ring segments in clock degrees. finish.mjs gives every shape named "arc:*" round caps. */
	const ring = (s, { cx, cy, r, stroke, segments, round = true }) => {
		const cap = round ? (((stroke / 2) / r) * 180) / Math.PI : 0;
		for (const seg of segments) {
			s.addShape(SH.ARC, {
				x: cx - r,
				y: cy - r,
				w: 2 * r,
				h: 2 * r,
				angleRange: [ooxmlAngle(seg.from + cap), ooxmlAngle(seg.to - cap)],
				line: { color: seg.color, width: stroke * 72, transparency: seg.transparency },
				objectName: round ? 'arc:round' : 'arc:flat',
			});
		}
	};

	const onRing = (cx, cy, r, deg) => {
		const a = (deg * Math.PI) / 180;
		return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
	};

	/** The app's four-phase ring with the "today" dot. */
	const brandRing = (s, { cx, cy, r, stroke, dotDeg = 0 }) => {
		ring(s, { cx, cy, r, stroke, segments: BRAND_ARCS.map((a) => ({ ...a, color: HUES[a.hue].solid })) });
		const p = onRing(cx, cy, r, dotDeg);
		disc(s, { cx: p.x, cy: p.y, d: stroke * 1.15, fill: C.ink, line: C.paper, lineWidth: Math.max(2, stroke * 9) });
	};

	/** Section dividers: six equal arcs, the current one in its hue, earlier ones faded, later ones neutral. */
	const progressRing = (s, { cx, cy, r, stroke, sections, current }) => {
		const span = 360 / sections.length;
		ring(s, {
			cx,
			cy,
			r,
			stroke,
			segments: sections.map((sec, i) => ({
				from: i * span + 4,
				to: (i + 1) * span - 4,
				color: i <= current ? HUES[sec.hue].solid : C.lineStrong,
				transparency: i < current ? 62 : 0,
			})),
		});
	};

	/** Comparison marks: a full disc, a half disc, an empty ring, or a dash for "does not apply". */
	const mark = (s, kind, { cx, cy, d = 0.24, color = C.ink }) => {
		if (kind === 'na') return line(s, { x1: cx - d / 2.6, y1: cy, x2: cx + d / 2.6, y2: cy, color: C.ink3, width: 1.5 });
		disc(s, { cx, cy, d, fill: kind === 'yes' ? color : null, line: color, lineWidth: 1.5 });
		if (kind === 'partly') s.addShape(SH.PIE, { x: cx - d / 2, y: cy - d / 2, w: d, h: d, angleRange: [90, 270], fill: { color }, line: { type: 'none' } });
	};

	const sourceLine = (s, keys, { prefix, y = Y.source } = {}) => {
		const cites = keys.map((k) => {
			if (!SOURCES[k]) throw new Error(`Unknown source key: ${k}`);
			return SOURCES[k].short;
		});
		const label = `${prefix ? `${prefix} ` : ''}${cites.length > 1 ? 'Sources' : 'Source'}: ${cites.join('; ')}.`;
		text(s, label, { x: MX, y, w: CW, h: 0.3, fontSize: 9.5, color: C.ink3, valign: 'bottom' });
	};

	return { SH, text, serif, eyebrow, card, pill, disc, numDot, line, shot, ring, onRing, brandRing, progressRing, mark, sourceLine };
}
