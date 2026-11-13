import { z } from 'zod';
import { EVENT_KINDS, LOADS, PHASES, SYMPTOMS } from '../domain/types.ts';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('YYYY-MM-DD');
const dateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).describe('Local time, YYYY-MM-DDTHH:mm');
const reason = z.string().min(1).max(280).describe('One or two plain sentences the user will read: why this helps, framed as something to try.');
const weekday = z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

export const changeInput = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('move_event'),
    event_id: z.string(),
    new_start: dateTime,
    new_end: dateTime.optional().describe('Defaults to keeping the same length.'),
    reason,
  }),
  z.object({
    type: z.literal('edit_event'),
    event_id: z.string(),
    title: z.string().min(1).max(80).optional(),
    load: z.enum(LOADS).optional(),
    reason,
  }),
  z.object({
    type: z.literal('add_event'),
    title: z.string().min(1).max(80),
    start: dateTime,
    end: dateTime,
    kind: z.enum(EVENT_KINDS),
    load: z.enum(LOADS),
    reason,
  }),
  z.object({ type: z.literal('remove_event'), event_id: z.string(), reason }),
  z.object({
    type: z.literal('add_habit'),
    name: z.string().min(1).max(60),
    days: z.array(weekday).min(1).max(7).describe('Days it is scheduled. All seven means daily.'),
    phase_versions: z.partialRecord(z.enum(PHASES), z.string().min(1).max(60)).optional(),
    reason,
  }),
  z.object({
    type: z.literal('update_habit'),
    habit_id: z.string(),
    name: z.string().min(1).max(60).optional(),
    phase_versions: z
      .partialRecord(z.enum(PHASES), z.string().min(1).max(60).nullable())
      .optional()
      .describe('Set a phase version, or null to remove one. Phases you leave out stay as they are.'),
    reason,
  }),
]);
export type ChangeInput = z.infer<typeof changeInput>;

export const toolShapes = {
  get_cycle_status: {},
  list_events: {
    from: date.optional().describe('First day, inclusive. Defaults to today.'),
    to: date.optional().describe('Last day, inclusive. Defaults to six days after `from`.'),
  },
  list_habits: {},
  get_check_ins: {
    days: z.number().int().min(1).max(120).optional().describe('How many days back to read. Defaults to 60.'),
  },
  propose_changes: {
    title: z.string().min(1).max(70).describe('A short headline for the set, e.g. "A gentler end to your week".'),
    rationale: z.string().min(1).max(400).describe('Two or three sentences on the overall idea, grounded in the user\'s own data.'),
    changes: z.array(changeInput).min(1).max(8),
  },
  log_check_in: {
    date: date.optional().describe('Defaults to today.'),
    energy: z.number().int().min(1).max(5).optional().describe('1 drained, 3 okay, 5 great'),
    mood: z.number().int().min(1).max(5).optional().describe('1 heavy, 3 steady, 5 bright'),
    symptoms: z.array(z.enum(SYMPTOMS)).max(8).optional(),
    note: z.string().max(200).optional(),
  },
} as const;

export const toolInputs = {
  get_cycle_status: z.object(toolShapes.get_cycle_status),
  list_events: z.object(toolShapes.list_events),
  list_habits: z.object(toolShapes.list_habits),
  get_check_ins: z.object(toolShapes.get_check_ins),
  propose_changes: z.object(toolShapes.propose_changes),
  log_check_in: z.object(toolShapes.log_check_in),
};

export type ToolInput<K extends keyof typeof toolInputs> = z.infer<(typeof toolInputs)[K]>;

export const TOOL_DESCRIPTIONS: Record<keyof typeof toolShapes, string> = {
  get_cycle_status:
    "Read the user's estimated cycle position today: cycle day, likely phase, confidence, and predicted windows as date ranges, plus the next 14 days. These are estimates from logged dates, never exact.",
  list_events: "Read the user's calendar for a date range. Each line has the event id, day, time, title, kind, whether it is fixed or movable, its load, and the estimated phase that day.",
  list_habits: "Read the user's habits, their schedules, and any phase versions they set.",
  get_check_ins:
    "Read the user's recent check-ins (energy 1 to 5, mood 1 to 5, symptoms, notes) with the cycle day of each, and simple patterns by phase drawn from their own history. Prefer these over textbook phase descriptions.",
  propose_changes:
    'Suggest calendar or habit changes. Nothing changes until the user approves each one in the app, so describe these as suggestions, never as done. Fixed events (classes, exams, shifts, deadlines) cannot be moved, edited, or removed. Each change needs a short reason the user will read. If a change is rejected, the result says why; fix it and call again.',
  log_check_in:
    "Suggest a check-in entry from what the user told you. It is saved only if they approve it. If they have no check-in for that day yet, include both energy and mood, and if they didn't say one, ask instead of guessing.",
};
