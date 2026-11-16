import { C, HUES, MX, CW, col } from '../lib/tokens.mjs';

export const DIVIDER = { divider: true };

const TEAM = 'Ingrid Busby  ·  Paetyn Puff  ·  Tarushv Kosgi  ·  Vincent Friscia  ·  Zykira Peterson';

const cover = {
	layout: 'cover',
	title: 'Cadence',
	notes: `Hi everyone. We're Ingrid, Paetyn, Tarushv, Vincent, and Zykira, and this is Cadence. It's a week planner with an AI agent inside. It helps you plan your week around how you actually feel across your menstrual cycle. The agent suggests changes to your calendar, but it never makes them by itself. You decide.`,
	draw(s, k) {
		k.eyebrow(s, 'Purdue CS 110  ·  AI Solutions Showcase', null, { x: MX, y: 1.55, w: 6.5 });
		k.serif(s, 'Your week, in step with your cycle.', { x: MX, y: 3.95, w: 6.6, h: 0.65, fontSize: 32, italic: true, color: C.ink2 });
		k.text(s, 'A week planner with a Claude agent inside. It suggests changes. You decide.', { x: MX, y: 4.85, w: 5.9, h: 0.75, fontSize: 17, color: C.ink2 });
		k.text(s, TEAM, { x: MX, y: 6.35, w: 7.6, h: 0.3, fontSize: 12, color: C.ink3 });
		k.brandRing(s, { cx: 10.05, cy: 3.75, r: 2.3, stroke: 0.4, dotDeg: 0 });
	},
};

const agenda = {
	layout: 'content',
	eyebrow: 'The plan',
	title: 'Six parts, about 18 minutes',
	notes: `Here's the plan. Six parts, one speaker each, and the demo includes a short film.`,
	draw(s, k, { sections }) {
		const top = 2.05;
		const rowH = 0.64;
		const axisX = 6.85;
		const axisW = MX + CW - axisX;
		const perMin = axisW / 18;
		const minutes = (t) => {
			const [m, sec] = t.split(':').map(Number);
			return m + sec / 60;
		};
		for (const m of [0, 5, 10, 15]) {
			const x = axisX + m * perMin;
			k.line(s, { x1: x, y1: top - 0.05, x2: x, y2: top + rowH * sections.length, color: C.line, width: 0.75, dash: 'dash' });
			k.text(s, `${m} min`, { x: x - 0.4, y: top + rowH * sections.length + 0.08, w: 0.8, h: 0.25, fontSize: 10, color: C.ink3, align: 'center' });
		}
		let start = 0;
		sections.forEach((sec, i) => {
			const y = top + i * rowH;
			const hue = HUES[sec.hue];
			if (i > 0) k.line(s, { x1: MX, y1: y, x2: axisX - 0.25, y2: y, color: C.line, width: 0.75 });
			k.serif(s, String(sec.n).padStart(2, '0'), { x: MX, y: y + 0.1, w: 0.6, h: 0.45, fontSize: 24, color: hue.solid });
			k.text(s, sec.name, { x: MX + 0.7, y: y + 0.17, w: 2.9, h: 0.32, fontSize: 16, bold: true });
			k.text(s, sec.agendaSpeaker ?? sec.speaker, { x: MX + 3.6, y: y + 0.19, w: 1.75, h: 0.3, fontSize: 13, color: C.ink2 });
			k.text(s, sec.target, { x: MX + 5.25, y: y + 0.19, w: 0.6, h: 0.3, fontSize: 13, color: C.ink3, align: 'right' });
			const len = minutes(sec.target);
			s.addShape(k.SH.ROUNDED_RECTANGLE, { x: axisX + start * perMin + 0.03, y: y + 0.24, w: len * perMin - 0.06, h: 0.2, rectRadius: 0.1, fill: { color: hue.solid }, line: { type: 'none' } });
			start += len;
		});
		k.text(s, 'The demo includes a 4:24 film.', { x: axisX, y: top + rowH * sections.length + 0.45, w: axisW, h: 0.3, fontSize: 11, color: C.ink3, align: 'right' });
	},
};

const idea = {
	layout: 'content',
	title: 'The idea we started with',
	notes: `This was our project proposal, word for word. Sync your daily habits to the phases of your cycle. It's a popular idea online. Our proposal assumed your phase changes how well you think and perform. So before we built anything, we checked the research.`,
	draw(s, k) {
		k.card(s, { x: MX, y: 2.0, w: 7.3, h: 3.3 });
		k.eyebrow(s, 'Our proposal’s title, word for word', null, { x: MX + 0.5, y: 2.45, w: 6.3 });
		k.serif(s, '“A guide for women on how to sync daily habits to phases of their hormonal cycle.”', { x: MX + 0.5, y: 2.95, w: 6.3, h: 2.4, fontSize: 36, italic: true });
		const right = col(8, 4);
		k.text(s, 'It’s a popular idea online. Our proposal assumed your phase changes how well you think and perform.', { ...right, y: 2.1, h: 1.6, fontSize: 18, color: C.ink2 });
		k.serif(s, 'So before we built anything, we checked the research.', { ...right, y: 3.95, h: 1.5, fontSize: 32 });
	},
};

function researchCard(s, k, { x, w, hue, label, big, lead, detail }) {
	const y = 2.0;
	k.card(s, { x, y, w, h: 4.2 });
	k.eyebrow(s, label, hue, { x: x + 0.45, y: y + 0.42, w: w - 0.9 });
	k.serif(s, big, { x: x + 0.45, y: y + 0.82, w: w - 0.9, h: 0.95, fontSize: 64, color: HUES[hue].solid });
	k.text(s, lead, { x: x + 0.45, y: y + 1.85, w: w - 0.9, h: 1.0, fontSize: 18 });
	k.line(s, { x1: x + 0.45, y1: y + 3.0, x2: x + w - 0.45, y2: y + 3.0, color: C.line });
	k.text(s, detail, { x: x + 0.45, y: y + 3.2, w: w - 0.9, h: 0.85, fontSize: 15, color: C.ink2 });
}

const research = {
	layout: 'content',
	title: 'What the research says',
	sources: ['jang2025', 'colenso2023', 'mcnulty2020', 'liguori2023', 'ronca2024'],
	notes: `A 2025 meta-analysis of 102 studies, with almost 4,000 people, found no measurable change in thinking, memory, or focus across the cycle. For exercise, any effect is tiny, and planning training by phase isn't backed by evidence.\n\nBut how people feel is real. Up to about 75 percent report at least one symptom before their period. And many feel worst during their period, even when their measured performance holds steady.`,
	draw(s, k) {
		const half = (CW - 0.3) / 2;
		researchCard(s, k, { x: MX, w: half, hue: 'sage', label: 'What doesn’t change', big: '102 studies', lead: 'found no measurable change in thinking, memory, or focus across the cycle.', detail: 'Planning workouts by phase isn’t backed by evidence. Any effect on exercise is tiny.' });
		researchCard(s, k, { x: MX + half + 0.3, w: half, hue: 'garnet', label: 'What can change', big: 'Up to 75%', lead: 'of people report at least one premenstrual symptom.', detail: 'Many feel worst on their period, even when their measured performance holds steady.' });
	},
};

const stance = {
	layout: 'content',
	title: 'So we changed the premise',
	notes: `So we changed the premise. Your phase doesn't change what you're capable of. How you feel can change, and that's different for everyone. So Cadence plans around what you log, like energy, mood, and symptoms. Your phase is only a hint about when those feelings might show up.`,
	draw(s, k) {
		k.serif(s, 'Your phase doesn’t change what you’re capable of.', { x: MX, y: 2.05, w: 7.0, h: 1.9, fontSize: 52 });
		k.text(s, 'How you feel can change, and it’s different for everyone. So Cadence plans around what you log, and treats your phase as a hint, not a rule.', { x: MX, y: 4.25, w: 6.5, h: 1.5, fontSize: 20, color: C.ink2 });
		const x = 8.35;
		const w = MX + CW - x;
		k.card(s, { x, y: 2.05, w, h: 4.1 });
		const g = HUES.garnet;
		s.addShape(k.SH.ROUNDED_RECTANGLE, { x: x + 0.35, y: 2.4, w: w - 0.7, h: 1.5, rectRadius: 0.1, fill: { color: g.tint }, line: { type: 'none' } });
		k.eyebrow(s, 'From your own check-ins', 'garnet', { x: x + 0.6, y: 2.58, w: w - 1.2, fontSize: 10 });
		k.text(s, 'You’ve logged cramps and energy 2 of 5 on the first days of your period.', { x: x + 0.6, y: 2.95, w: w - 1.2, h: 0.85, fontSize: 14 });
		k.eyebrow(s, 'So Cadence suggests', null, { x: x + 0.35, y: 4.15, w: w - 0.7, fontSize: 10 });
		k.text(s, 'A quiet hour with a heat pad after Friday’s shift.', { x: x + 0.35, y: 4.48, w: w - 0.7, h: 0.7, fontSize: 16, bold: true });
		k.serif(s, 'The reason is how you feel, never what you can do.', { x: x + 0.35, y: 5.3, w: w - 0.7, h: 0.65, fontSize: 19, italic: true, color: C.ink2 });
	},
};

const cycles = {
	layout: 'content',
	title: 'Cycles vary more than apps assume',
	sources: ['acog2015', 'bull2019', 'worsfold2021', 'johnson2018'],
	notes: `There's a second problem. Cycles are less regular than apps assume. Only 13 percent are exactly 28 days. In the first few years after a first period, anything from 21 to 45 days is common, and that matters for our age group. And calendar-only apps get the exact ovulation day right just 8 to 21 percent of the time. So every prediction needs a range.`,
	draw(s, k) {
		const x0 = MX + 2.75;
		const chartW = 7.35 - x0 + MX;
		const perDay = chartW / 26;
		const xd = (d) => x0 + (d - 20) * perDay;
		const g = HUES.garnet;
		const bar = (y, from, to, label, sub, range, outside) => {
			k.text(s, label, { x: MX, y: y - 0.02, w: 2.6, h: 0.3, fontSize: 14, bold: true });
			k.text(s, sub, { x: MX, y: y + 0.27, w: 2.6, h: 0.3, fontSize: 13, color: C.ink2 });
			s.addShape(k.SH.ROUNDED_RECTANGLE, { x: xd(from), y, w: (to - from) * perDay, h: 0.52, rectRadius: 0.26, fill: { color: g.tint }, line: { color: g.solid, width: 1.25 } });
			const labelBox = outside ? { x: xd(to) + 0.15, w: 1.5, align: 'left' } : { x: xd(from) + 0.2, w: (to - from) * perDay - 0.4, align: 'right' };
			k.text(s, range, { ...labelBox, y, h: 0.52, fontSize: 13, bold: true, color: g.ink, valign: 'middle' });
		};
		bar(2.45, 21, 35, 'Adults', 'Typical range', '21 to 35 days', true);
		bar(3.55, 21, 45, 'First few years', 'After a first period', '21 to 45 days');
		k.line(s, { x1: xd(28), y1: 2.2, x2: xd(28), y2: 4.35, color: C.ink, width: 1.25, dash: 'dash' });
		k.text(s, '28 days', { x: xd(28) - 0.6, y: 4.45, w: 1.2, h: 0.3, fontSize: 13, bold: true, align: 'center' });
		k.text(s, 'That\u2019s why Cadence shows its predictions as ranges.', { x: MX, y: 5.35, w: 6.6, h: 0.35, fontSize: 15, color: C.ink2 });

		const r = col(8, 4);
		k.serif(s, '13%', { ...r, y: 1.95, h: 1.0, fontSize: 72, color: g.solid });
		k.text(s, 'of cycles are exactly 28 days long.', { ...r, y: 3.0, h: 0.6, fontSize: 17 });
		k.line(s, { x1: r.x, y1: 3.85, x2: r.x + r.w, y2: 3.85, color: C.line });
		k.serif(s, '8 to 21%', { ...r, y: 4.0, h: 1.0, fontSize: 72, color: g.solid });
		k.text(s, 'of calendar-only predictions get the exact ovulation day right.', { ...r, y: 5.05, h: 0.85, fontSize: 17 });
	},
};

const NEEDS = [
	['Knows them', 'A plan built on how they actually feel.'],
	['Plans their real week', 'Works on their calendar, not generic tips.'],
	['Keeps data private', 'Cycle data is health data.'],
	['Honest about evidence', 'Clear about what science does and doesn’t show.'],
	['Shows its work', 'They can see what the AI did, and why.'],
	['Low cost and effort', 'Cheap to run and quick to use.'],
];

const audience = {
	layout: 'content',
	title: 'Who it’s for, and what they need',
	notes: `So who is it for? Women aged 17 to 25, mostly students with busy weeks. They've used chatbots, but most don't know how AI systems work. They need six things. A plan built on how they actually feel. Help with their actual schedule. Privacy. Honesty about the science. A way to see what the AI did. And low cost and effort. Paetyn will use those six needs to compare our options.`,
	draw(s, k) {
		k.card(s, { x: MX, y: 2.0, w: 4.25, h: 4.3 });
		k.eyebrow(s, 'The audience', 'garnet', { x: MX + 0.4, y: 2.38, w: 3.4 });
		k.serif(s, 'Women, 17 to 25', { x: MX + 0.4, y: 2.75, w: 3.5, h: 0.7, fontSize: 38 });
		const facts = ['Mostly students with weeks full of classes, shifts, and exams', 'Comfortable with chatbots and basic prompting', 'New to how AI systems work under the hood'];
		facts.forEach((f, i) => {
			const y = 3.75 + i * 0.8;
			k.disc(s, { cx: MX + 0.5, cy: y + 0.14, d: 0.1, fill: HUES.garnet.solid });
			k.text(s, f, { x: MX + 0.72, y, w: 3.25, h: 0.7, fontSize: 14, color: C.ink2 });
		});
		const gx = MX + 4.25 + 0.45;
		const gw = MX + CW - gx;
		k.eyebrow(s, 'What they need', null, { x: gx, y: 2.0, w: gw });
		const tw = (gw - 0.3) / 2;
		NEEDS.forEach(([title, body], i) => {
			const x = gx + (i % 2) * (tw + 0.3);
			const y = 2.4 + Math.floor(i / 2) * 1.32;
			k.card(s, { x, y, w: tw, h: 1.15, shadow: 0.6 });
			k.numDot(s, i + 1, { cx: x + 0.38, cy: y + 0.4, d: 0.36, fill: C.ink, fontSize: 11 });
			k.text(s, title, { x: x + 0.7, y: y + 0.24, w: tw - 0.85, h: 0.32, fontSize: 14, bold: true });
			k.text(s, body, { x: x + 0.7, y: y + 0.58, w: tw - 0.85, h: 0.5, fontSize: 12.5, color: C.ink2 });
		});
	},
};

export const problem = {
	id: 'problem',
	name: 'The problem',
	question: 'What are we solving, and for whom?',
	hue: 'garnet',
	speaker: 'Ingrid',
	target: '2:30',
	dividerNotes: `Let's start with the problem we set out to solve.`,
	slides: [cover, agenda, DIVIDER, idea, research, stance, cycles, audience],
};
