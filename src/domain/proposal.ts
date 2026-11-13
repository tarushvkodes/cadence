import { applyChange, type AgentChange, type Change, type ChangeError, type PlannerData } from './changes.ts';
import type { ChangeId, ProposalId } from './types.ts';

/**
 * pending  -> approved | declined | stale
 * approved -> undone
 * A stale item is one whose "before" no longer matches the calendar, so it can only be dismissed.
 */
export type ItemStatus = 'pending' | 'approved' | 'declined' | 'undone' | 'stale';

const ITEM_TRANSITIONS: Record<ItemStatus, readonly ItemStatus[]> = {
  pending: ['approved', 'declined', 'stale'],
  approved: ['undone'],
  declined: [],
  undone: [],
  stale: ['declined'],
};

export type ProposalItem = {
  readonly id: ChangeId;
  readonly change: AgentChange;
  readonly reason: string;
  readonly status: ItemStatus;
  /** Set while approved: the change that undoes this one. */
  readonly inverse?: Change;
  readonly note?: string;
};

export type Proposal = {
  readonly id: ProposalId;
  readonly createdAt: string;
  readonly title: string;
  readonly rationale: string;
  readonly items: readonly ProposalItem[];
};

export type ProposalStatus = 'pending' | 'approved' | 'declined' | 'partially-approved';

/** Derived, never stored, so it cannot drift from the items. */
export function proposalStatus(p: Proposal): ProposalStatus {
  if (p.items.some((i) => i.status === 'pending')) return 'pending';
  const approved = p.items.filter((i) => i.status === 'approved').length;
  if (approved === p.items.length) return 'approved';
  const everApproved = p.items.some((i) => i.status === 'approved' || i.status === 'undone');
  return approved === 0 && !everApproved ? 'declined' : 'partially-approved';
}

export function canTransition(from: ItemStatus, to: ItemStatus): boolean {
  return ITEM_TRANSITIONS[from].includes(to);
}

export type ProposalOutcome =
  | { readonly ok: true; readonly data: PlannerData; readonly proposal: Proposal }
  | { readonly ok: false; readonly error: ChangeError | { code: 'transition'; message: string }; readonly proposal: Proposal };

function setItem(p: Proposal, itemId: ChangeId, patch: Partial<ProposalItem>): Proposal {
  return { ...p, items: p.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) };
}

function transitionError(p: Proposal, from: ItemStatus, to: ItemStatus): ProposalOutcome {
  return { ok: false, error: { code: 'transition', message: `Cannot go from ${from} to ${to}.` }, proposal: p };
}

/** Approve one item: run its change through `applyChange`. A stale change marks the item stale. */
export function approveItem(data: PlannerData, p: Proposal, itemId: ChangeId): ProposalOutcome {
  const item = p.items.find((i) => i.id === itemId);
  if (!item) return { ok: false, error: { code: 'not-found', message: 'That suggestion is gone.' }, proposal: p };
  if (!canTransition(item.status, 'approved')) return transitionError(p, item.status, 'approved');
  const result = applyChange(data, item.change);
  if (!result.ok) {
    return { ok: false, error: result.error, proposal: setItem(p, itemId, { status: 'stale', note: result.error.message }) };
  }
  return { ok: true, data: result.data, proposal: setItem(p, itemId, { status: 'approved', inverse: result.inverse }) };
}

export function declineItem(data: PlannerData, p: Proposal, itemId: ChangeId): ProposalOutcome {
  const item = p.items.find((i) => i.id === itemId);
  if (!item) return { ok: false, error: { code: 'not-found', message: 'That suggestion is gone.' }, proposal: p };
  if (!canTransition(item.status, 'declined')) return transitionError(p, item.status, 'declined');
  return { ok: true, data, proposal: setItem(p, itemId, { status: 'declined' }) };
}

/** Undo an approved item by applying the inverse it recorded. */
export function undoItem(data: PlannerData, p: Proposal, itemId: ChangeId): ProposalOutcome {
  const item = p.items.find((i) => i.id === itemId);
  if (!item) return { ok: false, error: { code: 'not-found', message: 'That suggestion is gone.' }, proposal: p };
  if (!canTransition(item.status, 'undone') || !item.inverse) return transitionError(p, item.status, 'undone');
  const result = applyChange(data, item.inverse);
  if (!result.ok) return { ok: false, error: result.error, proposal: p };
  return { ok: true, data: result.data, proposal: setItem(p, itemId, { status: 'undone', inverse: undefined }) };
}

/** Approve every pending item in order. Items that fail go stale; the rest still apply. */
export function approveAll(data: PlannerData, p: Proposal): { data: PlannerData; proposal: Proposal } {
  let current = { data, proposal: p };
  for (const item of p.items) {
    if (item.status !== 'pending') continue;
    const outcome = approveItem(current.data, current.proposal, item.id);
    current = { data: outcome.ok ? outcome.data : current.data, proposal: outcome.proposal };
  }
  return current;
}

export function declineAll(p: Proposal): Proposal {
  return { ...p, items: p.items.map((i) => (i.status === 'pending' || i.status === 'stale' ? { ...i, status: 'declined' } : i)) };
}

export function pendingItems(proposals: readonly Proposal[]): ProposalItem[] {
  return proposals.flatMap((p) => p.items.filter((i) => i.status === 'pending'));
}
