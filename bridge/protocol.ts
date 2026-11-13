import { z } from 'zod';
import { MODELS, type TurnRequest } from '../src/domain/agent.ts';
import { EVENT_KINDS, LOADS, PHASES, SYMPTOMS } from '../src/domain/types.ts';
import { DEMO_FLOWS } from '../src/domain/sample.ts';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const dateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
const level = z.number().int().min(1).max(5);
const variant = z.object({ name: z.string(), note: z.string().optional() });

const snapshot = z.object({
  today: date,
  profile: z.object({
    periodStarts: z.array(date),
    typicalCycleLength: z.number().int().min(15).max(60),
    typicalPeriodLength: z.number().int().min(1).max(14),
    regularity: z.enum(['regular', 'irregular', 'unsure']),
  }),
  events: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        start: dateTime,
        end: dateTime,
        kind: z.enum(EVENT_KINDS),
        flexibility: z.enum(['fixed', 'movable']),
        load: z.enum(LOADS),
        location: z.string().optional(),
      }),
    )
    .max(500),
  habits: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        schedule: z.union([z.object({ kind: z.literal('daily') }), z.object({ kind: z.literal('weekly'), days: z.array(z.number().int().min(0).max(6)) })]),
        variants: z.partialRecord(z.enum(PHASES), variant),
      }),
    )
    .max(100),
  checkIns: z
    .array(z.object({ date, energy: level, mood: level, symptoms: z.array(z.enum(SYMPTOMS)), note: z.string().optional() }))
    .max(400),
});

const turnRequest = z.object({
  model: z.enum(MODELS.map((m) => m.id) as [string, ...string[]]),
  message: z.string().min(1).max(4000),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(20_000) })).max(40),
  snapshot,
  record: z.object({ flow: z.enum(DEMO_FLOWS), turnIndex: z.number().int().min(0).max(10) }).optional(),
});

/** The one place request bodies become typed. Everything past here trusts the types. */
export function parseTurnRequest(raw: unknown): { ok: true; value: TurnRequest } | { ok: false; error: string } {
  const result = turnRequest.safeParse(raw);
  if (!result.success) return { ok: false, error: z.prettifyError(result.error) };
  return { ok: true, value: result.data as unknown as TurnRequest };
}
