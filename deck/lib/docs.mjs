import fs from 'node:fs';

const WPM = 140;
const FILM_SECONDS = 240;
const pad = (n) => String(n).padStart(2, '0');
export const clock = (secs) => `${Math.floor(secs / 60)}:${pad(Math.round(secs % 60))}`;
const spoken = (notes) => notes.split('\n').filter((l) => !l.startsWith('['));
const words = (notes) => spoken(notes).join(' ').split(/\s+/).filter(Boolean).length;
export const seconds = (slides) => slides.reduce((t, p) => t + (words(p.notes) / WPM) * 60 + (p.film ? FILM_SECONDS : 0), 0);

function speakersOf(slides) {
	return [...new Set(slides.map((p) => p.speaker))];
}

const straight = (s) => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');

function notesToMarkdown(p) {
	let labelled = false;
	return p.notes
		.split('\n\n')
		.map((block) => {
			if (block.startsWith('[')) return '> **Film plays here, 3:37.** Film narration: see `video/NARRATION.md`.';
			const label = labelled ? '' : `**${p.speaker}:** `;
			labelled = true;
			return label + block;
		})
		.join('\n\n');
}

export function writeScript(plan, sections, path) {
	const rows = sections.map((section) => {
		const slides = plan.filter((p) => p.section === section);
		const who = speakersOf(slides);
		return `| ${section.n}. ${section.name} | ${slides[0].n} to ${slides.at(-1).n} | ${who.length > 2 ? 'All five, one slide each' : who.join(', ')} | ${section.target} | ${clock(seconds(slides))} |`;
	});
	const total = seconds(plan);

	const body = sections.map((section) => {
		const slides = plan.filter((p) => p.section === section);
		const head = [`## ${section.n}. ${section.name}`, '', `${speakersOf(slides).length > 2 ? 'All five of us' : speakersOf(slides).join(', ')}. Target ${section.target}. This script runs about ${clock(seconds(slides))}.`];
		if (section.draft) head.push('', '> Draft. These are first drafts in our voice, built from what really happened on this project. Each speaker should put their part in their own words before we record.');
		if (section.scriptNote) head.push('', `> ${section.scriptNote}`);
		const parts = slides.map((p) => `### Slide ${p.n}. ${straight(p.title)}\n\n${p.draft ? '> Draft. Put this in your own words.\n\n' : ''}${notesToMarkdown(p)}`);
		return [...head, '', ...parts.flatMap((x) => [x, ''])].join('\n');
	});

	const md = [
		'# Cadence: speaking script',
		'',
		'Purdue CS 110 AI Solutions Showcase. The talk runs about 17 minutes, including the 4-minute demo film.',
		'',
		'The speaker notes in `deck/Cadence-Capstone.pptx` hold the same words as this script. Slide numbers match the deck. Times assume about 140 words a minute, an easy speaking pace.',
		'',
		'This file is generated. To change the words in both places at once, edit `deck/slides/` and run `npm run build` in `deck/`.',
		'',
		'## Who says what',
		'',
		'This split is a suggestion. Swap parts if it suits the team better.',
		'',
		'| Part | Slides | Speaker | Target | Script at 140 wpm |',
		'| --- | --- | --- | --- | --- |',
		...rows,
		`| Total | 1 to ${plan.length} | | 17:00 | ${clock(total)} |`,
		'',
		...body,
	].join('\n');
	fs.writeFileSync(path, straight(md).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
}

const GROUPS = [
	{ name: 'Menstrual cycle research', keys: ['jang2025', 'ronca2024', 'colenso2023', 'mcnulty2020', 'liguori2023', 'bull2019', 'acog2015', 'worsfold2021', 'johnson2018'] },
	{ name: 'Privacy', keys: ['flo2021'] },
	{ name: 'How the AI works', keys: ['toolUse', 'toolLoop', 'agentSdk'] },
];

function entry(s) {
	const parts = [`${s.authors} (${s.year}).`];
	if (s.title) parts.push(`${s.title}.`);
	parts.push(`*${s.venue}.*`);
	parts.push(s.url ? `<${s.url}>` : 'Named in our verified source list without an opened link, so we cite it by name only.');
	return parts.join(' ');
}

export function writeReferences(sources, path) {
	const allKeys = GROUPS.flatMap((g) => g.keys);
	const missing = Object.keys(sources).filter((k) => !allKeys.includes(k));
	if (missing.length) throw new Error(`Sources not grouped in docs.mjs: ${missing.join(', ')}`);
	const md = [
		'# References',
		'',
		'These are the sources the deck and the script cite. Every one comes from our verified source list, where a team member opened each source and checked the claim against it.',
		'',
		...GROUPS.flatMap((g) => [`## ${g.name}`, '', ...g.keys.flatMap((k) => [`1. ${entry(sources[k])}`, `   What we used it for: ${sources[k].used}`]), '']),
		'## Cadence itself',
		'',
		'Claims about how Cadence works come from the app’s own code and docs in this repository:',
		'',
		'- `README.md` describes how to run the app, the agent loop, the six tools, and the safety rules enforced in code.',
		'- `src/agent/systemPrompt.ts` is the agent’s full system prompt. The **Settings** screen shows it word for word.',
		'- `src/content/evidence.ts` holds every claim on the **Learn** screen, with its evidence label and source.',
		'- `scripts/record-flows.ts` records the demo flows and checks the approval rules on every run.',
		'',
	].join('\n');
	fs.writeFileSync(path, straight(md));
}
