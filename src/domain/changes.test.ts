import { describe, expect, it } from 'vitest';
import { applyChange, invertChange, type Change, type PlannerData } from './changes.ts';
import { approveAll, approveItem, declineItem, proposalStatus, undoItem, type Proposal } from './proposal.ts';
import { demoSeed } from './sample.ts';
import { dt } from './time.ts';
import type { ChangeId, EventId, ProposalId } from './types.ts';

const seed = demoSeed('plan-week').data;
const gymId = 'ev-mon-gym' as EventId;
const gym = seed.events.find((e) => e.id === gymId)!;

const moveGym: Change = {
  kind: 'moveEvent',
  eventId: gymId,
  title: gym.title,
  from: { start: gym.start, end: gym.end },
  to: { start: dt('2026-11-17T08:00'), end: dt('2026-11-17T09:00') },
};

function apply(data: PlannerData, change: Change) {
  const result = applyChange(data, change);
  if (!result.ok) throw new Error(result.error.message);
  return result;
}

describe('applyChange', () => {
  it('moves an event and keeps the list ordered by start', () => {
    const { data } = apply(seed, moveGym);
    const moved = data.events.find((e) => e.id === gymId)!;
    expect(moved.start).toBe('2026-11-17T08:00');
    const starts = data.events.map((e) => e.start);
    expect(starts).toEqual([...starts].sort());
  });

  it('returns an inverse that restores the original exactly', () => {
    const { data, inverse } = apply(seed, moveGym);
    expect(apply(data, inverse).data).toEqual(seed);
  });

  it('never mutates the input', () => {
    const before = JSON.stringify(seed);
    apply(seed, moveGym);
    expect(JSON.stringify(seed)).toBe(before);
  });

  it('refuses a move whose "from" no longer matches (stale)', () => {
    const { data } = apply(seed, moveGym);
    const again = applyChange(data, moveGym);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe('stale');
  });

  it('round-trips every change kind through its inverse', () => {
    const checkIn = { date: seed.profile.periodStarts.at(-1)!, energy: 2 as const, mood: 2 as const, symptoms: ['cramps' as const] };
    const habit = seed.habits[0]!;
    const changes: Change[] = [
      moveGym,
      { kind: 'editEvent', eventId: gymId, before: { title: gym.title, load: gym.load }, after: { title: 'Gym: mobility', load: 'light' } },
      { kind: 'removeEvent', event: gym },
      { kind: 'addEvent', event: { ...gym, id: 'ev-new' as EventId, title: 'Walk' } },
      { kind: 'updateHabit', before: habit, after: { ...habit, name: 'Run 3k' } },
      { kind: 'addHabit', habit: { ...habit, id: 'hb-new' as typeof habit.id } },
      { kind: 'removeHabit', habit },
      { kind: 'setCheckIn', date: checkIn.date, before: seed.checkIns[checkIn.date] ?? null, after: checkIn },
      { kind: 'setHabitDone', habitId: habit.id, date: checkIn.date, done: true },
      { kind: 'setProfile', before: seed.profile, after: { ...seed.profile, typicalCycleLength: 30 } },
    ];
    for (const change of changes) {
      const { data, inverse } = apply(seed, change);
      expect(inverse.kind).toBe(invertChange(change).kind);
      const restored = apply(data, inverse).data;
      if (change.kind === 'setHabitDone') expect(restored.habitLog[change.date]).toEqual([]);
      else expect(restored).toEqual(seed);
    }
  });

  it('rejects an event that ends before it starts', () => {
    const result = applyChange(seed, { ...moveGym, to: { start: dt('2026-11-17T09:00'), end: dt('2026-11-17T08:00') } });
    expect(result.ok).toBe(false);
  });
});

function proposal(changes: Change[]): Proposal {
  return {
    id: 'pr-1' as ProposalId,
    createdAt: '2026-11-16T08:00:00Z',
    title: 'Test',
    rationale: 'Test',
    items: changes.map((change, i) => ({ id: `ch-${i}` as ChangeId, change: change as never, reason: 'r', status: 'pending' })),
  };
}

describe('proposal state machine', () => {
  const club = seed.events.find((e) => e.id === 'ev-tue-club')!;
  const moveClub: Change = { kind: 'moveEvent', eventId: club.id, title: club.title, from: club, to: { start: dt('2026-11-18T19:30'), end: dt('2026-11-18T20:30') } };
  const p = proposal([moveGym, moveClub]);

  it('changes nothing until an item is approved', () => {
    expect(proposalStatus(p)).toBe('pending');
    const declined = declineItem(seed, p, 'ch-0' as ChangeId);
    expect(declined.ok && declined.data).toBe(seed);
  });

  it('applies on approve and reverts on undo', () => {
    const approved = approveItem(seed, p, 'ch-0' as ChangeId);
    if (!approved.ok) throw new Error('approve failed');
    expect(approved.data.events.find((e) => e.id === gymId)!.start).toBe('2026-11-17T08:00');
    const undone = undoItem(approved.data, approved.proposal, 'ch-0' as ChangeId);
    if (!undone.ok) throw new Error('undo failed');
    expect(undone.data).toEqual(seed);
    expect(undone.proposal.items[0]!.status).toBe('undone');
  });

  it('derives approved, declined, and partially approved from the items', () => {
    const all = approveAll(seed, p);
    expect(proposalStatus(all.proposal)).toBe('approved');

    const one = approveItem(seed, p, 'ch-0' as ChangeId);
    if (!one.ok) throw new Error();
    const mixed = declineItem(one.data, one.proposal, 'ch-1' as ChangeId);
    expect(proposalStatus(mixed.proposal)).toBe('partially-approved');

    const none = declineItem(seed, declineItem(seed, p, 'ch-0' as ChangeId).proposal, 'ch-1' as ChangeId);
    expect(proposalStatus(none.proposal)).toBe('declined');
  });

  it('refuses illegal transitions', () => {
    const declined = declineItem(seed, p, 'ch-0' as ChangeId).proposal;
    expect(approveItem(seed, declined, 'ch-0' as ChangeId).ok).toBe(false);
    expect(undoItem(seed, declined, 'ch-0' as ChangeId).ok).toBe(false);
  });

  it('marks an item stale when the calendar moved underneath it', () => {
    const { data } = apply(seed, moveGym);
    const outcome = approveItem(data, p, 'ch-0' as ChangeId);
    expect(outcome.ok).toBe(false);
    expect(outcome.proposal.items[0]!.status).toBe('stale');
  });
});
