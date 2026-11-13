import { Check, CornerUpLeft, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../app/AppProvider.tsx';
import { describeChange } from '../domain/changes.ts';
import type { Proposal, ProposalItem } from '../domain/proposal.ts';

const STATUS_TEXT: Record<ProposalItem['status'], string> = {
  pending: 'Waiting for you',
  approved: 'Approved',
  declined: 'Declined',
  undone: 'Undone',
  stale: 'Out of date',
};

/** Approve and decline for one suggestion, or its outcome with an undo once decided. */
export function ItemActions({ proposal, item, compact = false }: { proposal: Proposal; item: ProposalItem; compact?: boolean }) {
  const { dispatch } = useApp();
  const ids = { proposalId: proposal.id, itemId: item.id };
  const title = describeChange(item.change).title;

  if (item.status === 'pending') {
    return (
      <div className="item-actions">
        <button type="button" className={`btn btn-small btn-quiet${compact ? ' btn-icon-small' : ''}`} onClick={() => dispatch({ type: 'decline', ...ids })} aria-label={`Decline: ${title}`}>
          <X size={16} strokeWidth={2.4} aria-hidden="true" />
          {compact ? null : 'Decline'}
        </button>
        <button type="button" className={`btn btn-small btn-primary${compact ? ' btn-icon-small' : ''}`} onClick={() => dispatch({ type: 'approve', ...ids })} aria-label={`Approve: ${title}`}>
          <Check size={16} strokeWidth={2.6} aria-hidden="true" />
          {compact ? null : 'Approve'}
        </button>
      </div>
    );
  }

  return (
    <motion.div className="item-actions" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}>
      <span className={`item-status status-${item.status}`}>
        {item.status === 'approved' ? <Check size={14} strokeWidth={2.6} aria-hidden="true" /> : null}
        {STATUS_TEXT[item.status]}
      </span>
      {item.status === 'approved' ? (
        <button type="button" className="btn btn-small btn-quiet" onClick={() => dispatch({ type: 'undo', ...ids })} aria-label={`Undo: ${title}`}>
          <CornerUpLeft size={15} strokeWidth={2.2} aria-hidden="true" />
          Undo
        </button>
      ) : null}
    </motion.div>
  );
}

export function BeforeAfter({ item }: { item: ProposalItem }) {
  const { before, after } = describeChange(item.change);
  if (!before && !after) return null;
  return (
    <p className="before-after num">
      {before ? <span className="before">{before}</span> : <span className="tag-new">New</span>}
      {before && after ? <span className="arrow" aria-label="becomes">→</span> : null}
      {after ? <span className="after">{after}</span> : <span className="tag-removed">Removed</span>}
    </p>
  );
}
