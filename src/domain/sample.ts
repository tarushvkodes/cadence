import type { PlannerData } from './changes.ts';
import { estimatePhase } from './cycle.ts';
import { addDays, atTime, d, startOfWeek, type ISODate } from './time.ts';
import type { CalendarEvent, CheckIn, CycleProfile, EventId, EventKind, Flexibility, Habit, HabitId, Level, Load, Symptom } from './types.ts';

type EventSeed = [day: number, start: string, end: string, slug: string, title: string, kind: EventKind, flex: Flexibility, load: Load, location?: string];

/** A believable week for a second-year student. Day 0 is Monday. */
const WEEK: readonly EventSeed[] = [
  [0, '09:30', '10:20', 'cs-lec', 'CS 180 lecture', 'class', 'fixed', 'moderate', 'Lawson B155'],
  [0, '11:30', '12:20', 'ma-lec', 'MA 261 lecture', 'class', 'fixed', 'moderate', 'Univ Hall 101'],
  [0, '13:30', '15:20', 'bio-lab', 'BIOL 110 lab', 'class', 'fixed', 'demanding', 'Lilly 2-120'],
  [0, '17:30', '18:30', 'gym', 'Gym: strength', 'exercise', 'movable', 'demanding', 'CoRec'],
  [0, '19:30', '21:00', 'calc-group', 'Calc study group', 'study', 'movable', 'moderate', 'Hicks library'],
  [1, '10:30', '11:45', 'psy', 'PSY 120 lecture', 'class', 'fixed', 'light', 'Stewart 183'],
  [1, '13:00', '17:00', 'shift', 'Shift at Greyhouse Café', 'work', 'fixed', 'demanding'],
  [1, '19:30', '20:30', 'club', 'Coding club meeting', 'club', 'movable', 'light', 'Lawson 1142'],
  [2, '09:30', '10:20', 'cs-lec', 'CS 180 lecture', 'class', 'fixed', 'moderate', 'Lawson B155'],
  [2, '11:30', '12:20', 'ma-lec', 'MA 261 lecture', 'class', 'fixed', 'moderate', 'Univ Hall 101'],
  [2, '14:00', '16:00', 'lab-draft', 'Lab report: write draft', 'study', 'movable', 'demanding', 'WALC'],
  [2, '17:30', '18:30', 'hiit', 'HIIT class', 'exercise', 'movable', 'demanding', 'CoRec'],
  [3, '10:30', '11:45', 'psy', 'PSY 120 lecture', 'class', 'fixed', 'light', 'Stewart 183'],
  [3, '13:00', '15:00', 'review', 'Exam review session', 'study', 'movable', 'demanding', 'Hicks library'],
  [3, '19:00', '20:00', 'exam', 'MA 261 midterm', 'exam', 'fixed', 'demanding', 'Elliott Hall'],
  [4, '09:30', '10:20', 'cs-lec', 'CS 180 lecture', 'class', 'fixed', 'moderate', 'Lawson B155'],
  [4, '13:00', '17:00', 'shift', 'Shift at Greyhouse Café', 'work', 'fixed', 'demanding'],
  [4, '17:30', '18:00', 'lab-due', 'BIOL lab report due', 'deadline', 'fixed', 'demanding'],
  [4, '19:30', '22:30', 'dinner', "Ava's birthday dinner", 'social', 'movable', 'moderate', 'Downtown Lafayette'],
  [5, '10:00', '11:00', 'run', 'Long run with Priya', 'exercise', 'movable', 'demanding', 'Riverside trail'],
  [5, '13:00', '15:00', 'errands', 'Laundry and groceries', 'personal', 'movable', 'light'],
  [5, '20:00', '23:00', 'game-night', 'Game night on the floor', 'social', 'movable', 'moderate', 'Res hall lounge'],
  [6, '11:00', '12:30', 'brunch', 'Brunch with Maya', 'social', 'movable', 'light'],
  [6, '14:00', '17:00', 'cs-project', 'CS project work block', 'study', 'movable', 'demanding', 'Lawson commons'],
  [6, '19:00', '19:45', 'reset', 'Plan next week', 'personal', 'movable', 'light'],
];

const DAY_CODES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export function sampleEvents(monday: ISODate): CalendarEvent[] {
  return WEEK.map(([day, start, end, slug, title, kind, flexibility, load, location]) => {
    const date = addDays(monday, day);
    const [sh, sm] = start.split(':').map(Number) as [number, number];
    const [eh, em] = end.split(':').map(Number) as [number, number];
    return {
      id: `ev-${DAY_CODES[day]}-${slug}` as EventId,
      title,
      start: atTime(date, sh * 60 + sm),
      end: atTime(date, eh * 60 + em),
      kind,
      flexibility,
      load,
      ...(location ? { location } : {}),
    };
  });
}

export function sampleHabits(): Habit[] {
  return [
    {
      id: 'hb-run' as HabitId,
      name: 'Run 5k',
      schedule: { kind: 'weekly', days: [0, 2, 4] },
      variants: { menstrual: { name: 'Easy walk or yoga, 20 min' } },
    },
    {
      id: 'hb-sleep' as HabitId,
      name: 'Lights out by 11:30',
      schedule: { kind: 'daily' },
      variants: { luteal: { name: 'Wind down by 11', note: 'Your logs show poorer sleep this week of your cycle.' } },
    },
    {
      id: 'hb-stretch' as HabitId,
      name: 'Stretch 10 minutes',
      schedule: { kind: 'daily' },
      variants: { menstrual: { name: 'Gentle stretch with a heat pad' } },
    },
    { id: 'hb-journal' as HabitId, name: 'Journal 5 minutes', schedule: { kind: 'daily' }, variants: {} },
    { id: 'hb-prep' as HabitId, name: 'Meal prep for the week', schedule: { kind: 'weekly', days: [6] }, variants: {} },
  ];
}

/**
 * Check-ins with one person's pattern, not a textbook one: energy dips on the first two days of a
 * period and in the last few days before it, sleep gets worse late in the cycle, and the middle of
 * the cycle is her strongest stretch. Every third day or so is skipped, like a real log.
 */
function sampleCheckIns(profile: CycleProfile, from: ISODate, to: ISODate, notes: Record<string, string>): CheckIn[] {
  const out: CheckIn[] = [];
  for (let date = from, i = 0; date <= to; date = addDays(date, 1), i++) {
    if (i % 3 === 2) continue;
    const e = estimatePhase(profile, date);
    if (e.kind !== 'estimate') continue;
    const dayNo = e.cycleDay;
    const toEnd = e.cycleLength - dayNo;
    let energy: Level;
    let mood: Level;
    const symptoms: Symptom[] = [];
    if (dayNo <= 2) {
      energy = 2;
      mood = 3;
      symptoms.push('cramps', 'fatigue');
      if (dayNo === 1) symptoms.push('heavy flow');
    } else if (dayNo <= 5) {
      energy = 3;
      mood = 3;
      if (dayNo === 3) symptoms.push('cramps');
    } else if (dayNo <= 16) {
      energy = i % 4 === 0 ? 4 : 5;
      mood = 4;
    } else if (toEnd >= 4) {
      energy = 4;
      mood = i % 5 === 0 ? 3 : 4;
      if (i % 4 === 1) symptoms.push('cravings');
    } else {
      energy = toEnd <= 1 ? 2 : 3;
      mood = 3;
      symptoms.push('poor sleep');
      if (toEnd <= 2) symptoms.push('headache');
      if (toEnd === 0) symptoms.push('bloating');
    }
    const note = notes[date];
    out.push({ date, energy, mood, symptoms, ...(note ? { note } : {}) });
  }
  return out;
}

export const DEMO_FLOWS = ['plan-week', 'rough-morning', 'safety'] as const;
export type DemoFlow = (typeof DEMO_FLOWS)[number];

export function isDemoFlow(value: string | null): value is DemoFlow {
  return value !== null && (DEMO_FLOWS as readonly string[]).includes(value);
}

export type DemoSeed = {
  readonly flow: DemoFlow;
  readonly today: ISODate;
  readonly data: PlannerData;
  readonly prompts: readonly string[];
  readonly title: string;
  readonly blurb: string;
};

const DEMO_MONDAY = d('2026-11-16');
const DEMO_STARTS = ['2026-07-30', '2026-08-28', '2026-09-25', '2026-10-23'].map(d);

function demoProfile(extraStarts: ISODate[] = []): CycleProfile {
  return { periodStarts: [...DEMO_STARTS, ...extraStarts], typicalCycleLength: 28, typicalPeriodLength: 5, regularity: 'regular' };
}

function demoData(today: ISODate, profile: CycleProfile, notes: Record<string, string> = {}): PlannerData {
  const checkIns = sampleCheckIns(profile, addDays(DEMO_STARTS[0] as ISODate, 1), addDays(today, -1), notes);
  return {
    profile,
    events: sampleEvents(DEMO_MONDAY),
    habits: sampleHabits(),
    habitLog: {},
    checkIns: Object.fromEntries(checkIns.map((c) => [c.date, c])),
  };
}

/** Each demo flow starts from fixed data on a fixed day, so a recorded session replays against the same world. */
export function demoSeed(flow: DemoFlow): DemoSeed {
  switch (flow) {
    case 'plan-week': {
      const today = d('2026-11-16');
      return {
        flow,
        today,
        data: demoData(today, demoProfile()),
        prompts: ['Plan my week around my cycle.'],
        title: 'Plan my week',
        blurb: 'Late in the cycle, with a midterm and a lab report due this week.',
      };
    }
    case 'rough-morning': {
      const today = d('2026-11-19');
      return {
        flow,
        today,
        data: demoData(today, demoProfile([today])),
        prompts: ['Today feels rough, what should I change?'],
        title: 'Rough morning',
        blurb: 'Period started this morning, the same day as the midterm.',
      };
    }
    case 'safety': {
      const today = d('2026-11-21');
      const notes = {
        '2026-09-25': 'Cramps so bad I left lab early',
        '2026-10-23': 'Missed CS lecture, ibuprofen barely helped',
        '2026-10-24': 'Still really bad cramps, stayed in bed',
      };
      return {
        flow,
        today,
        data: demoData(today, demoProfile([d('2026-11-19')]), notes),
        prompts: [
          "My cramps have been really bad the last few periods. I've missed class twice and ibuprofen barely helps. Is that normal?",
          'Yes please, help me get ready for the appointment.',
        ],
        title: 'When to see someone',
        blurb: 'Severe cramps that keep getting in the way.',
      };
    }
  }
}

/**
 * "Start with a sample week": the same week moved to the current week, with sample check-ins that end
 * yesterday. When the user gave their own cycle details, the sample history follows their cycle.
 */
export function liveSample(today: ISODate, own?: CycleProfile): PlannerData {
  const monday = startOfWeek(today);
  const lastStart = addDays(today, -24);
  const profile: CycleProfile =
    own && own.periodStarts.length
      ? own
      : {
          periodStarts: [-3, -2, -1, 0].map((k) => addDays(lastStart, k * 28 + (k === -2 ? 1 : 0))).sort(),
          typicalCycleLength: 28,
          typicalPeriodLength: 5,
          regularity: 'regular',
        };
  const historyStart = addDays(profile.periodStarts.at(-1) as ISODate, -3 * profile.typicalCycleLength + 1);
  const checkIns = sampleCheckIns(profile, historyStart, addDays(today, -1), {});
  return {
    profile,
    events: sampleEvents(monday),
    habits: sampleHabits(),
    habitLog: {},
    checkIns: Object.fromEntries(checkIns.map((c) => [c.date, c])),
  };
}
