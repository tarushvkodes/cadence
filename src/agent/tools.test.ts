import { describe, expect, it } from 'vitest';
import type { AgentSnapshot } from '../domain/agent.ts';
import { demoSeed } from '../domain/sample.ts';
import { runTool, type ToolContext } from './tools.ts';

function context(flow: Parameters<typeof demoSeed>[0] = 'plan-week'): ToolContext {
  const seed = demoSeed(flow);
  const snapshot: AgentSnapshot = {
    today: seed.today,
    profile: seed.data.profile,
    events: seed.data.events,
    habits: seed.data.habits,
    checkIns: Object.values(seed.data.checkIns),
  };
  let n = 0;
  return { snapshot, newId: (prefix) => `${prefix}-${++n}`, now: () => '2026-11-16T08:00:00.000Z' };
}

describe('read tools', () => {
  it('summarises the cycle in a line a person can read', () => {
    const out = runTool('get_cycle_status', {}, context());
    expect(out.summary).toMatch(/day 25, likely luteal, next period Nov 1\d to 2\d/);
    expect(JSON.parse(out.forModel).reminder).toMatch(/contraception/);
  });

  it('lists the week with ids, flexibility, and phase', () => {
    const out = runTool('list_events', {}, context());
    expect(out.summary).toBe('Read your calendar: 25 events, Nov 16 to 22');
    expect(out.forModel).toMatch(/ev-mon-gym \| Mon Nov 16 \| 17:30-18:30 \| Gym: strength \| exercise \| movable \| demanding/);
  });

  it('reports patterns from the user\'s own check-ins', () => {
    const out = runTool('get_check_ins', {}, context());
    expect(out.forModel).toMatch(/Patterns in this user's own logs/);
    expect(out.forModel).toMatch(/menstrual: \d+ check-ins/);
  });
});

describe('propose_changes', () => {
  it('builds a pending proposal without touching the snapshot', () => {
    const ctx = context();
    const before = JSON.stringify(ctx.snapshot);
    const out = runTool(
      'propose_changes',
      {
        title: 'Lighter late week',
        rationale: 'Your energy dips right before your period.',
        changes: [
          { type: 'move_event', event_id: 'ev-wed-hiit', new_start: '2026-11-17T08:00', reason: 'Do the hard workout earlier.' },
          { type: 'edit_event', event_id: 'ev-mon-gym', load: 'moderate', reason: 'Ease off a little.' },
        ],
      },
      ctx,
    );
    expect(out.ok).toBe(true);
    expect(out.proposal?.items.map((i) => i.status)).toEqual(['pending', 'pending']);
    expect(out.proposal?.items[0]?.change).toMatchObject({ kind: 'moveEvent', to: { start: '2026-11-17T08:00', end: '2026-11-17T09:00' } });
    expect(JSON.stringify(ctx.snapshot)).toBe(before);
    expect(out.forModel).toMatch(/Nothing has changed yet/);
  });

  it('refuses to touch fixed events', () => {
    const out = runTool(
      'propose_changes',
      { title: 't', rationale: 'r', changes: [{ type: 'move_event', event_id: 'ev-thu-exam', new_start: '2026-11-20T19:00', reason: 'r' }] },
      context(),
    );
    expect(out.ok).toBe(false);
    expect(out.proposal).toBeUndefined();
    expect(out.forModel).toMatch(/fixed/);
  });

  it('refuses overlaps', () => {
    const out = runTool(
      'propose_changes',
      { title: 't', rationale: 'r', changes: [{ type: 'move_event', event_id: 'ev-mon-gym', new_start: '2026-11-17T13:30', reason: 'r' }] },
      context(),
    );
    expect(out.ok).toBe(false);
    expect(out.forModel).toMatch(/overlap "Shift at Greyhouse Café"/);
  });

  it('refuses times in the past', () => {
    const out = runTool(
      'propose_changes',
      { title: 't', rationale: 'r', changes: [{ type: 'add_event', title: 'Walk', start: '2026-11-15T09:00', end: '2026-11-15T09:30', kind: 'exercise', load: 'light', reason: 'r' }] },
      context(),
    );
    expect(out.ok).toBe(false);
  });
});

describe('log_check_in', () => {
  it('asks for missing energy or mood instead of inventing them', () => {
    const out = runTool('log_check_in', { symptoms: ['cramps'] }, context('rough-morning'));
    expect(out.ok).toBe(false);
    expect(out.forModel).toMatch(/Ask the user/);
  });

  it('drafts a check-in as a proposal, never a direct write', () => {
    const out = runTool('log_check_in', { energy: 2, mood: 3, symptoms: ['cramps'] }, context('rough-morning'));
    expect(out.proposal?.items[0]?.change).toMatchObject({ kind: 'setCheckIn', before: null, after: { energy: 2, symptoms: ['cramps'] } });
  });
});
