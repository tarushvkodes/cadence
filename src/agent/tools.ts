import type { AgentSnapshot, ToolName } from '../domain/agent.ts';
import { applyChange, validSlot, type AgentChange, type PlannerData } from '../domain/changes.ts';
import { estimatePhase, PHASE_LABELS } from '../domain/cycle.ts';
import type { Proposal, ProposalItem } from '../domain/proposal.ts';
import {
  absoluteMinutes,
  addDays,
  compareDates,
  dateOf,
  daysBetween,
  formatRange,
  formatShortDate,
  fromAbsoluteMinutes,
  minutesOf,
  parseISODate,
  parseLocalDateTime,
  shortDayName,
  WEEKDAYS,
  type ISODate,
  type LocalDateTime,
  type Weekday,
} from '../domain/time.ts';
import {
  isLevel,
  PHASES,
  type CalendarEvent,
  type ChangeId,
  type CheckIn,
  type EventId,
  type Habit,
  type HabitId,
  type HabitVariant,
  type Phase,
  type ProposalId,
} from '../domain/types.ts';
import type { ChangeInput, ToolInput } from './schemas.ts';

/** What a tool call produced: text for the model, a line for the user, and maybe a proposal. */
export type ToolOutcome = {
  readonly ok: boolean;
  readonly forModel: string;
  readonly summary: string;
  readonly proposal?: Proposal;
};

export type ToolContext = {
  readonly snapshot: AgentSnapshot;
  readonly newId: (prefix: string) => string;
  readonly now: () => string;
};

const WEEKDAY_CODES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const hhmm = (t: LocalDateTime) => t.slice(11);
const day = (date: ISODate) => `${shortDayName(date)} ${formatShortDate(date)}`;

function phaseLabel(snapshot: AgentSnapshot, date: ISODate): string {
  const e = estimatePhase(snapshot.profile, date);
  if (e.kind === 'no-data') return 'unknown';
  return e.couldBe ? `${e.phase} (maybe ${e.couldBe})` : e.phase;
}

function plannerData(snapshot: AgentSnapshot): PlannerData {
  return {
    profile: snapshot.profile,
    events: snapshot.events,
    habits: snapshot.habits,
    habitLog: {},
    checkIns: Object.fromEntries(snapshot.checkIns.map((c) => [c.date, c])),
  };
}

function cycleStatus({ snapshot }: ToolContext): ToolOutcome {
  const e = estimatePhase(snapshot.profile, snapshot.today);
  if (e.kind === 'no-data') {
    return {
      ok: true,
      forModel: JSON.stringify({ today: snapshot.today, status: 'no period start logged', note: e.reason }),
      summary: 'Checked your cycle: no period start logged yet',
    };
  }
  const next14 = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(snapshot.today, i);
    return `${date} ${shortDayName(date)}: ${phaseLabel(snapshot, date)}`;
  });
  const result = {
    today: `${snapshot.today} (${shortDayName(snapshot.today)})`,
    cycle_day: e.cycleDay,
    likely_phase: e.phase,
    could_also_be: e.couldBe,
    confidence: e.confidence,
    next_period_likely: formatRange(e.windows.nextPeriod),
    ovulation_window_this_cycle: formatRange(e.windows.ovulation),
    this_phase_likely_ends: formatRange(e.windows.phaseEnds),
    typical_period_length_days: snapshot.profile.typicalPeriodLength,
    why: e.reasons,
    next_14_days: next14,
    reminder: 'Estimates only. Never usable for contraception or conception timing.',
  };
  return {
    ok: true,
    forModel: JSON.stringify(result),
    summary: `Checked your cycle: day ${e.cycleDay}, likely ${PHASE_LABELS[e.phase].toLowerCase()}, next period ${formatRange(e.windows.nextPeriod)}`,
  };
}

function listEvents({ snapshot }: ToolContext, input: ToolInput<'list_events'>): ToolOutcome {
  const from = (input.from && parseISODate(input.from)) || snapshot.today;
  const to = (input.to && parseISODate(input.to)) || addDays(from, 6);
  if (compareDates(from, to) > 0 || daysBetween(from, to) > 31) {
    return { ok: false, forModel: 'Error: `from` must be on or before `to`, at most 31 days apart.', summary: 'Calendar read failed' };
  }
  const events = snapshot.events.filter((ev) => {
    const date = dateOf(ev.start);
    return compareDates(from, date) <= 0 && compareDates(date, to) <= 0;
  });
  const lines = events.map(
    (ev) =>
      `${ev.id} | ${day(dateOf(ev.start))} | ${hhmm(ev.start)}-${hhmm(ev.end)} | ${ev.title} | ${ev.kind} | ${ev.flexibility} | ${ev.load} | phase: ${phaseLabel(snapshot, dateOf(ev.start))}`,
  );
  const header = `${events.length} events from ${day(from)} to ${day(to)}. Columns: id | day | time | title | kind | fixed or movable | load | estimated phase.`;
  return {
    ok: true,
    forModel: [header, ...lines].join('\n'),
    summary: `Read your calendar: ${events.length} ${events.length === 1 ? 'event' : 'events'}, ${formatRange({ start: from, end: to })}`,
  };
}

function scheduleLabel(h: Habit): string {
  return h.schedule.kind === 'daily' ? 'daily' : h.schedule.days.map((d) => WEEKDAY_CODES[d]).join(', ');
}

function listHabits({ snapshot }: ToolContext): ToolOutcome {
  const lines = snapshot.habits.map((h) => {
    const versions = PHASES.flatMap((p) => (h.variants[p] ? [`${p}: ${h.variants[p]?.name}`] : []));
    return `${h.id} | ${h.name} | ${scheduleLabel(h)} | phase versions: ${versions.length ? versions.join('; ') : 'none'}`;
  });
  return {
    ok: true,
    forModel: [`${snapshot.habits.length} habits. Columns: id | name | schedule | phase versions.`, ...lines].join('\n'),
    summary: `Read your habits: ${snapshot.habits.length} ${snapshot.habits.length === 1 ? 'habit' : 'habits'}`,
  };
}

function getCheckIns({ snapshot }: ToolContext, input: ToolInput<'get_check_ins'>): ToolOutcome {
  const days = input.days ?? 60;
  const since = addDays(snapshot.today, -days);
  const recent = snapshot.checkIns
    .filter((c) => compareDates(since, c.date) <= 0 && compareDates(c.date, snapshot.today) <= 0)
    .sort((a, b) => compareDates(a.date, b.date));

  const byPhase = new Map<Phase, CheckIn[]>();
  const lines = recent.map((c) => {
    const e = estimatePhase(snapshot.profile, c.date);
    const where = e.kind === 'estimate' ? `day ${e.cycleDay} ${e.phase}` : 'phase unknown';
    if (e.kind === 'estimate') byPhase.set(e.phase, [...(byPhase.get(e.phase) ?? []), c]);
    const note = c.note ? ` | note: "${c.note}"` : '';
    return `${c.date} ${shortDayName(c.date)} | ${where} | energy ${c.energy}/5 | mood ${c.mood}/5 | ${c.symptoms.length ? c.symptoms.join(', ') : 'no symptoms'}${note}`;
  });

  const patterns = PHASES.flatMap((phase) => {
    const entries = byPhase.get(phase) ?? [];
    if (entries.length < 2) return [];
    const avg = (pick: (c: CheckIn) => number) => (entries.reduce((s, c) => s + pick(c), 0) / entries.length).toFixed(1);
    const counts = new Map<string, number>();
    entries.flatMap((c) => c.symptoms).forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1));
    const common = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s, n]) => `${s} (${n}/${entries.length})`);
    return [`${phase}: ${entries.length} check-ins, avg energy ${avg((c) => c.energy)}, avg mood ${avg((c) => c.mood)}, common: ${common.join(', ') || 'none'}`];
  });

  const forModel = [
    `${recent.length} check-ins in the last ${days} days.`,
    ...lines,
    patterns.length ? '\nPatterns in this user\'s own logs (small sample, treat as hints):' : '',
    ...patterns,
  ]
    .filter(Boolean)
    .join('\n');
  return { ok: true, forModel, summary: `Read your check-ins: ${recent.length} in the last ${days} days` };
}

type Built = { ok: true; change: AgentChange } | { ok: false; error: string };

function buildChange(input: ChangeInput, data: PlannerData, ctx: ToolContext): Built {
  const findEvent = (id: string): CalendarEvent | string => {
    const ev = data.events.find((e) => e.id === id);
    if (!ev) return `No event with id ${id}. Call list_events for current ids.`;
    if (ev.flexibility === 'fixed') return `"${ev.title}" is fixed (${ev.kind}). Fixed events cannot be changed; plan around it.`;
    return ev;
  };
  const notPast = (t: LocalDateTime) =>
    compareDates(dateOf(t), ctx.snapshot.today) >= 0 ? null : `${t} is in the past. Suggest changes from today on.`;

  switch (input.type) {
    case 'move_event': {
      const ev = findEvent(input.event_id);
      if (typeof ev === 'string') return { ok: false, error: ev };
      const start = parseLocalDateTime(input.new_start);
      if (!start) return { ok: false, error: `new_start "${input.new_start}" is not a valid YYYY-MM-DDTHH:mm time.` };
      const length = absoluteMinutes(ev.end) - absoluteMinutes(ev.start);
      const end = input.new_end ? parseLocalDateTime(input.new_end) : fromAbsoluteMinutes(absoluteMinutes(start) + length);
      if (!end) return { ok: false, error: `new_end "${input.new_end}" is not a valid time.` };
      const to = { start, end };
      if (!validSlot(to)) return { ok: false, error: `"${ev.title}" has to start before it ends, on one day.` };
      const past = notPast(start);
      if (past) return { ok: false, error: past };
      if (minutesOf(start) < 6 * 60) return { ok: false, error: `Starting "${ev.title}" before 6:00 is not a kind suggestion.` };
      if (start === ev.start && end === ev.end) return { ok: false, error: `"${ev.title}" is already at that time.` };
      return { ok: true, change: { kind: 'moveEvent', eventId: ev.id, title: ev.title, from: { start: ev.start, end: ev.end }, to } };
    }
    case 'edit_event': {
      const ev = findEvent(input.event_id);
      if (typeof ev === 'string') return { ok: false, error: ev };
      const after = { title: input.title ?? ev.title, load: input.load ?? ev.load };
      if (after.title === ev.title && after.load === ev.load) return { ok: false, error: `That edit leaves "${ev.title}" unchanged.` };
      return { ok: true, change: { kind: 'editEvent', eventId: ev.id, before: { title: ev.title, load: ev.load }, after } };
    }
    case 'add_event': {
      const start = parseLocalDateTime(input.start);
      const end = parseLocalDateTime(input.end);
      if (!start || !end) return { ok: false, error: 'start and end must be valid YYYY-MM-DDTHH:mm times.' };
      const past = notPast(start);
      if (past) return { ok: false, error: past };
      const event: CalendarEvent = {
        id: ctx.newId('ev') as EventId,
        title: input.title,
        start,
        end,
        kind: input.kind,
        load: input.load,
        flexibility: 'movable',
      };
      if (!validSlot(event)) return { ok: false, error: `"${input.title}" has to start before it ends, on one day.` };
      return { ok: true, change: { kind: 'addEvent', event } };
    }
    case 'remove_event': {
      const ev = findEvent(input.event_id);
      if (typeof ev === 'string') return { ok: false, error: ev };
      return { ok: true, change: { kind: 'removeEvent', event: ev } };
    }
    case 'add_habit': {
      const days = [...new Set(input.days.map((d) => WEEKDAY_CODES.indexOf(d) as Weekday))].sort();
      const habit: Habit = {
        id: ctx.newId('hb') as HabitId,
        name: input.name,
        schedule: days.length === WEEKDAYS.length ? { kind: 'daily' } : { kind: 'weekly', days },
        variants: Object.fromEntries(Object.entries(input.phase_versions ?? {}).map(([p, name]) => [p, { name }])),
      };
      return { ok: true, change: { kind: 'addHabit', habit } };
    }
    case 'update_habit': {
      const habit = data.habits.find((h) => h.id === input.habit_id);
      if (!habit) return { ok: false, error: `No habit with id ${input.habit_id}. Call list_habits for current ids.` };
      const variants: Partial<Record<Phase, HabitVariant>> = { ...habit.variants };
      for (const [phase, name] of Object.entries(input.phase_versions ?? {}) as [Phase, string | null][]) {
        if (name === null) delete variants[phase];
        else variants[phase] = { name };
      }
      const after: Habit = { ...habit, name: input.name ?? habit.name, variants };
      if (JSON.stringify(after) === JSON.stringify(habit)) return { ok: false, error: `That update leaves "${habit.name}" unchanged.` };
      return { ok: true, change: { kind: 'updateHabit', before: habit, after } };
    }
  }
}

function overlaps(a: CalendarEvent, b: CalendarEvent): boolean {
  return dateOf(a.start) === dateOf(b.start) && absoluteMinutes(a.start) < absoluteMinutes(b.end) && absoluteMinutes(b.start) < absoluteMinutes(a.end);
}

/** Build every change, apply them in order to a scratch copy, and reject the set if any step fails. */
function proposeChanges(ctx: ToolContext, input: ToolInput<'propose_changes'>): ToolOutcome {
  let data = plannerData(ctx.snapshot);
  const items: ProposalItem[] = [];
  const errors: string[] = [];
  const touched = new Set<string>();

  input.changes.forEach((raw, i) => {
    const built = buildChange(raw, data, ctx);
    if (!built.ok) {
      errors.push(`Change ${i + 1} (${raw.type}): ${built.error}`);
      return;
    }
    const applied = applyChange(data, built.change);
    if (!applied.ok) {
      errors.push(`Change ${i + 1} (${raw.type}): ${applied.error.message}`);
      return;
    }
    data = applied.data;
    if (built.change.kind === 'moveEvent') touched.add(built.change.eventId);
    if (built.change.kind === 'addEvent') touched.add(built.change.event.id);
    items.push({ id: ctx.newId('ch') as ChangeId, change: built.change, reason: raw.reason, status: 'pending' });
  });

  for (const id of touched) {
    const ev = data.events.find((e) => e.id === id);
    const clash = ev && data.events.find((other) => other.id !== id && overlaps(ev, other));
    if (ev && clash) {
      errors.push(`"${ev.title}" at ${day(dateOf(ev.start))} ${hhmm(ev.start)}-${hhmm(ev.end)} would overlap "${clash.title}" (${hhmm(clash.start)}-${hhmm(clash.end)}).`);
    }
  }

  if (errors.length) {
    return {
      ok: false,
      forModel: `Not sent. Fix these and call propose_changes again with the whole set:\n${errors.join('\n')}`,
      summary: 'Checked a draft against your calendar and adjusted it',
    };
  }

  const proposal: Proposal = {
    id: ctx.newId('pr') as ProposalId,
    createdAt: ctx.now(),
    title: input.title,
    rationale: input.rationale,
    items,
  };
  return {
    ok: true,
    proposal,
    forModel: `Sent to the user as ${items.length} suggestions. Nothing has changed yet: they will approve or decline each one in the app. Refer to them as suggestions, not as done.`,
    summary: `Drafted ${items.length} ${items.length === 1 ? 'suggestion' : 'suggestions'} for you to review`,
  };
}

function logCheckIn(ctx: ToolContext, input: ToolInput<'log_check_in'>): ToolOutcome {
  const date = (input.date && parseISODate(input.date)) || ctx.snapshot.today;
  if (compareDates(date, ctx.snapshot.today) > 0) {
    return { ok: false, forModel: 'Check-ins can only be logged for today or earlier.', summary: 'Check-in draft failed' };
  }
  const before = ctx.snapshot.checkIns.find((c) => c.date === date) ?? null;
  const energy = input.energy ?? before?.energy;
  const mood = input.mood ?? before?.mood;
  if (energy === undefined || mood === undefined || !isLevel(energy) || !isLevel(mood)) {
    return {
      ok: false,
      forModel: 'There is no check-in for that day yet, so both energy and mood are needed. Ask the user rather than guessing.',
      summary: 'Check-in draft needs more detail',
    };
  }
  const symptoms = [...new Set([...(before?.symptoms ?? []), ...(input.symptoms ?? [])])];
  const note = input.note ?? before?.note;
  const after: CheckIn = { date, energy, mood, symptoms, ...(note ? { note } : {}) };
  const proposal: Proposal = {
    id: ctx.newId('pr') as ProposalId,
    createdAt: ctx.now(),
    title: before ? `Update your check-in for ${formatShortDate(date)}` : `Log a check-in for ${formatShortDate(date)}`,
    rationale: 'From what you told me in this chat. It is saved only if you approve it.',
    items: [{ id: ctx.newId('ch') as ChangeId, change: { kind: 'setCheckIn', date, before, after }, reason: 'So your history reflects today.', status: 'pending' }],
  };
  return {
    ok: true,
    proposal,
    forModel: 'Sent to the user for approval. It is not saved until they approve it.',
    summary: 'Drafted a check-in for you to confirm',
  };
}

export type ToolInputs = { [K in ToolName]: ToolInput<K> };

/** Inputs arrive already parsed by the tool's zod schema at the SDK boundary. */
export function runTool<K extends ToolName>(name: K, input: ToolInputs[K], ctx: ToolContext): ToolOutcome {
  switch (name as ToolName) {
    case 'get_cycle_status':
      return cycleStatus(ctx);
    case 'list_events':
      return listEvents(ctx, input as ToolInput<'list_events'>);
    case 'list_habits':
      return listHabits(ctx);
    case 'get_check_ins':
      return getCheckIns(ctx, input as ToolInput<'get_check_ins'>);
    case 'propose_changes':
      return proposeChanges(ctx, input as ToolInput<'propose_changes'>);
    case 'log_check_in':
      return logCheckIn(ctx, input as ToolInput<'log_check_in'>);
  }
}
