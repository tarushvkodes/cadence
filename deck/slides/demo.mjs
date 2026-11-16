import { C, FONT, HUES, MX, CW } from '../lib/tokens.mjs';
import { DIVIDER } from './problem.mjs';

const plum = HUES.plum;
const REPO = 'https://github.com/tarushvkodes/cadence';

const film = {
	layout: 'content',
	title: 'Watch it work',
	film: true,
	notes: `Here's the whole flow on a sample week, with a midterm on Thursday and a lab report due Friday. Watch the tool steps, and watch the approve buttons. Nothing changes until you tap one.\n\n[FILM PLAYS HERE, 4:25. Film narration: see video/NARRATION.md]\n\nThat's the whole flow. Here are the same steps as slides, so you can try it yourself.`,
	draw(s, k) {
		const w = 8.3;
		const h = (w * 9) / 16;
		const y = 1.95;
		s.addShape(k.SH.ROUNDED_RECTANGLE, { x: MX, y, w, h, rectRadius: 0.16, fill: { color: C.sunken }, line: { color: C.lineStrong, width: 1.5, dashType: 'dash' }, objectName: 'film-placeholder' });
		const cx = MX + w / 2;
		const cy = y + h / 2 - 0.45;
		k.disc(s, { cx, cy, d: 0.95, fill: C.ink });
		s.addShape(k.SH.ISOSCELES_TRIANGLE, { x: cx - 0.17, y: cy - 0.2, w: 0.4, h: 0.36, rotate: 90, fill: { color: C.card }, line: { type: 'none' } });
		k.serif(s, 'Demo film plays here', { x: MX, y: cy + 0.68, w, h: 0.55, fontSize: 32, align: 'center' });
		k.text(s, 'Replace this box with video/out/cadence-demo.mp4 (16:9, 4:25).', { x: MX + 0.5, y: cy + 1.3, w: w - 1, h: 0.3, fontSize: 13, color: C.ink2, align: 'center' });

		const rx = MX + w + 0.55;
		const rw = MX + CW - rx;
		k.eyebrow(s, 'Watch for', 'plum', { x: rx, y: 2.05, w: rw });
		const items = [
			['The tool steps', 'Each one shows the agent reading your data.'],
			['The approve buttons', 'Nothing changes until you tap one.'],
		];
		items.forEach(([title, body], i) => {
			const y0 = 2.5 + i * 1.45;
			k.numDot(s, i + 1, { cx: rx + 0.19, cy: y0 + 0.17, d: 0.38, fill: plum.solid, fontSize: 12 });
			k.text(s, title, { x: rx + 0.55, y: y0, w: rw - 0.55, h: 0.34, fontSize: 16, bold: true });
			k.text(s, body, { x: rx + 0.55, y: y0 + 0.4, w: rw - 0.55, h: 0.9, fontSize: 13.5, color: C.ink2 });
		});
	},
};

/** A step slide: either two screenshots with a caption under each, or one screenshot and a short list. */
function step(n, title, { notes, shots, list, foot }) {
	return {
		layout: 'content',
		eyebrow: `Step ${n} of 7`,
		title,
		notes,
		draw(s, k) {
			if (shots.length === 2) {
				const w = (CW - 0.4) / 2;
				const h = w / 1.6;
				shots.forEach(([file, alt, caption], i) => {
					const x = MX + i * (w + 0.4);
					k.shot(s, file, { x, y: 2.0, w, h, alt });
					k.numDot(s, i + 1, { cx: x + 0.19, cy: 2.0 + h + 0.48, d: 0.36, fill: plum.solid, fontSize: 11 });
					k.text(s, caption, { x: x + 0.55, y: 2.0 + h + 0.3, w: w - 0.55, h: 0.7, fontSize: 15 });
				});
				return;
			}
			const [file, alt, ratio = 1.6] = shots[0];
			const w = 7.3;
			k.shot(s, file, { x: MX, y: 2.0, w, h: w / ratio, alt });
			const rx = MX + w + 0.55;
			const rw = MX + CW - rx;
			list.forEach((item, i) => {
				const y = 2.1 + i * 1.05;
				k.numDot(s, i + 1, { cx: rx + 0.19, cy: y + 0.18, d: 0.38, fill: plum.solid, fontSize: 12 });
				k.text(s, item, { x: rx + 0.55, y, w: rw - 0.55, h: 0.9, fontSize: 16 });
			});
			if (foot) k.text(s, foot, { x: rx, y: 2.1 + list.length * 1.05 + 0.1, w: rw, h: 0.6, fontSize: 13.5, color: C.ink3 });
		},
	};
}

const steps = [
	step(1, 'Set up', {
		notes: `Step one. Enter your cycle basics, read the four promises, and pick the sample week.`,
		shots: [
			['onboarding.png', 'Onboarding: last period start, usual cycle length, period length, and how regular it is.', 'Enter your cycle basics. Rough answers are fine.'],
			['promises.png', 'Onboarding: the four promises about data, suggestions, medical advice, and estimates.', 'Read the four promises, then pick the sample week or a blank start.'],
		],
	}),
	step(2, 'Check in', {
		notes: `Step two. Each day, do the ten-second check-in on Today.`,
		shots: [['today.png', 'Today: the cycle dial, the next period range, and the How are you, really? check-in.', 16 / 9]],
		list: ['Open Today. The dial shows your likely cycle day.', 'Check the range and how confident it is.', 'Tap your energy, mood, and anything else. Then save.'],
		foot: 'About 10 seconds a day. It stays on your computer.',
	}),
	step(3, 'Ask the Guide', {
		notes: `Step three. Open the Guide, ask it to plan your week, and watch the tools it calls.`,
		shots: [['guide-empty.png', 'The Guide, with a suggested prompt and the list of what Cadence can use.']],
		list: ['Open Guide.', 'Tap “Plan my week around my cycle.”', 'Watch it read your cycle, calendar, habits, and check-ins.'],
		foot: 'The panel lists every tool it can use.',
	}),
	step(4, 'Approve or decline', {
		notes: `Step four. Approve what you like and decline the rest. Anything still waiting shows as a dashed block on your Plan.`,
		shots: [
			['guide-plan.png', 'Suggestion cards in the Guide, each with Decline and Approve.', 'Approve the ones you like, decline the rest. You can undo later.'],
			['plan-ghosts.png', 'The Plan week view with pending suggestions shown as dashed ghost blocks.', 'On Plan, anything still waiting shows as a dashed ghost block.'],
		],
	}),
	step(5, 'A rough morning', {
		notes: `Step five. On a rough day, log how you feel and ask what to change. It only touches today.`,
		shots: [
			['day1.png', 'Today on day 1 of a period, with the check-in.', 'Log how you feel. Here, low energy, a flat mood, and cramps.'],
			['rough.png', 'The Guide suggesting three small changes for today only.', 'Ask “Today feels rough, what should I change?” It adjusts today only.'],
		],
	}),
	step(6, 'When to see someone', {
		notes: `Step six. Describe a red-flag symptom, and it tells you plainly to see a clinician. It can help you prepare for the appointment.`,
		shots: [
			['safety.png', 'The Guide recommending a doctor for pain that causes missed classes.', 'Describe a red-flag symptom. It says to see a clinician, without diagnosing.'],
			['safety-notes.png', 'The Guide drafting notes for the appointment from the check-ins.', 'Ask for help preparing. It drafts notes for the appointment.'],
		],
	}),
];

const run = {
	layout: 'content',
	eyebrow: 'Step 7 of 7',
	title: 'Run it yourself',
	notes: `Step seven. To run it yourself, you need Node and a Claude Code login. Clone the repo, run npm install, then npm run dev. To just watch our recorded demo, add the demo setting on screen to the address. Next, Zykira covers the ethics.`,
	draw(s, k) {
		const w = 7.3;
		k.card(s, { x: MX, y: 2.0, w, h: 2.75, fill: C.ink, line: null });
		k.eyebrow(s, 'In a terminal', null, { x: MX + 0.4, y: 2.3, w: w - 0.8, color: C.ink3Dark, fontSize: 10 });
		const lines = [`git clone ${REPO}`, 'cd cadence', 'npm install', 'npm run dev'];
		k.text(
			s,
			lines.flatMap((l, i) => [
				{ text: '$ ', options: { color: C.ink3Dark } },
				{ text: l, options: { color: C.paper, breakLine: i < lines.length - 1 } },
			]),
			{ x: MX + 0.4, y: 2.7, w: w - 0.8, h: 1.8, fontSize: 15, fontFace: FONT.mono, lineSpacingMultiple: 1.45 },
		);
		k.text(s, [{ text: 'Then open ' }, { text: 'localhost:5173', options: { fontFace: FONT.mono, bold: true } }, { text: ' in your browser.' }], { x: MX, y: 5.0, w, h: 0.35, fontSize: 16 });
		k.text(s, [{ text: REPO.replace('https://', ''), options: { hyperlink: { url: REPO }, color: plum.ink, bold: true } }], { x: MX, y: 5.5, w, h: 0.35, fontSize: 16 });

		const rx = MX + w + 0.55;
		const rw = MX + CW - rx;
		k.eyebrow(s, 'You need', 'plum', { x: rx, y: 2.05, w: rw });
		const needs = ['Node.js 20.19 or newer', 'Claude Code, installed and signed in'];
		needs.forEach((n, i) => {
			k.disc(s, { cx: rx + 0.08, cy: 2.6 + i * 0.5, d: 0.1, fill: plum.solid });
			k.text(s, n, { x: rx + 0.3, y: 2.45 + i * 0.5, w: rw - 0.3, h: 0.32, fontSize: 15 });
		});
		k.eyebrow(s, 'Just want to look?', 'plum', { x: rx, y: 3.75, w: rw });
		k.pill(s, '?demo=plan-week', { x: rx, y: 4.15, w: 2.2, h: 0.4, fill: C.sunken, color: C.ink, fontSize: 13, fontFace: FONT.mono, bold: false });
		k.text(s, 'Add this to the address. It replays our recorded session, so no Claude login is needed.', { x: rx, y: 4.7, w: rw, h: 0.9, fontSize: 14, color: C.ink2 });
	},
};

export const demo = {
	id: 'demo',
	name: 'The demo',
	question: 'How do you use it, step by step?',
	hue: 'plum',
	speaker: 'Tarushv',
	target: '6:00',
	scriptNote: 'Steps 1 to 6 repeat what the film shows, so they are a reference people can follow later. If the recording runs long, leave each of those slides up for a few seconds without narrating it.',
	dividerNotes: `Thanks, Vincent. Now let's see it work, step by step.`,
	slides: [DIVIDER, film, ...steps, run],
};
