import voice from './data/voice.json';

/**
 * The film's single source of timing. Every line of the narration is its own verified take
 * (`src/data/voice.json`, made by `npm run voice` from `voice/script.ts`), so each line lasts as long
 * as it is spoken. Between lines the film leaves a set silence, longer where a new beat starts, plus
 * any `hold` the picture needs. Scenes, captions, the audio mix, NARRATION.md and the music cue sheet
 * all read this file.
 */

export const FPS = 30;

type VoiceWord = { readonly w: string; readonly at: number; readonly end: number };
type VoiceLine = {
  readonly id: string;
  readonly n: number;
  readonly caption: string;
  readonly file: string;
  readonly length: number;
  /** Where the words start and stop inside the take, in seconds. */
  readonly speech: readonly number[];
  readonly words: readonly VoiceWord[];
};

export type Chapter = { readonly id: string; readonly step: number | null; readonly name: string };

export const CHAPTERS: readonly Chapter[] = [
  { id: 'title', step: null, name: 'Cadence' },
  { id: 'idea', step: null, name: 'The idea' },
  { id: 'setup', step: 1, name: 'Set up' },
  { id: 'today', step: 2, name: 'Read your day' },
  { id: 'guide', step: 3, name: 'Ask the Guide' },
  { id: 'decide', step: 4, name: 'You decide' },
  { id: 'rough', step: 5, name: 'A rough morning' },
  { id: 'safety', step: 6, name: 'Know the limits' },
  { id: 'inside', step: 7, name: 'See inside' },
  { id: 'end', step: null, name: 'Remember' },
];

/** Silence between the words of two lines (seconds): inside a beat, and before a line that starts a new one. */
const GAP = 0.42;
const BREATH = 1.05;

/**
 * What the picture does under each line. `lead` is time before the words (a chapter's first line
 * includes its title card), `hold` is time after them for the picture to be read, and `beat` marks a
 * line that starts a new thought, so a breath comes before it.
 */
type Picture = { readonly does: string; readonly lead?: number; readonly hold?: number; readonly beat?: boolean };
const PICTURE: Record<string, Picture> = {
  'title.1': { does: 'The cycle ring draws itself and becomes the Cadence wordmark.', lead: 1.3 },
  'title.2': { does: 'Tagline: "Your week, in step with your cycle."', hold: 0.2 },
  'title.3': { does: 'Two quiet facts under the tagline: for women around 17 to 25, and it runs in the browser.', hold: 0.9 },
  'idea.1': { does: 'What we assumed, set as a quotation: "The cycle changes how well you think."', lead: 0.5 },
  'idea.2': { does: 'A pen line strikes the assumption out, marked "Not what the research found".', hold: 0.3 },
  'idea.3': { does: '"102 studies": no robust change in cognitive performance. Source: Jang et al., PLOS ONE, 2025.', beat: true, hold: 0.7 },
  'idea.4': { does: 'What can change: how you feel, and it differs from person to person.', beat: true },
  'idea.5': { does: '"So Cadence plans around what you log." Your phase is a hint.', hold: 1.2 },
  'setup.1': { does: 'Step 1 title, which shrinks into the step chip. The phone, on onboarding.', lead: 0.4 },
  'setup.2': { does: 'Onboarding: the last period date is typed; cycle length and regularity are pointed out.', hold: 0.2 },
  'setup.3': { does: 'Continue. The four promises.', beat: true },
  'setup.4': { does: 'The camera walks down the promises as each is named.', hold: 0.2 },
  'setup.5': { does: 'The fourth promise: estimates, never for birth control.', hold: 0.3 },
  'setup.6': { does: 'I understand. The start choices; "Start with a sample week" is tapped.', beat: true, hold: 0.6 },
  'today.1': { does: 'Step 2, on the phone. Today: the dial sweeps to day 25.', lead: 0.4 },
  'today.2': { does: 'Push in on the dial: day 25 of about 28.' },
  'today.3': { does: 'The predicted range, Nov 18 to 22.' },
  'today.4': { does: '"A range, not a date", and a source line: Bull et al., npj Digital Medicine, 2019.', hold: 0.6 },
  'today.5': { does: 'How sure it is; the label is tapped and its reasons open.', hold: 0.7 },
  'today.6': { does: 'The check-in: energy, mood and symptoms pointed out in turn.', beat: true },
  'today.7': { does: 'Hold on the check-in.', hold: 0.6 },
  'guide.1': { does: 'Step 3, on the phone. The Guide.', lead: 0.4 },
  'guide.2': { does: 'The starter "Plan my week around my cycle" is tapped.', hold: 0.4 },
  'guide.3': { does: 'Diagram: the model, Claude, a large language model.', beat: true },
  'guide.4': { does: 'A plain chatbot: your message in, an answer out. It sees only what you type.', hold: 0.3 },
  'guide.5': { does: 'An agent: the same model, now with tools around it.' },
  'guide.6': { does: 'A tool opens into a few lines of real code.', hold: 0.2 },
  'guide.7': { does: 'The calendar tool: list_events, and what it returns.', hold: 0.3 },
  'guide.8': { does: 'The loop: decide, call a tool, read the result, repeat, then propose.', hold: 1.0 },
  'guide.9': { does: 'Back on the phone: four tool calls tick in, each named beside the phone as it lands.', beat: true, hold: 0.3 },
  'guide.10': { does: 'What goes to Claude: the four results travel to Claude, only because you asked.', hold: 0.5 },
  'guide.11': { does: 'Two drafts come back "adjusted"; the tool caught them and the model fixed them.', beat: true, hold: 0.7 },
  'guide.12': { does: 'Five suggestions arrive.' },
  'guide.13': { does: 'The first suggestion\'s reason, "around day 27", highlighted. Then the phone hands over to the laptop.', hold: 1.0 },
  'decide.1': { does: 'Step 4, on the laptop. The suggestions.', lead: 0.5 },
  'decide.2': { does: 'Push in on what changes and why.', hold: 0.3 },
  'decide.3': { does: 'Approve, approve, decline, then undo one approval, each labelled as it happens.', beat: true, hold: 1.9 },
  'decide.4': { does: 'The Plan: a dashed block for what is still waiting.', beat: true, hold: 0.3 },
  'decide.5': { does: 'The lock icons on a class, a shift and the midterm.', hold: 0.6 },
  'decide.6': { does: 'The bar: nothing changes until you approve.', hold: 0.9 },
  'rough.1': { does: 'Step 5, on the phone.', lead: 0.4 },
  'rough.2': { does: 'Thursday, day 1 of a period, midterm tonight.', hold: 0.2 },
  'rough.3': { does: 'Low, Flat, cramps, Save check-in, each a tap.', hold: 0.6 },
  'rough.4': { does: 'The Guide; "Today feels rough" is asked.', hold: 0.3 },
  'rough.5': { does: 'Three changes for today only; the midterm stays put.', hold: 1.0 },
  'safety.1': { does: 'Step 6, on the phone. The Guide.', lead: 0.4 },
  'safety.2': { does: 'The question about bad cramps is sent.', hold: 0.5 },
  'safety.3': { does: 'The reply arrives: no diagnosis.', hold: 0.3 },
  'safety.4': { does: '"Worth getting checked by a doctor" and the urgent care line, highlighted.', hold: 0.9 },
  'safety.5': { does: 'Yes please. The appointment notes, drafted from the check-ins.', beat: true, hold: 1.8 },
  'inside.1': { does: 'Step 7, on the laptop. Learn.', lead: 0.4 },
  'inside.2': { does: 'The three evidence labels, named in turn, then a claim with its source.', hold: 1.6 },
  'inside.3': { does: 'Settings: the whole system prompt, word for word.', hold: 1.2 },
  'end.1': { does: 'The ring returns. "Three things to remember."', lead: 0.5 },
  'end.2': { does: 'One: it plans around how you feel, not your phase.' },
  'end.3': { does: 'Two: the AI suggests, you decide.' },
  'end.4': { does: 'Three: it knows when to send you to a clinician.', hold: 0.4 },
  'end.5': { does: 'github.com/tarushvkodes/cadence', beat: true, hold: 0.5 },
  'end.6': { does: 'Up next: the ethics behind it.', beat: true, hold: 3.2 },
};

export type TimedLine = VoiceLine & {
  readonly chapter: string;
  readonly does: string;
  /** Film frame where the take starts playing. */
  readonly from: number;
  /** Film frame where its words end. */
  readonly end: number;
  /** Film frame where the next line's take (or the film's end) starts. */
  readonly next: number;
};
export type TimedChapter = Chapter & { readonly from: number; readonly end: number; readonly lines: readonly TimedLine[] };

const sec = (s: number) => Math.round(s * FPS);

function schedule() {
  const lines = (voice.lines as VoiceLine[]).map((l) => {
    const pic = PICTURE[l.id];
    if (!pic) throw new Error(`no picture notes for ${l.id}`);
    return { ...l, pic, chapter: l.id.split('.')[0] as string };
  });
  const missing = Object.keys(PICTURE).filter((id) => !lines.some((l) => l.id === id));
  if (missing.length) throw new Error(`picture notes for missing lines: ${missing.join(', ')}`);

  let wordsEnd = 0;
  const timed: TimedLine[] = [];
  lines.forEach((l, i) => {
    const prev = lines[i - 1];
    const [speechStart = 0, speechEnd = l.length] = l.speech;
    const silence = !prev ? 0 : prev.chapter !== l.chapter || l.pic.beat ? BREATH : GAP;
    const wordsStart = wordsEnd + silence + (prev?.pic.hold ?? 0) + (l.pic.lead ?? 0);
    const from = sec(wordsStart - speechStart);
    wordsEnd = (from + sec(speechEnd)) / FPS;
    timed.push({ ...l, does: l.pic.does, from, end: sec(wordsEnd), next: 0 });
  });
  const total = sec(wordsEnd + (lines.at(-1)?.pic.hold ?? 0));
  const withNext = timed.map((l, i) => ({ ...l, next: timed[i + 1]?.from ?? total }));

  const chapters: TimedChapter[] = CHAPTERS.map((c, i) => {
    const own = withNext.filter((l) => l.chapter === c.id);
    if (!own.length) throw new Error(`chapter ${c.id} has no lines`);
    const first = own[0] as TimedLine;
    const lead = sec(PICTURE[first.id]?.lead ?? 0);
    return { ...c, from: i === 0 ? 0 : first.from + sec(first.speech[0] ?? 0) - lead, end: 0, lines: own };
  });
  const bounded = chapters.map((c, i) => ({ ...c, end: chapters[i + 1]?.from ?? total }));
  return { chapters: bounded, lines: withNext, total };
}

export const TIMELINE = schedule();
export const TOTAL_FRAMES = TIMELINE.total;

const byId = new Map(TIMELINE.lines.map((l) => [l.id, l] as const));

export function chapter(id: string): TimedChapter {
  const c = TIMELINE.chapters.find((x) => x.id === id);
  if (!c) throw new Error(`no chapter ${id}`);
  return c;
}

/**
 * A line's timing in film frames, relative to its chapter: `local` where its words start, `localEnd`
 * where they end, `localNext` where the next line's take starts. `from`, `end` and `next` are absolute.
 */
export function line(id: string) {
  const l = byId.get(id);
  if (!l) throw new Error(`no line ${id}`);
  const c = chapter(l.chapter);
  const words = l.from + sec(l.speech[0] ?? 0);
  return { ...l, local: words - c.from, localEnd: l.end - c.from, localNext: l.next - c.from };
}

/**
 * When a word of a line starts, in frames relative to its chapter. `which` is the caption word (first
 * match, case and punctuation ignored) or its index in the line.
 */
export function word(id: string, which: string | number): number {
  const l = byId.get(id);
  if (!l) throw new Error(`no line ${id}`);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const w = typeof which === 'number' ? l.words[which] : l.words.find((x) => norm(x.w) === norm(which));
  if (!w) throw new Error(`no word ${String(which)} in ${id}`);
  return l.from + sec(w.at) - chapter(l.chapter).from;
}
