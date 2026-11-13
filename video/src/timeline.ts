import voice from './data/voice.json';

/**
 * The film's single source of timing. The narration was recorded first, so every line lasts exactly
 * as long as it was spoken (`src/data/voice.json`, made by `npm run voice`). Between lines the film
 * keeps the speaker's own pause, trimmed to a comfortable range, plus any `hold` the picture needs.
 * Scenes, captions, the audio mix, NARRATION.md and the audio cue sheet all read this file.
 */

export const FPS = 30;

type VoiceWord = { readonly w: string; readonly at: number };
type VoiceLine = { readonly id: string; readonly caption: string; readonly segments: readonly (readonly number[])[]; readonly length: number; readonly words: readonly VoiceWord[] };

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

/** What the picture does under each line, and how long it needs after the words (seconds). */
const PICTURE: Record<string, { beat: string; hold?: number; lead?: number }> = {
  'title.1': { beat: 'The cycle ring draws itself and becomes the Cadence wordmark.', lead: 1.6, hold: 0.5 },
  'title.2': { beat: 'Tagline: "Your week, in step with your cycle."', hold: 0.9 },
  'idea.1': { beat: 'Eyebrow: "The idea".' },
  'idea.2': { beat: 'Two statements: phase does not change what you can do; how you feel can change. The meta-analysis behind it.', hold: 0.7 },
  'idea.3': { beat: '"So Cadence plans around what you log."', hold: 0.9 },
  'setup.1': { beat: 'Step 1 title, which shrinks into the step chip. The phone swings in, on onboarding.', lead: 0.4 },
  'setup.2': { beat: 'Onboarding: the last period date is typed in; cycle length and regularity are pointed out.', hold: 0.5 },
  'setup.3': { beat: 'Continue. The Four promises card slides in.', hold: 0.3 },
  'setup.4': { beat: 'The camera walks down the promises as each is named.', hold: 0.4 },
  'setup.5': { beat: 'The fourth promise: estimates, never for birth control.', hold: 0.4 },
  'setup.6': { beat: 'I understand. The start choices.' },
  'setup.7': { beat: 'Start with a sample week.', hold: 0.5 },
  'today.1': { beat: 'Step 2, on the phone. Today: the dial sweeps to day 25.', lead: 0.4 },
  'today.2': { beat: 'Push in on the dial. "Day 25 of about 28."', hold: 0.4 },
  'today.3': { beat: 'Callout on the range.' },
  'today.4': { beat: '"Nov 18 to 22", then the confidence; its reasons open.', hold: 0.6 },
  'today.5': { beat: 'Push to the check-in card.' },
  'today.6': { beat: 'Energy, mood, symptoms are pointed out in turn.' },
  'today.7': { beat: 'Hold on the check-in.', hold: 0.5 },
  'guide.1': { beat: 'Step 3, on the phone. The Guide.', lead: 0.4 },
  'guide.2': { beat: 'The starter "Plan my week around my cycle." is tapped.', hold: 0.6 },
  'guide.3': { beat: 'Diagram: you ask, the model.', hold: 0.3 },
  'guide.4': { beat: 'Diagram: decide, call a tool, read the result, repeat. The bead goes round the loop.', hold: 0.8 },
  'guide.5': { beat: 'Diagram: a proposal leaves the loop.', hold: 1.3 },
  'guide.6': { beat: 'Back on the phone: the four read steps tick in, each one a tool call; a small loop in the corner shows which station the agent is at.', hold: 0.6 },
  'guide.7': { beat: 'Drafts come back "adjusted" twice; the third passes.', hold: 0.8 },
  'guide.8': { beat: 'The suggestions arrive. Then the phone moves aside for the laptop: "Same app, phone or laptop."', hold: 2.8 },
  'decide.1': { beat: 'Step 4, on the laptop. The first suggestion: before, after, and why.', lead: 0.4 },
  'decide.2': { beat: 'Push in on the before and after and the reason.', hold: 0.3 },
  'decide.3': { beat: 'Approve, approve, decline.', hold: 0.9 },
  'decide.4': { beat: 'The cursor goes back up.' },
  'decide.5': { beat: 'Undo.', hold: 0.6 },
  'decide.6': { beat: 'The laptop Plan: the week, with a dashed ghost block for what is still waiting. "Nothing changes until you approve it."', hold: 1.6 },
  'rough.1': { beat: 'Step 5, on the phone. Thursday, day 1 of a period, midterm tonight.', lead: 0.4, hold: 0.3 },
  'rough.2': { beat: 'The check-in card.' },
  'rough.3': { beat: 'Low, Flat, cramps, Save check-in, each a tap.', hold: 1.1 },
  'rough.4': { beat: 'The Guide suggests three changes for today only; the midterm is fixed.', hold: 1.4 },
  'safety.1': { beat: 'Step 6, on the phone. The Guide.', lead: 0.4 },
  'safety.2': { beat: 'The question about bad cramps is sent.', hold: 0.4 },
  'safety.3': { beat: 'The reply, with "worth getting checked by a doctor" and the urgent care line highlighted.', hold: 0.8 },
  'safety.4': { beat: 'Yes please. The appointment notes are drafted.', hold: 1.4 },
  'inside.1': { beat: 'Step 7, on the laptop. Learn.', lead: 0.4 },
  'inside.2': { beat: 'The evidence labels, then a claim with its source.', hold: 1.8 },
  'inside.3': { beat: 'Settings: the whole system prompt, word for word.', hold: 1.2 },
  'end.1': { beat: 'The ring returns.', lead: 0.4, hold: 0.3 },
  'end.2': { beat: 'One: plans around how you feel.', hold: 0.5 },
  'end.3': { beat: 'Two: the AI suggests, you decide. Three: it knows when to send you to a clinician.', hold: 0.8 },
  'end.4': { beat: 'github.com/tarushvkodes/cadence', hold: 0.4 },
  'end.5': { beat: 'The rest of the presentation.', hold: 0.3 },
  'end.6': { beat: 'Every claim links to its source.', hold: 0.4 },
  'end.7': { beat: 'Thank you.', hold: 0.3 },
  'end.8': { beat: 'The ring closes.' },
  'end.9': { beat: 'The Cadence wordmark.', hold: 1.4 },
};

const MIN_GAP = 0.25;
const MAX_GAP = 0.8;

export type TimedLine = VoiceLine & {
  readonly chapter: string;
  readonly beat: string;
  /** Film frame where the words start. */
  readonly from: number;
  /** Film frame where the words end. */
  readonly end: number;
  /** Film frame where the next line (or the film's end) starts. */
  readonly next: number;
};
export type TimedChapter = Chapter & { readonly from: number; readonly end: number; readonly lines: readonly TimedLine[] };

const sec = (s: number) => Math.round(s * FPS);

function schedule() {
  const lines = (voice.lines as VoiceLine[]).map((l) => {
    const pic = PICTURE[l.id];
    if (!pic) throw new Error(`no picture notes for ${l.id}`);
    return { ...l, pic };
  });
  const missing = Object.keys(PICTURE).filter((id) => !lines.some((l) => l.id === id));
  if (missing.length) throw new Error(`picture notes for missing lines: ${missing.join(', ')}`);

  let cursor = 0;
  const timed: TimedLine[] = [];
  lines.forEach((l, i) => {
    const prev = lines[i - 1];
    const natural = prev ? (l.segments[0]?.[0] ?? 0) - (prev.segments.at(-1)?.[1] ?? 0) : 0;
    const gap = prev ? Math.min(MAX_GAP, Math.max(MIN_GAP, natural)) + (prev.pic.hold ?? 0) : 0;
    cursor += sec(gap + (l.pic.lead ?? 0));
    const from = cursor;
    cursor += sec(l.length);
    timed.push({ ...l, chapter: l.id.split('.')[0] as string, beat: l.pic.beat, from, end: cursor, next: 0 });
  });
  const total = cursor + sec(lines.at(-1)?.pic.hold ?? 0);
  const withNext = timed.map((l, i) => ({ ...l, next: timed[i + 1]?.from ?? total }));

  const chapters: TimedChapter[] = CHAPTERS.map((c, i) => {
    const own = withNext.filter((l) => l.chapter === c.id);
    if (!own.length) throw new Error(`chapter ${c.id} has no lines`);
    const first = own[0] as TimedLine;
    const lead = sec(PICTURE[first.id]?.lead ?? 0);
    return { ...c, from: i === 0 ? 0 : first.from - lead, end: 0, lines: own };
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

/** A line's timing in film frames, plus the same relative to its chapter (`local*`). */
export function line(id: string) {
  const l = byId.get(id);
  if (!l) throw new Error(`no line ${id}`);
  const c = chapter(l.chapter);
  return { ...l, local: l.from - c.from, localEnd: l.end - c.from, localNext: l.next - c.from };
}

/**
 * When a word of a line is spoken, in frames relative to its chapter. `which` is the word's text
 * (first match, case and punctuation ignored) or its index in the line.
 */
export function word(id: string, which: string | number): number {
  const l = line(id);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const w = typeof which === 'number' ? l.words[which] : l.words.find((x) => norm(x.w) === norm(which));
  if (!w) throw new Error(`no word ${String(which)} in ${id}`);
  return l.local + sec(w.at);
}
