import { CalendarClock, CalendarMinus, CalendarPlus, Check, NotebookPen, Repeat, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../app/AppProvider.tsx';
import { describeChange, type ChangeKind } from '../domain/changes.ts';
import { proposalStatus, type Proposal } from '../domain/proposal.ts';
import { Glass } from './Glass.tsx';
import { BeforeAfter, ItemActions } from './Suggestion.tsx';

const CHANGE_ICON: Partial<Record<ChangeKind, LucideIcon>> = {
  moveEvent: CalendarClock,
  addEvent: CalendarPlus,
  removeEvent: CalendarMinus,
  editEvent: SlidersHorizontal,
  addHabit: Repeat,
  updateHabit: Repeat,
  setCheckIn: NotebookPen,
};

const STATUS_LINE = {
  pending: 'Waiting for you',
  approved: 'All approved',
  declined: 'Declined',
  'partially-approved': 'Partly approved',
} as const;

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { dispatch } = useApp();
  const status = proposalStatus(proposal);
  const pending = proposal.items.filter((i) => i.status === 'pending').length;
  const approved = proposal.items.filter((i) => i.status === 'approved').length;

  return (
    <motion.section
      className={`proposal-card card status-${status}`}
      aria-label={`Suggestions: ${proposal.title}`}
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.55 }}
    >
      <header className="proposal-head">
        <p className="eyebrow">
          <span className={`proposal-dot status-${status}`} aria-hidden="true" />
          {STATUS_LINE[status]} · {proposal.items.length} {proposal.items.length === 1 ? 'suggestion' : 'suggestions'}
        </p>
        <h3 className="proposal-title serif">{proposal.title}</h3>
        <p className="proposal-rationale">{proposal.rationale}</p>
      </header>

      <ol className="proposal-items">
        {proposal.items.map((item, i) => {
          const Icon = CHANGE_ICON[item.change.kind] ?? SlidersHorizontal;
          return (
            <motion.li
              key={item.id}
              className={`proposal-item is-${item.status}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.45, delay: 0.08 + i * 0.06 }}
              layout="position"
            >
              <span className="change-icon" aria-hidden="true">
                {item.status === 'approved' ? <Check size={17} strokeWidth={2.6} /> : <Icon size={17} strokeWidth={2} />}
              </span>
              <div className="change-body">
                <p className="change-title">{describeChange(item.change).title}</p>
                <BeforeAfter item={item} />
                <p className="change-reason">{item.reason}</p>
                {item.note ? <p className="change-note">{item.note}</p> : null}
              </div>
              <div className="change-actions">
                <ItemActions proposal={proposal} item={item} />
              </div>
            </motion.li>
          );
        })}
      </ol>

      {pending > 0 ? (
        <Glass radius={22} className="proposal-bar" bend={0.6}>
          <span className="footnote muted num">
            {approved > 0 ? `${approved} approved, ` : ''}
            {pending} waiting. Nothing changes until you approve.
          </span>
          <span className="proposal-bar-actions">
            <button type="button" className="btn btn-small btn-quiet" onClick={() => dispatch({ type: 'declineAll', proposalId: proposal.id })}>
              Decline all
            </button>
            <button type="button" className="btn btn-small btn-primary" onClick={() => dispatch({ type: 'approveAll', proposalId: proposal.id })}>
              <Check size={16} strokeWidth={2.6} aria-hidden="true" />
              Approve {pending === proposal.items.length ? 'all' : `${pending} left`}
            </button>
          </span>
        </Glass>
      ) : null}
    </motion.section>
  );
}
