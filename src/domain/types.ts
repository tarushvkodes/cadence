import type { Brand, ISODate, LocalDateTime, Weekday } from './time.ts';

export type EventId = Brand<string, 'EventId'>;
export type HabitId = Brand<string, 'HabitId'>;
export type ProposalId = Brand<string, 'ProposalId'>;
export type ChangeId = Brand<string, 'ChangeId'>;

export const PHASES = ['menstrual', 'follicular', 'ovulatory', 'luteal'] as const;
export type Phase = (typeof PHASES)[number];

export type Regularity = 'regular' | 'irregular' | 'unsure';

/**
 * What the user has told Cadence about their cycle. `periodStarts` is sorted ascending with no
 * duplicates; build it with `normalizePeriodStarts`.
 */
export type CycleProfile = {
  readonly periodStarts: readonly ISODate[];
  readonly typicalCycleLength: number;
  readonly typicalPeriodLength: number;
  readonly regularity: Regularity;
};

export const CYCLE_LENGTH_BOUNDS = { min: 21, max: 45 } as const;
export const PERIOD_LENGTH_BOUNDS = { min: 2, max: 10 } as const;

export function normalizePeriodStarts(starts: readonly ISODate[]): ISODate[] {
  return [...new Set(starts)].sort();
}

export const EVENT_KINDS = ['class', 'exam', 'deadline', 'study', 'work', 'exercise', 'club', 'social', 'personal', 'health'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export type Flexibility = 'fixed' | 'movable';
export const LOADS = ['light', 'moderate', 'demanding'] as const;
export type Load = (typeof LOADS)[number];

/** `start < end`, both on the same day. Built through `makeEvent` or validated at a boundary. */
export type CalendarEvent = {
  readonly id: EventId;
  readonly title: string;
  readonly start: LocalDateTime;
  readonly end: LocalDateTime;
  readonly kind: EventKind;
  readonly flexibility: Flexibility;
  readonly load: Load;
  readonly location?: string;
};

export type HabitSchedule = { readonly kind: 'daily' } | { readonly kind: 'weekly'; readonly days: readonly Weekday[] };

export type HabitVariant = { readonly name: string; readonly note?: string };

export type Habit = {
  readonly id: HabitId;
  readonly name: string;
  readonly schedule: HabitSchedule;
  /** Optional replacement for a phase, e.g. "Run 5k" becomes "Easy walk or yoga" while menstruating. */
  readonly variants: Readonly<Partial<Record<Phase, HabitVariant>>>;
};

export const ENERGY_LEVELS = [1, 2, 3, 4, 5] as const;
export type Level = (typeof ENERGY_LEVELS)[number];

export const SYMPTOMS = [
  'cramps',
  'headache',
  'bloating',
  'tender breasts',
  'back pain',
  'fatigue',
  'poor sleep',
  'cravings',
  'acne',
  'low mood',
  'anxious',
  'irritable',
  'nausea',
  'heavy flow',
  'spotting',
] as const;
export type Symptom = (typeof SYMPTOMS)[number];

export type CheckIn = {
  readonly date: ISODate;
  readonly energy: Level;
  readonly mood: Level;
  readonly symptoms: readonly Symptom[];
  readonly note?: string;
};

export const ENERGY_LABELS: Record<Level, string> = { 1: 'Drained', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' };
export const MOOD_LABELS: Record<Level, string> = { 1: 'Heavy', 2: 'Flat', 3: 'Steady', 4: 'Good', 5: 'Bright' };

export function habitScheduledOn(habit: Habit, weekday: Weekday): boolean {
  return habit.schedule.kind === 'daily' || habit.schedule.days.includes(weekday);
}

/** The habit as it reads in a given phase: the variant when one exists, else the habit itself. */
export function habitForPhase(habit: Habit, phase: Phase | null): { name: string; note?: string; isVariant: boolean } {
  const variant = phase ? habit.variants[phase] : undefined;
  return variant ? { name: variant.name, note: variant.note, isVariant: true } : { name: habit.name, isVariant: false };
}

export function isLevel(value: number): value is Level {
  return (ENERGY_LEVELS as readonly number[]).includes(value);
}

export function isSymptom(value: string): value is Symptom {
  return (SYMPTOMS as readonly string[]).includes(value);
}
