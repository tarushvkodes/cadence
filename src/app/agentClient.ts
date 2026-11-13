import type { AgentSnapshot, Fixture, FixtureTurn, PriorTurn, TimedEvent, TurnRequest } from '../domain/agent.ts';
import { assistantText, type ChatMessage } from '../domain/agent.ts';
import type { PlannerData } from '../domain/changes.ts';
import { addDays, compareDates, dateOf, type ISODate } from '../domain/time.ts';

/** Recorded sessions are static files, so replay needs no bridge and always reads the latest recording. */
export async function loadFixture(flow: string): Promise<Fixture | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}fixtures/${flow}.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<Fixture>;
    return body.version === 1 && Array.isArray(body.turns) ? (body as Fixture) : null;
  } catch {
    return null;
  }
}

export async function checkBridge(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { signal, cache: 'no-store' });
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean };
    return body.ok === true;
  } catch {
    return false;
  }
}

export function buildSnapshot(data: PlannerData, today: ISODate): AgentSnapshot {
  const from = addDays(today, -7);
  const to = addDays(today, 35);
  const since = addDays(today, -120);
  return {
    today,
    profile: data.profile,
    events: data.events.filter((e) => compareDates(from, dateOf(e.start)) <= 0 && compareDates(dateOf(e.start), to) <= 0),
    habits: data.habits,
    checkIns: Object.values(data.checkIns).filter((c) => compareDates(since, c.date) <= 0),
  };
}

export function buildHistory(chat: readonly ChatMessage[]): PriorTurn[] {
  return chat.flatMap((m): PriorTurn[] => {
    if (m.role === 'user') return [{ role: 'user', text: m.text }];
    const text = assistantText(m);
    return m.status === 'done' && text ? [{ role: 'assistant', text }] : [];
  });
}

function isTimedEvent(value: unknown): value is TimedEvent {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { t?: unknown; event?: { type?: unknown } };
  return typeof v.t === 'number' && typeof v.event?.type === 'string';
}

/** Stream one live turn from the bridge as server-sent events. */
export async function* liveTurn(request: TurnRequest, signal: AbortSignal): AsyncGenerator<TimedEvent> {
  let res: Response;
  try {
    res = await fetch('/api/turn', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
  } catch {
    if (signal.aborted) return;
    yield { t: 0, event: { type: 'error', message: 'Could not reach the agent bridge. Is `npm run dev` running?' } };
    return;
  }
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    yield { t: 0, event: { type: 'error', message: `The bridge refused the request (${res.status}). ${detail.slice(0, 200)}` } };
    return;
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let split: number;
      while ((split = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        if (!frame.startsWith('data: ')) continue;
        const parsed: unknown = JSON.parse(frame.slice(6));
        if (isTimedEvent(parsed)) yield parsed;
      }
    }
  } catch {
    if (!signal.aborted) yield { t: 0, event: { type: 'error', message: 'The connection to the bridge dropped.' } };
  }
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (ms <= 0 || signal.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => (clearTimeout(timer), resolve()), { once: true });
  });

/**
 * Replay a recorded turn with its original timing, divided by `speed`. `maxGapMs` caps any single
 * pause (the model's thinking time) so a film can keep moving without changing the order of events.
 */
export async function* replayTurn(turn: FixtureTurn, opts: { speed: number; maxGapMs: number | null }, signal: AbortSignal): AsyncGenerator<TimedEvent> {
  let previous = 0;
  let clock = 0;
  for (const timed of turn.events) {
    let gap = (timed.t - previous) / opts.speed;
    if (opts.maxGapMs !== null) gap = Math.min(gap, opts.maxGapMs);
    previous = timed.t;
    await sleep(gap, signal);
    if (signal.aborted) return;
    clock += gap;
    yield { t: Math.round(clock), event: timed.event };
  }
}
