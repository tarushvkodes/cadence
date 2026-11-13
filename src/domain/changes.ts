import { PHASE_LABELS } from './cycle.ts';
import {
  absoluteMinutes,
  dateOf,
  formatClock,
  formatShortDate,
  shortDayName,
  type ISODate,
  type LocalDateTime,
} from './time.ts';
import {
  ENERGY_LABELS,
  MOOD_LABELS,
  PHASES,
  type CalendarEvent,
  type CheckIn,
  type CycleProfile,
  type EventId,
  type Habit,
  type HabitId,
  type Load,
} from './types.ts';

/** Everything a Change can touch. The rest of the app state (chat, settings) never goes through here. */
export type PlannerData = {
  readonly profile: CycleProfile;
  readonly events: readonly CalendarEvent[];
  readonly habits: readonly Habit[];
  readonly habitLog: Readonly<Record<ISODate, readonly HabitId[]>>;
  readonly checkIns: Readonly<Record<ISODate, CheckIn>>;
};

export type Slot = { readonly start: LocalDateTime; readonly end: LocalDateTime };
export type EventDetails = { readonly title: string; readonly load: Load };

/**
 * Every mutation of planner data. Each variant carries enough of the "before" to invert itself and to
 * notice when the world moved on since it was written (a stale proposal).
 */
export type Change =
  | { readonly kind: 'addEvent'; readonly event: CalendarEvent }
  | { readonly kind: 'removeEvent'; readonly event: CalendarEvent }
  | { readonly kind: 'moveEvent'; readonly eventId: EventId; readonly title: string; readonly from: Slot; readonly to: Slot }
  | { readonly kind: 'editEvent'; readonly eventId: EventId; readonly before: EventDetails; readonly after: EventDetails }
  | { readonly kind: 'addHabit'; readonly habit: Habit; readonly at?: number }
  | { readonly kind: 'removeHabit'; readonly habit: Habit }
  | { readonly kind: 'updateHabit'; readonly before: Habit; readonly after: Habit }
  | { readonly kind: 'setCheckIn'; readonly date: ISODate; readonly before: CheckIn | null; readonly after: CheckIn | null }
  | { readonly kind: 'setHabitDone'; readonly habitId: HabitId; readonly date: ISODate; readonly done: boolean }
  | { readonly kind: 'setProfile'; readonly before: CycleProfile; readonly after: CycleProfile };

export type ChangeKind = Change['kind'];

/** The subset the agent may propose. Profile edits and habit ticks stay with the user. */
export const AGENT_CHANGE_KINDS = ['addEvent', 'removeEvent', 'moveEvent', 'editEvent', 'addHabit', 'updateHabit', 'setCheckIn'] as const;
export type AgentChange = Extract<Change, { kind: (typeof AGENT_CHANGE_KINDS)[number] }>;

export function isAgentChange(change: Change): change is AgentChange {
  return (AGENT_CHANGE_KINDS as readonly string[]).includes(change.kind);
}

export type ChangeError = { readonly code: 'not-found' | 'stale' | 'invalid'; readonly message: string };
export type ApplyResult =
  | { readonly ok: true; readonly data: PlannerData; readonly inverse: Change }
  | { readonly ok: false; readonly error: ChangeError };

const fail = (code: ChangeError['code'], message: string): ApplyResult => ({ ok: false, error: { code, message } });
const sameJSON = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const byStart = (a: CalendarEvent, b: CalendarEvent) => absoluteMinutes(a.start) - absoluteMinutes(b.start);

export function validSlot(slot: Slot): boolean {
  return dateOf(slot.start) === dateOf(slot.end) && absoluteMinutes(slot.start) < absoluteMinutes(slot.end);
}

export function invertChange(change: Change): Change {
  switch (change.kind) {
    case 'addEvent':
      return { kind: 'removeEvent', event: change.event };
    case 'removeEvent':
      return { kind: 'addEvent', event: change.event };
    case 'moveEvent':
      return { ...change, from: change.to, to: change.from };
    case 'editEvent':
      return { ...change, before: change.after, after: change.before };
    case 'addHabit':
      return { kind: 'removeHabit', habit: change.habit };
    case 'removeHabit':
      return { kind: 'addHabit', habit: change.habit };
    case 'updateHabit':
      return { kind: 'updateHabit', before: change.after, after: change.before };
    case 'setCheckIn':
      return { ...change, before: change.after, after: change.before };
    case 'setHabitDone':
      return { ...change, done: !change.done };
    case 'setProfile':
      return { kind: 'setProfile', before: change.after, after: change.before };
  }
}

function replaceEvent(data: PlannerData, next: CalendarEvent): PlannerData {
  return { ...data, events: data.events.map((e) => (e.id === next.id ? next : e)).sort(byStart) };
}

/** The only way planner data changes. Used by the UI directly and by approved agent proposals. */
export function applyChange(data: PlannerData, change: Change): ApplyResult {
  const inverse = invertChange(change);
  const ok = (next: PlannerData): ApplyResult => ({ ok: true, data: next, inverse });

  switch (change.kind) {
    case 'addEvent': {
      if (data.events.some((e) => e.id === change.event.id)) return fail('invalid', 'That event already exists.');
      if (!validSlot(change.event)) return fail('invalid', 'An event has to start before it ends, on one day.');
      return ok({ ...data, events: [...data.events, change.event].sort(byStart) });
    }
    case 'removeEvent': {
      const current = data.events.find((e) => e.id === change.event.id);
      if (!current) return fail('not-found', `"${change.event.title}" is no longer on your calendar.`);
      if (!sameJSON(current, change.event)) return fail('stale', `"${current.title}" changed since this was suggested.`);
      return ok({ ...data, events: data.events.filter((e) => e.id !== change.event.id) });
    }
    case 'moveEvent': {
      const current = data.events.find((e) => e.id === change.eventId);
      if (!current) return fail('not-found', `"${change.title}" is no longer on your calendar.`);
      if (current.start !== change.from.start || current.end !== change.from.end) {
        return fail('stale', `"${current.title}" moved since this was suggested.`);
      }
      if (!validSlot(change.to)) return fail('invalid', 'An event has to start before it ends, on one day.');
      return ok(replaceEvent(data, { ...current, start: change.to.start, end: change.to.end }));
    }
    case 'editEvent': {
      const current = data.events.find((e) => e.id === change.eventId);
      if (!current) return fail('not-found', `"${change.before.title}" is no longer on your calendar.`);
      if (current.title !== change.before.title || current.load !== change.before.load) {
        return fail('stale', `"${current.title}" changed since this was suggested.`);
      }
      return ok(replaceEvent(data, { ...current, ...change.after }));
    }
    case 'addHabit': {
      if (data.habits.some((h) => h.id === change.habit.id)) return fail('invalid', 'That habit already exists.');
      const habits = [...data.habits];
      habits.splice(change.at ?? habits.length, 0, change.habit);
      return ok({ ...data, habits });
    }
    case 'removeHabit': {
      const at = data.habits.findIndex((h) => h.id === change.habit.id);
      if (at === -1) return fail('not-found', `"${change.habit.name}" is already gone.`);
      return { ok: true, data: { ...data, habits: data.habits.filter((h) => h.id !== change.habit.id) }, inverse: { kind: 'addHabit', habit: change.habit, at } };
    }
    case 'updateHabit': {
      const current = data.habits.find((h) => h.id === change.before.id);
      if (!current) return fail('not-found', `"${change.before.name}" is no longer one of your habits.`);
      if (!sameJSON(current, change.before)) return fail('stale', `"${current.name}" changed since this was suggested.`);
      return ok({ ...data, habits: data.habits.map((h) => (h.id === current.id ? change.after : h)) });
    }
    case 'setCheckIn': {
      const current = data.checkIns[change.date] ?? null;
      if (!sameJSON(current, change.before)) return fail('stale', `Your check-in for ${formatShortDate(change.date)} changed.`);
      const checkIns = { ...data.checkIns };
      if (change.after) checkIns[change.date] = change.after;
      else delete checkIns[change.date];
      return ok({ ...data, checkIns });
    }
    case 'setHabitDone': {
      const done = new Set(data.habitLog[change.date] ?? []);
      if (change.done) done.add(change.habitId);
      else done.delete(change.habitId);
      return ok({ ...data, habitLog: { ...data.habitLog, [change.date]: [...done] } });
    }
    case 'setProfile': {
      if (!sameJSON(data.profile, change.before)) return fail('stale', 'Your cycle details changed.');
      return ok({ ...data, profile: change.after });
    }
  }
}

export type ChangeDescription = {
  /** One line naming the change, e.g. "Move Gym: strength". */
  readonly title: string;
  readonly before: string | null;
  readonly after: string | null;
};

const slotLabel = (slot: Slot) => `${shortDayName(dateOf(slot.start))} ${formatClock(slot.start)} to ${formatClock(slot.end)}`;
const loadLabel: Record<Load, string> = { light: 'Light', moderate: 'Moderate', demanding: 'Demanding' };

function checkInLabel(c: CheckIn | null): string | null {
  if (!c) return null;
  const parts = [`Energy ${ENERGY_LABELS[c.energy].toLowerCase()}`, `mood ${MOOD_LABELS[c.mood].toLowerCase()}`];
  if (c.symptoms.length) parts.push(c.symptoms.join(', '));
  return parts.join(', ');
}

function habitLabel(h: Habit): string {
  const variants = PHASES.flatMap((p) => (h.variants[p] ? [`${PHASE_LABELS[p]}: ${h.variants[p]?.name}`] : []));
  return variants.length ? `${h.name} (${variants.join('; ')})` : h.name;
}

export function describeChange(change: Change): ChangeDescription {
  switch (change.kind) {
    case 'addEvent':
      return { title: `Add ${change.event.title}`, before: null, after: slotLabel(change.event) };
    case 'removeEvent':
      return { title: `Remove ${change.event.title}`, before: slotLabel(change.event), after: null };
    case 'moveEvent':
      return { title: `Move ${change.title}`, before: slotLabel(change.from), after: slotLabel(change.to) };
    case 'editEvent': {
      const title = change.before.title === change.after.title ? `Adjust ${change.before.title}` : `Change ${change.before.title}`;
      return {
        title,
        before: `${change.before.title}, ${loadLabel[change.before.load].toLowerCase()}`,
        after: `${change.after.title}, ${loadLabel[change.after.load].toLowerCase()}`,
      };
    }
    case 'addHabit':
      return { title: `Add habit: ${change.habit.name}`, before: null, after: habitLabel(change.habit) };
    case 'removeHabit':
      return { title: `Remove habit: ${change.habit.name}`, before: habitLabel(change.habit), after: null };
    case 'updateHabit':
      return { title: `Adjust ${change.before.name}`, before: habitLabel(change.before), after: habitLabel(change.after) };
    case 'setCheckIn':
      return {
        title: `Log check-in for ${formatShortDate(change.date)}`,
        before: checkInLabel(change.before),
        after: checkInLabel(change.after),
      };
    case 'setHabitDone':
      return { title: change.done ? 'Mark habit done' : 'Mark habit not done', before: null, after: null };
    case 'setProfile':
      return { title: 'Update cycle details', before: null, after: null };
  }
}

/** Events a change touches, for drawing proposals in place on the calendar. */
export function changeEventId(change: Change): EventId | null {
  switch (change.kind) {
    case 'addEvent':
    case 'removeEvent':
      return change.event.id;
    case 'moveEvent':
    case 'editEvent':
      return change.eventId;
    default:
      return null;
  }
}
