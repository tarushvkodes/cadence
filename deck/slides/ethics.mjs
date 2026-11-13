import { C, FONT, HUES, MX, CW, Y } from '../lib/tokens.mjs';
import { DIVIDER } from './problem.mjs';

const garnet = HUES.garnet;
const appNote = (k, s, text) => k.text(s, text, { x: MX, y: Y.source, w: CW, h: 0.3, fontSize: 9.5, color: C.ink3, valign: 'bottom' });

const bias = {
	layout: 'content',
	title: 'Bias: the stereotype was in our own proposal',
	sources: ['jang2025'],
	notes: `The biggest risk was bias, and it started with us. Our proposal assumed your phase changes how well you think. That idea feeds a stereotype about women, and the research doesn't back it. So we wrote the opposite into the agent's instructions. It must never say or imply that a phase lowers ability, focus, or judgment. A lighter day has to be about how you feel.`,
	draw(s, k) {
		const w = (CW - 0.7) / 2;
		const y = 2.0;
		const h = 3.3;
		k.card(s, { x: MX, y, w, h });
		k.eyebrow(s, 'The stereotype', 'garnet', { x: MX + 0.4, y: y + 0.38, w: w - 0.8 });
		k.serif(s, [{ text: '“Your phase lowers your focus and judgment.”', options: { strike: 'sngStrike' } }], { x: MX + 0.4, y: y + 0.8, w: w - 0.8, h: 1.4, fontSize: 34, color: C.ink3 });
		k.text(s, 'Not supported. 102 studies found no measurable change in thinking across the cycle.', { x: MX + 0.4, y: y + 2.35, w: w - 0.8, h: 0.7, fontSize: 14, color: C.ink2 });
		k.line(s, { x1: MX + w + 0.12, y1: y + h / 2, x2: MX + w + 0.58, y2: y + h / 2, color: C.ink3, width: 1.5, arrow: true });
		const rx = MX + w + 0.7;
		k.card(s, { x: rx, y, w, h, line: HUES.sage.solid, lineWidth: 1.5 });
		k.eyebrow(s, 'The rule we wrote', 'sage', { x: rx + 0.4, y: y + 0.38, w: w - 0.8 });
		k.serif(s, '“Never say or imply that a phase lowers ability, focus, memory, judgment, or decision quality.”', { x: rx + 0.4, y: y + 0.8, w: w - 0.8, h: 1.6, fontSize: 27, italic: true });
		k.text(s, 'Cadence’s system prompt, word for word', { x: rx + 0.4, y: y + 2.6, w: w - 0.8, h: 0.3, fontSize: 12, color: C.ink3 });
		k.text(s, 'A lighter day must be about comfort, symptoms, sleep, or logged energy. Never ability.', { x: MX, y: 5.65, w: CW, h: 0.6, fontSize: 16, color: C.ink2 });
	},
};

const privacy = {
	layout: 'content',
	title: 'Privacy: this is health data',
	sources: ['flo2021'],
	notes: `Next, privacy, because cycle data is health data. In 2021, the period tracker Flo settled with the FTC over sharing users' health data with companies like Facebook and Google, after promising privacy. So Cadence has no account and no server, and your data stays in your browser. One honest exception. When you ask the Guide something, the data it reads goes to Claude so it can answer.`,
	draw(s, k) {
		const boxW = 6.95;
		s.addShape(k.SH.ROUNDED_RECTANGLE, { x: MX, y: 2.0, w: boxW, h: 4.2, rectRadius: 0.2, fill: { color: C.sunken }, line: { color: C.lineStrong, width: 1, dashType: 'dash' } });
		k.eyebrow(s, 'Your computer', null, { x: MX + 0.35, y: 2.28, w: 4 });
		const ix = MX + 0.35;
		const iw = boxW - 0.7;
		k.card(s, { x: ix, y: 2.7, w: iw, h: 2.15 });
		k.text(s, 'Cadence, in your browser', { x: ix + 0.35, y: 2.95, w: iw - 0.7, h: 0.32, fontSize: 16, bold: true });
		const chips = ['Cycle dates', 'Check-ins', 'Calendar', 'Habits'];
		let cx = ix + 0.35;
		for (const chip of chips) {
			const w = 0.42 + chip.length * 0.095;
			k.pill(s, chip, { x: cx, y: 3.45, w, h: 0.38, fill: garnet.tint, color: garnet.ink, fontSize: 12 });
			cx += w + 0.15;
		}
		k.text(s, 'Stored only here. Export it or delete it all in Settings.', { x: ix + 0.35, y: 4.08, w: iw - 0.7, h: 0.6, fontSize: 14, color: C.ink2 });
		k.text(s, 'No account. No Cadence server.', { x: ix, y: 5.2, w: iw, h: 0.35, fontSize: 16, bold: true });
		k.text(s, 'Nothing leaves this computer unless you ask the Guide.', { x: ix, y: 5.58, w: iw, h: 0.35, fontSize: 13.5, color: C.ink2 });

		const rx = MX + boxW + 0.75;
		const rw = MX + CW - rx;
		k.line(s, { x1: ix + iw + 0.1, y1: 3.4, x2: rx - 0.1, y2: 3.4, color: C.ink3, width: 1.5, arrow: true });
		k.card(s, { x: rx, y: 2.0, w: rw, h: 2.15 });
		k.eyebrow(s, 'Only when you ask the Guide', 'garnet', { x: rx + 0.35, y: 2.28, w: rw - 0.7, fontSize: 10 });
		k.serif(s, 'Claude', { x: rx + 0.35, y: 2.62, w: rw - 0.7, h: 0.55, fontSize: 30 });
		k.text(s, 'gets the results of the tools it calls, through your own Claude Code login.', { x: rx + 0.35, y: 3.22, w: rw - 0.7, h: 0.8, fontSize: 13.5, color: C.ink2 });
		k.card(s, { x: rx, y: 4.4, w: rw, h: 1.8, fill: garnet.tint, line: null, shadow: false });
		k.eyebrow(s, 'Why it matters', 'garnet', { x: rx + 0.35, y: 4.62, w: rw - 0.7, fontSize: 10 });
		k.text(s, 'In 2021, the period tracker Flo settled FTC charges that it shared users’ health data with Facebook and Google after promising privacy.', { x: rx + 0.35, y: 4.95, w: rw - 0.7, h: 1.15, fontSize: 13.5 });
	},
};

const RED_FLAGS = [
	'Pain that makes you miss class, or that pain relief doesn’t help',
	'Very heavy bleeding, or periods longer than about 7 days',
	'No period for 3 months or more',
	'Severe mood changes before periods',
	'Dizziness, fainting, or fever with pelvic pain',
];

const safety = {
	layout: 'content',
	title: 'Medical safety: a planner, not a doctor',
	notes: `Third, medical safety. Cadence is a planner, not a doctor. It won't diagnose or give medication advice. But some symptoms deserve a clinician, like pain that makes you miss class, very heavy periods, or severe mood changes. When someone describes one, the agent says so first, plainly and kindly. It points urgent signs to urgent care, and self-harm to the 988 crisis line.`,
	draw(s, k) {
		const lw = 3.9;
		k.card(s, { x: MX, y: 2.0, w: lw, h: 3.35 });
		k.eyebrow(s, 'It won’t', 'garnet', { x: MX + 0.35, y: 2.3, w: lw - 0.7 });
		['Diagnose anything', 'Guess at a likely condition', 'Give medication or dosing advice'].forEach((t, i) => {
			const y = 2.8 + i * 0.78;
			k.disc(s, { cx: MX + 0.52, cy: y + 0.17, d: 0.34, fill: garnet.tint });
			k.text(s, '×', { x: MX + 0.35, y: y + 0.0, w: 0.34, h: 0.34, fontSize: 15, bold: true, color: garnet.ink, align: 'center', valign: 'middle' });
			k.text(s, t, { x: MX + 0.85, y: y + 0.02, w: lw - 1.15, h: 0.65, fontSize: 15 });
		});
		const rx = MX + lw + 0.3;
		const rw = MX + CW - rx;
		k.card(s, { x: rx, y: 2.0, w: rw, h: 3.35 });
		k.eyebrow(s, 'Red flags it takes seriously', 'sage', { x: rx + 0.35, y: 2.3, w: rw - 0.7 });
		RED_FLAGS.forEach((t, i) => {
			const y = 2.72 + i * 0.38;
			k.disc(s, { cx: rx + 0.43, cy: y + 0.14, d: 0.09, fill: HUES.sage.solid });
			k.text(s, t, { x: rx + 0.62, y, w: rw - 0.95, h: 0.32, fontSize: 13.5 });
		});
		k.text(s, 'It says to see a clinician, plainly and kindly, and offers to help.', { x: rx + 0.35, y: 4.75, w: rw - 0.7, h: 0.4, fontSize: 14, bold: true });
		const half = (CW - 0.3) / 2;
		[
			['Urgent signs', 'It points to urgent care right away.'],
			['Thoughts of self-harm', 'It points to the 988 crisis line.'],
		].forEach(([lead, rest], i) => {
			const x = MX + i * (half + 0.3);
			s.addShape(k.SH.ROUNDED_RECTANGLE, { x, y: 5.6, w: half, h: 0.6, rectRadius: 0.12, fill: { color: C.sunken }, line: { type: 'none' } });
			k.text(s, [{ text: `${lead}. `, options: { bold: true } }, { text: rest }], { x: x + 0.3, y: 5.6, w: half - 0.6, h: 0.6, fontSize: 14, valign: 'middle' });
		});
		appNote(k, s, 'From Cadence’s system prompt, src/agent/systemPrompt.ts. The Settings screen shows it word for word.');
	},
};

const estimates = {
	layout: 'content',
	title: 'Estimates, not facts',
	notes: `Fourth, predictions are estimates. Cadence never shows a single date. It shows a range and how confident it is, and the range widens when your history is short or irregular. And these dates are never for birth control or for planning a pregnancy.`,
	draw(s, k) {
		const h = 4.2;
		const w = h * (980 / 1250);
		k.shot(s, 'dial-range.png', { x: MX, y: 2.0, w, h, alt: 'The Today dial at day 25 of about 28, with Next period likely Nov 18 to 22 and the estimate Fairly confident.' });
		const rx = MX + w + 0.6;
		const rw = MX + CW - rx;
		const rules = [
			['A range, never a single date', 'Here, the next period is likely Nov 18 to 22.'],
			['It says how sure it is', 'Fairly confident, Rough estimate, or Low confidence.'],
			['Ranges widen when it knows less', 'A short history or irregular cycles make the window wider.'],
		];
		rules.forEach(([title, body], i) => {
			const y = 2.05 + i * 0.95;
			k.numDot(s, i + 1, { cx: rx + 0.19, cy: y + 0.17, d: 0.38, fill: garnet.solid, fontSize: 12 });
			k.text(s, title, { x: rx + 0.55, y, w: rw - 0.55, h: 0.34, fontSize: 16, bold: true });
			k.text(s, body, { x: rx + 0.55, y: y + 0.38, w: rw - 0.55, h: 0.45, fontSize: 13.5, color: C.ink2 });
		});
		k.card(s, { x: rx, y: 4.95, w: rw, h: 1.25, fill: garnet.tint, line: null, shadow: false });
		k.serif(s, 'Never for birth control or for planning a pregnancy.', { x: rx + 0.35, y: 5.1, w: rw - 0.7, h: 0.5, fontSize: 25, color: garnet.ink });
		k.text(s, 'The app says so at setup, and the agent says so if you ask.', { x: rx + 0.35, y: 5.65, w: rw - 0.7, h: 0.35, fontSize: 13.5, color: C.ink2 });
	},
};

const GROUPS = [
	['Irregular cycles', 'Phase estimates get less reliable.'],
	['Hormonal birth control', 'Our phase estimates may not fit at all.'],
	['Conditions like PCOS', 'Cycles may not follow the usual phases.'],
	['People who menstruate but don’t identify as women', 'Our wording can shut them out.'],
];

const leftOut = {
	layout: 'content',
	title: 'Who it can leave out',
	notes: `Fifth, who it can leave out. Our estimates assume a natural cycle, and not everyone has one. People with irregular cycles, hormonal birth control, or conditions like PCOS may get hints that don't fit. And not everyone who has a period identifies as a woman, so our wording can shut people out. Finally, AI can be wrong. It can sound sure and still be mistaken.`,
	draw(s, k) {
		const gw = 7.2;
		const tw = (gw - 0.3) / 2;
		GROUPS.forEach(([title, body], i) => {
			const x = MX + (i % 2) * (tw + 0.3);
			const y = 2.0 + Math.floor(i / 2) * 1.7;
			k.card(s, { x, y, w: tw, h: 1.45, shadow: 0.6 });
			k.text(s, title, { x: x + 0.32, y: y + 0.25, w: tw - 0.64, h: 0.6, fontSize: 15, bold: true });
			k.text(s, body, { x: x + 0.32, y: y + 0.88, w: tw - 0.64, h: 0.45, fontSize: 13, color: C.ink2 });
		});
		k.text(s, 'Cadence plans from each person’s own logs first, so a wrong phase hint matters less.', { x: MX, y: 5.5, w: gw, h: 0.6, fontSize: 15, color: C.ink2 });
		const rx = MX + gw + 0.45;
		const rw = MX + CW - rx;
		k.card(s, { x: rx, y: 2.0, w: rw, h: 4.1, fill: C.ink, line: null });
		k.eyebrow(s, 'And', null, { x: rx + 0.4, y: 2.35, w: rw - 0.8, color: C.ink3Dark });
		k.serif(s, 'AI can be wrong', { x: rx + 0.4, y: 2.72, w: rw - 0.8, h: 0.65, fontSize: 36, color: C.paper });
		k.text(s, 'It can sound sure and still be mistaken. It can misread a pattern from a few weeks of logs.', { x: rx + 0.4, y: 3.55, w: rw - 0.8, h: 1.2, fontSize: 15, color: C.lineStrong });
		k.text(s, 'Read every suggestion before you approve it.', { x: rx + 0.4, y: 4.95, w: rw - 0.8, h: 0.7, fontSize: 15, bold: true, color: C.paper });
	},
};

const control = {
	layout: 'content',
	title: 'You stay in control, and you can see inside',
	notes: `Last, control and transparency. You approve every change and can undo it. And you can see inside. Settings shows the agent's full instructions, word for word. The chat shows each tool it calls. And the Learn screen labels every claim as well supported, mixed, or weak, with its source.`,
	draw(s, k) {
		const w = (CW - 0.6) / 3;
		const y = 2.0;
		const h = 4.2;
		const cols = [
			['You decide', 'Approve every change', 'And undo anything you approved.'],
			['Read its instructions', 'The full system prompt', 'Settings shows it word for word. The chat shows each tool call.'],
			['Check the evidence', 'Every claim is labeled', 'Each claim on the Learn screen links to its source.'],
		];
		cols.forEach(([eyebrow, title, body], i) => {
			const x = MX + i * (w + 0.3);
			k.card(s, { x, y, w, h });
			k.eyebrow(s, eyebrow, 'garnet', { x: x + 0.35, y: y + 0.32, w: w - 0.7, fontSize: 10 });
			k.text(s, title, { x: x + 0.35, y: y + 0.65, w: w - 0.7, h: 0.38, fontSize: 18, bold: true });
			k.text(s, body, { x: x + 0.35, y: y + 3.3, w: w - 0.7, h: 0.75, fontSize: 13.5, color: C.ink2 });
		});
		const x0 = MX + 0.35;
		k.pill(s, '✓  Approve', { x: x0, y: 3.3, w: 1.55, h: 0.42, fill: HUES.plum.solid, color: C.card, fontSize: 13 });
		k.pill(s, '×  Decline', { x: x0 + 1.7, y: 3.3, w: 1.45, h: 0.42, fill: C.sunken, color: C.ink, fontSize: 13 });
		k.pill(s, '↺  Undo', { x: x0, y: 3.92, w: 1.3, h: 0.42, fill: C.card, color: C.ink, fontSize: 13, line: C.lineStrong });

		const x1 = MX + w + 0.3 + 0.35;
		s.addShape(k.SH.ROUNDED_RECTANGLE, { x: x1, y: 3.15, w: w - 0.7, h: 1.85, rectRadius: 0.1, fill: { color: C.sunken }, line: { type: 'none' } });
		k.text(s, 'You never change anything yourself. Every change you draft appears to the user as a suggestion with a before and after, and they approve or decline each one.', { x: x1 + 0.2, y: 3.3, w: w - 1.1, h: 1.6, fontSize: 10.5, fontFace: FONT.mono, color: C.ink2, lineSpacingMultiple: 1.2 });

		const x2 = MX + 2 * (w + 0.3) + 0.35;
		[
			['Well supported', 3],
			['Mixed', 2],
			['Weak', 1],
		].forEach(([label, bars], i) => {
			const y0 = 3.2 + i * 0.58;
			k.pill(s, '', { x: x2, y: y0, w: 2.25, h: 0.42, fill: C.sunken });
			for (let b = 0; b < 3; b++) {
				const bh = 0.08 + b * 0.05;
				s.addShape(k.SH.RECTANGLE, { x: x2 + 0.2 + b * 0.09, y: y0 + 0.29 - bh, w: 0.055, h: bh, fill: { color: b < bars ? C.ink : C.lineStrong }, line: { type: 'none' } });
			}
			k.text(s, label, { x: x2 + 0.6, y: y0, w: 1.6, h: 0.42, fontSize: 12.5, bold: true, valign: 'middle' });
		});
	},
};

export const ethics = {
	id: 'ethics',
	name: 'Ethics',
	question: 'What could go wrong, and what did we do about it?',
	hue: 'garnet',
	speaker: 'Zykira',
	target: '2:30',
	dividerNotes: `Thanks, Tarushv. An app like this can do real harm if it's built carelessly. Here's what we worried about, and what we did.`,
	slides: [DIVIDER, bias, privacy, safety, estimates, leftOut, control],
};
