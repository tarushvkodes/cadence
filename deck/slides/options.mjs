import { C, HUES, MX, CW } from '../lib/tokens.mjs';
import { DIVIDER } from './problem.mjs';

const OPTIONS = [
	{ name: 'Period-tracker apps', example: 'Track and predict periods', good: 'Know your cycle and the symptoms you log.', missing: 'Generic tips. Can’t do anything with your schedule.' },
	{ name: 'A general chatbot', example: 'ChatGPT, the Claude app', good: 'Flexible. You can ask it anything.', missing: 'You re-explain your cycle and schedule each time. It can’t change anything.' },
	{ name: 'AI calendar assistants', example: 'Morgen, Motion, Reclaim', good: 'Great at scheduling your calendar for you.', missing: 'Know nothing about your cycle or how you feel.', tag: 'Our first idea' },
	{ name: 'A custom agent', example: 'Claude, with tools we wrote', good: 'Reads your data and drafts real changes.', missing: 'We had to build it, and make it safe.', pick: true },
];

const kinds = {
	layout: 'content',
	title: 'Four kinds of tools we looked at',
	notes: `We looked at four kinds of tools. First, period-tracker apps. They know your cycle, but the tips are generic, and they can't do anything with your schedule. Second, a general chatbot, like ChatGPT or the Claude app. It's flexible, but you have to explain your cycle and paste your schedule each time, and it can't change anything. Third, AI calendar assistants, like Morgen, Motion, and Reclaim. They're great at scheduling, but they know nothing about your cycle or how you feel. Morgen was actually our first idea. And fourth, building our own agent with Claude.`,
	draw(s, k) {
		const w = (CW - 0.9) / 4;
		const sage = HUES.sage;
		OPTIONS.forEach((o, i) => {
			const x = MX + i * (w + 0.3);
			const y = 2.0;
			k.card(s, { x, y, w, h: 4.72, line: o.pick ? sage.solid : C.line, lineWidth: o.pick ? 1.75 : 0.75 });
			k.serif(s, String(i + 1).padStart(2, '0'), { x: x + 0.32, y: y + 0.3, w: 1, h: 0.4, fontSize: 22, color: o.pick ? sage.solid : C.ink3 });
			if (o.pick) k.pill(s, 'Our pick', { x: x + w - 1.32, y: y + 0.32, w: 1.0, h: 0.32, fill: sage.solid, color: C.card, fontSize: 10.5 });
			if (o.tag) k.pill(s, o.tag, { x: x + w - 1.57, y: y + 0.32, w: 1.25, h: 0.32, fill: C.sunken, color: C.ink2, fontSize: 10.5 });
			k.serif(s, o.name, { x: x + 0.32, y: y + 0.78, w: w - 0.64, h: 0.9, fontSize: 27 });
			k.text(s, o.example, { x: x + 0.32, y: y + 1.72, w: w - 0.64, h: 0.42, fontSize: 12, color: C.ink3 });
			k.line(s, { x1: x + 0.32, y1: y + 2.25, x2: x + w - 0.32, y2: y + 2.25, color: C.line });
			k.eyebrow(s, 'Good at', 'sage', { x: x + 0.32, y: y + 2.4, w: w - 0.64, fontSize: 10 });
			k.text(s, o.good, { x: x + 0.32, y: y + 2.68, w: w - 0.64, h: 0.5, fontSize: 13 });
			k.eyebrow(s, 'Missing', 'garnet', { x: x + 0.32, y: y + 3.25, w: w - 0.64, fontSize: 10 });
			k.text(s, o.missing, { x: x + 0.32, y: y + 3.53, w: w - 0.64, h: 0.85, fontSize: 13 });
		});
	},
};

const CRITERIA = ['Knows you and how you feel', 'Works on your real calendar', 'Keeps your data private', 'Honest about the evidence', 'Shows its work', 'Low cost and effort'];
const COLUMNS = [
	{ name: 'Period\ntrackers', marks: ['yes', 'no', 'partly', 'partly', 'partly', 'yes'] },
	{ name: 'General\nchatbot', marks: ['no', 'no', 'partly', 'partly', 'partly', 'partly'] },
	{ name: 'Calendar\nassistants', marks: ['no', 'yes', 'partly', 'na', 'partly', 'partly'] },
	{ name: 'Custom agent\n(Cadence)', marks: ['yes', 'yes', 'yes', 'yes', 'yes', 'partly'], pick: true },
];

const compare = {
	layout: 'content',
	title: 'How the options compare',
	sources: ['worsfold2021', 'flo2021'],
	sourcePrefix: 'Our own assessment.',
	notes: `Here's how they compare on the six needs Ingrid listed. This is our own assessment. Trackers know you, but they can't act on your week. Chatbots can talk about anything, but they don't know you, and they can't act either. Calendar assistants can act, but they don't know you. Only a custom agent could do both. It isn't perfect. It takes some setup, and when you ask it something, the data it reads goes to Claude. Zykira will come back to that in the ethics section.`,
	draw(s, k) {
		const labelW = 3.85;
		const colW = (CW - labelW) / 4;
		const top = 2.0;
		const headH = 0.72;
		const rowH = 0.46;
		const sage = HUES.sage;
		const pickX = MX + labelW + 3 * colW;
		k.card(s, { x: pickX + 0.08, y: top - 0.12, w: colW - 0.16, h: headH + rowH * CRITERIA.length + 0.3, line: sage.solid, lineWidth: 1.5 });
		COLUMNS.forEach((c, i) => {
			const x = MX + labelW + i * colW;
			k.text(s, c.name, { x, y: top, w: colW, h: headH - 0.1, fontSize: 13.5, bold: true, align: 'center', valign: 'middle', color: c.pick ? sage.ink : C.ink, lineSpacingMultiple: 1.0 });
		});
		CRITERIA.forEach((label, r) => {
			const y = top + headH + r * rowH;
			k.line(s, { x1: MX, y1: y, x2: MX + labelW + 3 * colW, y2: y, color: C.line, width: 0.75 });
			k.text(s, label, { x: MX, y, w: labelW - 0.2, h: rowH, fontSize: 15, valign: 'middle' });
			COLUMNS.forEach((c, i) => k.mark(s, c.marks[r], { cx: MX + labelW + (i + 0.5) * colW, cy: y + rowH / 2, color: c.pick ? sage.solid : C.ink }));
		});
		const ly = top + headH + rowH * CRITERIA.length + 0.32;
		const legend = [['yes', 'Yes'], ['partly', 'Partly'], ['no', 'No'], ['na', 'Doesn’t apply']];
		let lx = MX;
		for (const [kind, label] of legend) {
			k.mark(s, kind, { cx: lx + 0.1, cy: ly + 0.14, d: 0.18 });
			k.text(s, label, { x: lx + 0.3, y: ly, w: 1.3, h: 0.28, fontSize: 12, color: C.ink2, valign: 'middle' });
			lx += kind === 'na' ? 1.6 : 1.05;
		}
		k.text(s, 'Cadence keeps your data on your computer. What the Guide reads is sent to Claude when you ask.', { x: MX, y: ly + 0.4, w: CW, h: 0.28, fontSize: 11, color: C.ink3, valign: 'middle' });
	},
};

const QUESTIONS = [
	{ q: 'Can it work on your real calendar?', out: 'Period trackers and general chatbots' },
	{ q: 'Does it know your cycle and how you feel?', out: 'Calendar assistants, including Morgen, our first idea' },
	{ q: 'Can it stay private, honest, and under your control?', out: 'Nothing we found did all of that' },
];

const decide = {
	layout: 'content',
	title: 'How we decided',
	notes: `Here's how we actually decided. We asked three questions, in order. First, can it work on your real calendar? That ruled out trackers and chatbots. Second, does it know your cycle and how you feel? That ruled out calendar assistants, including Morgen. Third, can it stay private, honest, and under your control? Nothing we found did all of that. So we built our own agent, and we made those rules part of the design. Vincent will show you what we built.`,
	draw(s, k) {
		const gap = 0.55;
		const w = (CW - 3 * gap) / 4;
		const y = 2.05;
		const h = 3.55;
		QUESTIONS.forEach((item, i) => {
			const x = MX + i * (w + gap);
			k.card(s, { x, y, w, h });
			k.eyebrow(s, `Question ${i + 1}`, null, { x: x + 0.3, y: y + 0.3, w: w - 0.6, fontSize: 10 });
			k.text(s, item.q, { x: x + 0.3, y: y + 0.65, w: w - 0.6, h: 1.15, fontSize: 17, bold: true });
			k.line(s, { x1: x + 0.3, y1: y + 2.12, x2: x + w - 0.3, y2: y + 2.12, color: C.line });
			k.eyebrow(s, i < 2 ? 'Rules out' : 'Off the shelf', 'garnet', { x: x + 0.3, y: y + 2.25, w: w - 0.6, fontSize: 10 });
			k.text(s, item.out, { x: x + 0.3, y: y + 2.55, w: w - 0.6, h: 0.75, fontSize: 14, color: C.ink2 });
			k.line(s, { x1: x + w + 0.12, y1: y + h / 2, x2: x + w + gap - 0.12, y2: y + h / 2, color: C.ink3, width: 1.5, arrow: true });
		});
		const x = MX + 3 * (w + gap);
		const sage = HUES.sage;
		k.card(s, { x, y, w, h, fill: sage.tint, line: sage.solid, lineWidth: 1.5 });
		k.eyebrow(s, 'Our choice', 'sage', { x: x + 0.3, y: y + 0.3, w: w - 0.6, fontSize: 10 });
		k.serif(s, 'Build our own agent', { x: x + 0.3, y: y + 0.65, w: w - 0.6, h: 1.2, fontSize: 34, color: sage.ink });
		k.text(s, 'Claude with six tools we wrote, and the rules built in from day one.', { x: x + 0.3, y: y + 2.1, w: w - 0.6, h: 1.0, fontSize: 14, color: C.ink });
		k.text(s, 'Two of the six needs were deal-breakers: working on your real calendar, and knowing how you feel.', { x: MX, y: 5.9, w: CW, h: 0.4, fontSize: 15, color: C.ink2 });
	},
};

export const options = {
	id: 'options',
	name: 'The options',
	question: 'What could solve it, and how did we choose?',
	hue: 'sage',
	speaker: 'Paetyn',
	target: '2:30',
	dividerNotes: `Thanks, Ingrid. So, what could actually solve this?`,
	slides: [DIVIDER, kinds, compare, decide],
};
