// Builds deck/Cadence-Capstone.pptx and writes docs/SCRIPT.md and docs/REFERENCES.md from the same slide specs,
// so the speaker notes, the script, and the source list never drift apart.
//
//   npm run build

import fs from 'node:fs';
import pptxgen from 'pptxgenjs';
import { C, FONT, HUES, MX, CW, Y, W } from './lib/tokens.mjs';
import { kit } from './lib/draw.mjs';
import { finish } from './lib/finish.mjs';
import { SOURCES } from './lib/sources.mjs';
import { SECTIONS } from './slides/index.mjs';
import { writeScript, writeReferences, seconds, clock } from './lib/docs.mjs';

const OUT = new URL('./Cadence-Capstone.pptx', import.meta.url).pathname;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Ingrid Busby, Paetyn Puff, Tarushv Kosgi, Vincent Friscia, Zykira Peterson';
pres.title = 'Cadence: Your week, in step with your cycle';
pres.subject = 'Purdue CS 110 AI Solutions Showcase';
pres.theme = { headFontFace: FONT.serif, bodyFontFace: FONT.sans };

const footer = { text: { text: 'Cadence  ·  Purdue CS 110 AI Solutions Showcase', options: { x: MX, y: Y.footer, w: 7, h: 0.28, fontFace: FONT.sans, fontSize: 9, color: C.ink3, margin: 0, valign: 'top' } } };
const slideNumber = { x: W - MX - 1, y: Y.footer, w: 1, h: 0.28, fontFace: FONT.sans, fontSize: 9, color: C.ink3, align: 'right', margin: 0 };
const titleBox = (o) => ({ placeholder: { options: { name: 'title', type: 'title', fontFace: FONT.serif, color: C.ink, margin: 0, valign: 'top', align: 'left', ...o }, text: '' } });

pres.defineSlideMaster({ title: 'COVER', background: { color: C.paper }, objects: [titleBox({ x: MX, y: 2.0, w: 6.9, h: 1.7, fontSize: 120 })] });
pres.defineSlideMaster({ title: 'SECTION', background: { color: C.paper }, objects: [footer, titleBox({ x: MX, y: 3.05, w: 6.6, h: 1.0, fontSize: 64 })], slideNumber });
pres.defineSlideMaster({ title: 'CONTENT', background: { color: C.paper }, objects: [footer, titleBox({ x: MX, y: Y.title, w: CW, h: 0.8, fontSize: 40 })], slideNumber });

const k = kit(pres);
const MASTER = { cover: 'COVER', section: 'SECTION', content: 'CONTENT' };
const pad = (n) => String(n).padStart(2, '0');

function drawDivider(s, section) {
	k.eyebrow(s, `Part ${section.n} of ${SECTIONS.length}`, section.hue, { x: MX, y: 2.55, w: 5 });
	s.addText(section.name, { placeholder: 'title' });
	k.text(s, section.question, { x: MX, y: 4.2, w: 6.2, h: 0.9, fontSize: 20, color: C.ink2 });
	k.text(s, `${section.agendaSpeaker ?? section.speaker}  ·  about ${section.target}`, { x: MX, y: 5.35, w: 6, h: 0.3, fontSize: 12, bold: true, color: C.ink3 });
	const cx = 9.55;
	const cy = 3.62;
	k.progressRing(s, { cx, cy, r: 2.0, stroke: 0.3, sections: SECTIONS, current: section.n - 1 });
	k.serif(s, pad(section.n), { x: cx - 1.5, y: cy - 0.95, w: 3, h: 1.7, fontSize: 120, align: 'center', valign: 'middle', color: HUES[section.hue].solid });
}

const plan = [];
for (const section of SECTIONS) {
	pres.addSection({ title: `${pad(section.n)} ${section.name}` });
	for (const spec of section.slides) {
		const slide = spec.divider ? { layout: 'section', title: section.name, notes: section.dividerNotes, speaker: section.speaker, divider: true } : spec;
		const s = pres.addSlide({ masterName: MASTER[slide.layout], sectionTitle: `${pad(section.n)} ${section.name}` });
		if (slide.divider) {
			drawDivider(s, section);
		} else {
			if (slide.layout === 'content') k.eyebrow(s, slide.eyebrow ?? `${pad(section.n)}  ${section.name}`, section.hue, { x: MX, y: Y.eyebrow, w: CW });
			if (slide.title && slide.layout !== 'section') s.addText(slide.title, { placeholder: 'title' });
			slide.draw(s, k, { section, sections: SECTIONS });
			if (slide.sources) k.sourceLine(s, slide.sources, { prefix: slide.sourcePrefix });
		}
		const speaker = slide.speaker ?? section.speaker;
		if (!slide.notes) throw new Error(`Slide "${slide.title}" has no notes`);
		const draftLine = slide.draft ? 'DRAFT. Put this in your own words before you record.\n\n' : '';
		s.addNotes(`${speaker.toUpperCase()}\n\n${draftLine}${slide.notes}`);
		plan.push({ n: plan.length + 1, section, title: slide.title, speaker, notes: slide.notes, film: slide.film, draft: slide.draft, sources: slide.sources ?? [] });
	}
}

for (const key of plan.flatMap((p) => p.sources)) if (!SOURCES[key]) throw new Error(`Unknown source ${key}`);

const raw = await pres.write({ outputType: 'nodebuffer' });
fs.writeFileSync(OUT, await finish(raw, { themeName: 'Cadence' }));
writeScript(plan, SECTIONS, new URL('../docs/SCRIPT.md', import.meta.url).pathname);
writeReferences(SOURCES, new URL('../docs/REFERENCES.md', import.meta.url).pathname);

for (const section of SECTIONS) {
	const slides = plan.filter((p) => p.section === section);
	console.log(`${pad(section.n)} ${section.name.padEnd(14)} ~${clock(seconds(slides))}  target ${section.target}`);
}
console.log(`Total ~${clock(seconds(plan))}`);
console.log(`${plan.length} slides -> ${OUT}`);
