import { C, HUES, MX, CW } from '../lib/tokens.mjs';
import { SOURCES } from '../lib/sources.mjs';
import { DIVIDER } from './problem.mjs';

const sage = HUES.sage;
const REPO = 'https://github.com/tarushvkodes/cadence';
const TEAM = 'Ingrid Busby  ·  Paetyn Puff  ·  Tarushv Kosgi  ·  Vincent Friscia  ·  Zykira Peterson';

const AROUND = ['Six tools', 'Safety rules', 'Approve and undo', 'Record and replay', 'Evidence labels', 'The app itself'];

const learned = {
	layout: 'content',
	title: 'What we learned about AI by teaching it',
	speaker: 'Vincent',
	draft: true,
	notes: `To explain Cadence, we first had to explain what an agent is. And we found out we didn't fully get it ourselves. We thought the AI did everything. It doesn't. The model reads text and asks for tools. Our code runs the tools, checks every draft, and applies only what you approve. Most of the work was the code around the model.`,
	draw(s, k) {
		const cx = MX + 3.45;
		const cy = 4.1;
		k.disc(s, { cx, cy, d: 1.7, fill: C.ink });
		k.serif(s, 'Claude', { x: cx - 0.85, y: cy - 0.35, w: 1.7, h: 0.5, fontSize: 28, color: C.paper, align: 'center' });
		k.text(s, 'the model', { x: cx - 0.85, y: cy + 0.15, w: 1.7, h: 0.3, fontSize: 11, color: C.lineStrong, align: 'center' });
		AROUND.forEach((label, i) => {
			const a = ((i * 60 + 30) * Math.PI) / 180;
			const px = cx + 2.35 * Math.sin(a);
			const py = cy - 1.55 * Math.cos(a);
			k.pill(s, label, { x: px - 0.88, y: py - 0.21, w: 1.76, h: 0.42, fill: C.card, color: C.ink, fontSize: 12, line: C.lineStrong });
		});
		const rx = MX + 6.95;
		const rw = MX + CW - rx;
		k.serif(s, 'Claude reads, writes, and asks for tools. Our code does the rest.', { x: rx, y: 2.3, w: rw, h: 2.0, fontSize: 38 });
		k.text(s, 'Our code runs the tools, checks every draft, and applies only what you approve. Most of the work was the code around the model.', { x: rx, y: 4.45, w: rw, h: 1.3, fontSize: 16, color: C.ink2 });
	},
};

const changed = {
	layout: 'content',
	title: 'How our understanding changed',
	speaker: 'Paetyn',
	draft: true,
	notes: `Our understanding of the topic flipped. We started out believing in cycle syncing. It was in our proposal. Then the research pointed the other way, and we had to rebuild our premise halfway through. That was uncomfortable. But it made the project better. Now the app is honest about what's known, and it doesn't repeat a stereotype.`,
	draw(s, k) {
		const w = (CW - 0.8) / 2;
		const y = 2.0;
		const h = 3.2;
		k.card(s, { x: MX, y, w, h, fill: C.sunken, line: null, shadow: false });
		k.eyebrow(s, 'Before', null, { x: MX + 0.45, y: y + 0.4, w: w - 0.9 });
		k.serif(s, 'Sync your habits to your phase.', { x: MX + 0.45, y: y + 0.85, w: w - 0.9, h: 1.9, fontSize: 40, color: C.ink3 });
		k.line(s, { x1: MX + w + 0.15, y1: y + h / 2, x2: MX + w + 0.65, y2: y + h / 2, color: C.ink3, width: 1.5, arrow: true });
		const rx = MX + w + 0.8;
		k.card(s, { x: rx, y, w, h, fill: sage.tint, line: sage.solid, lineWidth: 1.5, shadow: false });
		k.eyebrow(s, 'After', 'sage', { x: rx + 0.45, y: y + 0.4, w: w - 0.9 });
		k.serif(s, 'Plan around how you feel. Your phase is only a hint.', { x: rx + 0.45, y: y + 0.85, w: w - 0.9, h: 1.9, fontSize: 40, color: sage.ink });
		k.text(s, 'The research contradicted our own proposal, so we rebuilt the premise halfway through the project.', { x: MX, y: 5.6, w: CW, h: 0.6, fontSize: 16, color: C.ink2 });
	},
};

const harder = {
	layout: 'content',
	title: 'Harder to explain than we expected',
	speaker: 'Tarushv',
	draft: true,
	notes: `Two things were harder to explain than we expected. First, why the same question gets a different answer each time. The model writes a new answer every time instead of looking one up. That's why we recorded real sessions to replay in the demo. Second, deciding what the AI should not do took longer than deciding what it should do. Most of the design turned out to be limits.`,
	draw(s, k) {
		const w = (CW - 0.3) / 2;
		const y = 2.0;
		const h = 4.2;
		const cards = [
			['Why answers vary', 'Same prompt, different answer.', 'The model writes a fresh answer each time instead of looking one up. So we recorded real sessions and replay them for the demo.'],
			['What it should not do', 'Limits took longer than features.', 'Deciding what it must never do took longer than deciding what it should do. Most of the design turned out to be limits.'],
		];
		cards.forEach(([eyebrow, big, body], i) => {
			const x = MX + i * (w + 0.3);
			k.card(s, { x, y, w, h });
			k.serif(s, String(i + 1).padStart(2, '0'), { x: x + 0.45, y: y + 0.35, w: 1, h: 0.6, fontSize: 36, color: sage.solid });
			k.eyebrow(s, eyebrow, 'sage', { x: x + 0.45, y: y + 1.1, w: w - 0.9 });
			k.serif(s, big, { x: x + 0.45, y: y + 1.5, w: w - 0.9, h: 1.2, fontSize: 36 });
			k.text(s, body, { x: x + 0.45, y: y + 2.85, w: w - 0.9, h: 1.1, fontSize: 15, color: C.ink2 });
		});
	},
};

const NEXT = [
	['Real calendars', 'Google Calendar and Outlook, with the same approval step.'],
	['A private model', 'One that runs on your own device, so data never leaves it.'],
	['Clinician-reviewed content', 'Experts check every health claim and red flag.'],
	['Wearable data', 'Sleep and activity, only for people who opt in.'],
	['A study with real users', 'Does it actually help? Their check-ins can tell us.'],
];

const extend = {
	layout: 'content',
	title: 'How we’d extend it',
	speaker: 'Zykira',
	draft: true,
	notes: `With more time, we'd connect real calendars, like Google Calendar and Outlook. We'd try a private model that runs on your own device, so your data never leaves it. We'd have clinicians review the health content. We'd add data from wearables, like sleep, for people who opt in. And most of all, we'd run a study with real users to see if it actually helps.`,
	draw(s, k) {
		const w = CW / NEXT.length;
		const ly = 2.55;
		k.line(s, { x1: MX + w / 2, y1: ly, x2: MX + CW - w / 2, y2: ly, color: sage.solid, width: 2 });
		NEXT.forEach(([title, body], i) => {
			const x = MX + i * w;
			const last = i === NEXT.length - 1;
			k.numDot(s, i + 1, { cx: x + w / 2, cy: ly, d: 0.5, fill: last ? sage.solid : C.card, color: last ? C.card : sage.ink, line: last ? null : sage.solid, fontSize: 14 });
			k.text(s, title, { x: x + 0.15, y: ly + 0.55, w: w - 0.3, h: 0.65, fontSize: 16, bold: true, align: 'center' });
			k.text(s, body, { x: x + 0.15, y: ly + 1.25, w: w - 0.3, h: 1.1, fontSize: 13.5, color: C.ink2, align: 'center' });
		});
		k.card(s, { x: MX, y: 5.2, w: CW, h: 0.95, fill: sage.tint, line: null, shadow: false });
		k.text(s, [{ text: 'The one we’d do first: ', options: { bold: true, color: sage.ink } }, { text: 'a study with real users. We built Cadence on research about cycles, but we haven’t tested whether Cadence itself helps.' }], { x: MX + 0.4, y: 5.2, w: CW - 0.8, h: 0.95, fontSize: 15, valign: 'middle' });
	},
};

const TAKEAWAYS = [
	['garnet', 'Your phase doesn’t change what you’re capable of.', 'Plan around how you feel. Your phase is a hint.'],
	['apricot', 'An agent is a model that uses tools in a loop.', 'That’s what lets it work on your real week.'],
	['plum', 'Good AI suggests. You decide.', 'Especially with something as personal as your health.'],
];

const takeaways = {
	layout: 'content',
	eyebrow: 'If you remember three things',
	title: 'Three takeaways',
	speaker: 'Ingrid',
	notes: `If you remember three things, make it these. One, your phase doesn't change what you're capable of, so plan around how you feel. Two, an agent is a model that uses tools in a loop. That's what lets it work on your real week. Three, good AI suggests, and you decide. That matters most with something as personal as your health.`,
	draw(s, k) {
		const w = (CW - 0.6) / 3;
		TAKEAWAYS.forEach(([hue, big, small], i) => {
			const x = MX + i * (w + 0.3);
			k.card(s, { x, y: 2.0, w, h: 4.2 });
			k.serif(s, String(i + 1), { x: x + 0.4, y: 2.3, w: 1, h: 1.0, fontSize: 72, color: HUES[hue].solid });
			k.serif(s, big, { x: x + 0.4, y: 3.45, w: w - 0.8, h: 1.6, fontSize: 30 });
			k.text(s, small, { x: x + 0.4, y: 5.15, w: w - 0.8, h: 0.8, fontSize: 14, color: C.ink2 });
		});
	},
};

const thanks = {
	layout: 'cover',
	title: 'Thank you',
	speaker: 'Ingrid',
	notes: `Thanks for watching. The code is on GitHub at the link on screen. We're happy to take any questions.`,
	draw(s, k) {
		k.eyebrow(s, 'Cadence  ·  Your week, in step with your cycle', null, { x: MX, y: 1.55, w: 6.8 });
		k.serif(s, 'Questions?', { x: MX, y: 3.95, w: 6.6, h: 0.65, fontSize: 32, italic: true, color: C.ink2 });
		k.text(s, [{ text: REPO.replace('https://', ''), options: { hyperlink: { url: REPO }, color: HUES.plum.ink, bold: true } }], { x: MX, y: 4.85, w: 6.6, h: 0.4, fontSize: 18 });
		k.text(s, TEAM, { x: MX, y: 6.35, w: 7.6, h: 0.3, fontSize: 12, color: C.ink3 });
		k.brandRing(s, { cx: 10.05, cy: 3.75, r: 2.3, stroke: 0.4, dotDeg: 0 });
	},
};

const sources = {
	layout: 'content',
	eyebrow: 'Appendix',
	title: 'Sources',
	speaker: 'Ingrid',
	notes: `No narration needed. Leave this slide up during questions. The full list is in docs/REFERENCES.md.`,
	draw(s, k) {
		const keys = Object.keys(SOURCES);
		const half = Math.ceil(keys.length / 2);
		const w = (CW - 0.5) / 2;
		[keys.slice(0, half), keys.slice(half)].forEach((group, c) => {
			const runs = group.flatMap((key, i) => {
				const src = SOURCES[key];
				const title = src.title && !src.short.includes(src.title) ? src.title.replace(/([^?.])$/, '$1.') : '';
				return [
					{ text: `${src.short}. `, options: { bold: true } },
					{ text: `${title ? `${title} ` : ''}${src.venue}.`, options: { color: C.ink2, breakLine: true } },
					...(i < group.length - 1 ? [{ text: ' ', options: { fontSize: 5, breakLine: true } }] : []),
				];
			});
			k.text(s, runs, { x: MX + c * (w + 0.5), y: 1.95, w, h: 4.5, fontSize: 11.5, lineSpacingMultiple: 1.1 });
		});
	},
};

export const reflection = {
	id: 'reflection',
	name: 'Reflection',
	question: 'What did building this teach us?',
	hue: 'sage',
	speaker: 'Vincent',
	agendaSpeaker: 'All five',
	target: '2:30',
	draft: true,
	dividerNotes: `To wrap up, each of us will share one thing we learned.`,
	slides: [DIVIDER, learned, changed, harder, extend, takeaways, thanks, sources],
};
