import { C, HUES, MX, CW } from '../lib/tokens.mjs';
import { DIVIDER } from './problem.mjs';

const apricot = HUES.apricot;

const FACTS = [
	['Plans around how you feel', 'A 10-second daily check-in for energy, mood, and symptoms.'],
	['Has a Claude agent', 'Called the Guide. It reads your cycle estimate, calendar, habits, and check-ins.'],
	['You approve every change', 'And your data stays on your computer.'],
];

const meet = {
	layout: 'content',
	title: 'Meet Cadence',
	notes: `This is Cadence. The Today screen shows where you probably are in your cycle, as a range, not a single date. Next to it is a ten-second check-in for energy, mood, and symptoms. And there's the Guide, a Claude agent that reads your data and suggests changes to your week. It fits our audience because it plans around how you feel, it works on your real schedule, and you approve every change.`,
	draw(s, k) {
		k.shot(s, 'today.png', { x: MX, y: 2.0, w: 7.5, h: 4.22, alt: 'The Cadence Today screen: a cycle dial at day 25 of about 28, the next period likely Nov 18 to 22, and the daily check-in.' });
		const x = MX + 7.5 + 0.55;
		const w = MX + CW - x;
		FACTS.forEach(([title, body], i) => {
			const y = 2.15 + i * 1.35;
			k.numDot(s, i + 1, { cx: x + 0.2, cy: y + 0.17, d: 0.4, fill: apricot.solid, fontSize: 12 });
			k.text(s, title, { x: x + 0.6, y, w: w - 0.6, h: 0.36, fontSize: 17, bold: true });
			k.text(s, body, { x: x + 0.6, y: y + 0.42, w: w - 0.6, h: 0.75, fontSize: 14, color: C.ink2 });
		});
	},
};

const STEPS = [
	['You ask', 'In your own words.'],
	['Claude decides', 'It picks a tool, or answers.'],
	['Cadence runs the tool', 'And hands back the result.'],
	['Claude reads it', 'It may call another tool.'],
	['It suggests changes', 'Each with a before and after.'],
	['You decide', 'Only what you approve changes.'],
];

const loop = {
	layout: 'content',
	title: 'An agent uses tools, in a loop',
	sources: ['toolUse', 'toolLoop'],
	sourcePrefix: '“The model can’t run your code, so every tool call is a round trip.”',
	notes: `Here's the idea we had to learn ourselves. A chatbot just answers. An agent can use tools. Claude can't run code on its own, so when it needs your calendar, it asks for a tool by name. Our code runs the tool and hands back the result. Claude reads it and decides what's next, maybe another tool. That repeats until it has enough. Then it drafts suggestions, and you decide. Cadence gives it six tools. Four only read, and two only draft suggestions.`,
	draw(s, k) {
		const y = 2.0;
		const h = 4.2;
		k.card(s, { x: MX, y, w: 3.3, h });
		k.eyebrow(s, 'A chatbot', null, { x: MX + 0.35, y: y + 0.32, w: 2.6 });
		k.pill(s, 'You ask', { x: MX + 0.35, y: y + 0.9, w: 2.6, h: 0.5, fontSize: 14 });
		k.line(s, { x1: MX + 1.65, y1: y + 1.45, x2: MX + 1.65, y2: y + 1.9, color: C.ink3, width: 1.5, arrow: true });
		k.pill(s, 'It answers with text', { x: MX + 0.35, y: y + 1.95, w: 2.6, h: 0.5, fontSize: 14 });
		k.text(s, 'It can’t look anything up or change anything. It only knows what’s in the chat.', { x: MX + 0.35, y: y + 2.75, w: 2.6, h: 1.2, fontSize: 13.5, color: C.ink2 });

		const px = MX + 3.3 + 0.35;
		const pw = MX + CW - px;
		k.card(s, { x: px, y, w: pw, h });
		k.eyebrow(s, 'An agent', 'apricot', { x: px + 0.35, y: y + 0.32, w: 3 });
		const cx = px + 2.1;
		const cy = y + 2.3;
		const r = 1.4;
		s.addShape(k.SH.OVAL, { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, fill: { type: 'none' }, line: { color: C.lineStrong, width: 1.5, dashType: 'dash' } });
		k.ring(s, { cx, cy, r, stroke: 0.05, segments: [{ from: 60, to: 180, color: apricot.solid }], round: false });
		k.serif(s, 'The loop', { x: cx - 0.9, y: cy - 0.42, w: 1.8, h: 0.45, fontSize: 24, align: 'center' });
		k.text(s, 'Steps 2 to 4 repeat until it has enough', { x: cx - 0.8, y: cy + 0.08, w: 1.6, h: 0.5, fontSize: 10.5, color: C.ink2, align: 'center' });
		STEPS.forEach((_, i) => {
			const p = k.onRing(cx, cy, r, i * 60);
			const you = i === 5;
			k.numDot(s, i + 1, { cx: p.x, cy: p.y, d: 0.46, fill: you ? apricot.solid : C.card, color: you ? C.card : C.ink, line: you ? null : C.lineStrong, fontSize: 13 });
		});
		const lx = cx + r + 0.75;
		const lw = px + pw - 0.3 - lx;
		STEPS.forEach(([title, body], i) => {
			const ly = y + 0.32 + i * 0.62;
			k.text(s, String(i + 1), { x: lx, y: ly, w: 0.3, h: 0.3, fontSize: 13, bold: true, color: i === 5 ? apricot.ink : C.ink3 });
			k.text(s, title, { x: lx + 0.32, y: ly, w: lw - 0.32, h: 0.3, fontSize: 14, bold: true });
			k.text(s, body, { x: lx + 0.32, y: ly + 0.27, w: lw - 0.32, h: 0.3, fontSize: 12, color: C.ink2 });
		});
	},
};

const FLOW = [
	['Suggest', 'The agent drafts a before and after.'],
	['Review', 'You see its reason, from your own logs.'],
	['Approve', 'Or decline. Only approval changes the plan.'],
	['Undo', 'Changed your mind? Reverse it.'],
];

const approve = {
	layout: 'content',
	title: 'Nothing changes until you approve',
	notes: `This is the rule we cared about most. Nothing changes until you approve it. Each suggestion shows a before and after, and a reason from your own logs. You approve or decline it, and you can undo it later. This isn't just in the prompt. It's in the code. The agent can't write to your data, fixed events like exams can't move, and our recording script checks these rules every run.`,
	draw(s, k) {
		const gap = 0.5;
		const w = (CW - 3 * gap) / 4;
		FLOW.forEach(([title, body], i) => {
			const x = MX + i * (w + gap);
			k.card(s, { x, y: 2.0, w, h: 1.3, shadow: 0.6 });
			k.numDot(s, i + 1, { cx: x + 0.42, cy: 2.42, d: 0.38, fill: apricot.solid, fontSize: 12 });
			k.text(s, title, { x: x + 0.75, y: 2.27, w: w - 0.95, h: 0.32, fontSize: 15, bold: true });
			k.text(s, body, { x: x + 0.3, y: 2.72, w: w - 0.5, h: 0.5, fontSize: 12, color: C.ink2 });
			if (i < 3) k.line(s, { x1: x + w + 0.1, y1: 2.65, x2: x + w + gap - 0.1, y2: 2.65, color: C.ink3, width: 1.5, arrow: true });
		});

		const cx = MX;
		const cy = 3.95;
		const cw = 6.75;
		k.eyebrow(s, 'A real suggestion from our recorded demo', null, { x: cx, y: 3.62, w: cw, fontSize: 10 });
		k.card(s, { x: cx, y: cy, w: cw, h: 2.4 });
		k.text(s, 'Lighten HIIT class', { x: cx + 0.35, y: cy + 0.22, w: cw - 0.7, h: 0.32, fontSize: 15, bold: true });
		k.text(s, [{ text: 'HIIT class, demanding', options: { strike: 'sngStrike' } }], { x: cx + 0.35, y: cy + 0.58, w: cw - 0.7, h: 0.26, fontSize: 12.5, color: C.ink3 });
		k.text(s, '→  Easy walk or yoga (HIIT if you feel up to it), light', { x: cx + 0.35, y: cy + 0.86, w: cw - 0.7, h: 0.26, fontSize: 12.5, bold: true });
		k.text(s, 'Wednesday is likely around day 27, when you’ve logged energy 2 and headaches. Try a gentler default and keep HIIT as your call on the day.', { x: cx + 0.35, y: cy + 1.2, w: cw - 0.7, h: 0.55, fontSize: 12.5, color: C.ink2 });
		k.text(s, '×  Decline', { x: cx + 0.35, y: cy + 1.85, w: 1.2, h: 0.36, fontSize: 13, bold: true, valign: 'middle' });
		k.pill(s, '✓  Approve', { x: cx + 1.6, y: cy + 1.85, w: 1.35, h: 0.36, fill: HUES.plum.solid, color: C.card, fontSize: 13 });

		const rx = cx + cw + 0.6;
		const rw = MX + CW - rx;
		k.eyebrow(s, 'Enforced in code, not just the prompt', 'apricot', { x: rx, y: 3.62, w: rw, fontSize: 10 });
		const rules = ['The agent has no way to write to your data.', 'Classes, exams, shifts, and deadlines can’t be moved.', 'Our recording script checks these rules on every run.'];
		rules.forEach((rule, i) => {
			const y = cy + 0.15 + i * 0.72;
			k.disc(s, { cx: rx + 0.08, cy: y + 0.15, d: 0.1, fill: apricot.solid });
			k.text(s, rule, { x: rx + 0.3, y, w: rw - 0.3, h: 0.62, fontSize: 14 });
		});
	},
};

const STACK = [
	['The model', 'Claude Opus 5.5', 'Runs the Guide. Sonnet 5.5 is an option in Settings.'],
	['The agent loop', 'Claude Agent SDK', 'The Claude Code agent loop, as a library. Runs on your Claude Code login.'],
	['The tools', 'Six custom tools', 'Four read your data. Two draft suggestions. Built-in tools are off.'],
	['The app', 'React and Vite', 'A local web app. Your data stays in your browser.'],
	['The demo film', 'Remotion', 'We made the demo film in code.'],
	['How we built it', 'Claude Code', 'We used Claude Code to help us write and test the app.'],
];

const stack = {
	layout: 'content',
	title: 'What we built it with',
	sources: ['agentSdk'],
	notes: `Here's what we built it with. The model is Claude Opus 5.5. The Claude Agent SDK runs the agent loop. It's the loop from Claude Code, packaged as a library. We wrote six custom tools. The app is React and Vite, and we made the demo film in code with Remotion. To be upfront, we also used Claude Code to help us write and test the app. Tarushv will show you how it works.`,
	draw(s, k) {
		const w = (CW - 0.6) / 3;
		const h = 2.0;
		STACK.forEach(([role, name, body], i) => {
			const x = MX + (i % 3) * (w + 0.3);
			const y = 2.0 + Math.floor(i / 3) * (h + 0.3);
			const note = i === 5;
			k.card(s, { x, y, w, h, fill: note ? C.sunken : C.card, line: note ? null : C.line, shadow: note ? false : 1 });
			k.eyebrow(s, role, note ? null : 'apricot', { x: x + 0.35, y: y + 0.28, w: w - 0.7, fontSize: 10 });
			k.serif(s, name, { x: x + 0.35, y: y + 0.58, w: w - 0.7, h: 0.55, fontSize: 30 });
			k.text(s, body, { x: x + 0.35, y: y + 1.15, w: w - 0.7, h: 0.7, fontSize: 13, color: C.ink2 });
		});
	},
};

export const solution = {
	id: 'solution',
	name: 'Our solution',
	question: 'What did we build, and why does it fit?',
	hue: 'apricot',
	speaker: 'Vincent',
	target: '2:00',
	dividerNotes: `Thanks, Paetyn. Here's what we built, and why it fits.`,
	slides: [DIVIDER, meet, loop, approve, stack],
};
