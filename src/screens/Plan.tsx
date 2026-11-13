import { Check, ChevronLeft, ChevronRight, Lock, X } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useReady } from '../app/AppProvider.tsx';
import { go } from '../app/routes.ts';
import { describeChange, type AgentChange } from '../domain/changes.ts';
import { estimatePhase, PHASE_LABELS } from '../domain/cycle.ts';
import type { Proposal, ProposalItem } from '../domain/proposal.ts';
import { addDays, dateOf, formatClock, formatShortDate, minutesOf, shortDayName, startOfWeek, weekDates, type ISODate } from '../domain/time.ts';
import type { CalendarEvent, Phase } from '../domain/types.ts';
import { KIND_ICON, LoadMeter } from '../ui/eventMeta.tsx';
import { Glass } from '../ui/Glass.tsx';
import { BeforeAfter, ItemActions } from '../ui/Suggestion.tsx';
import '../styles/plan.css';

const DAY_START = 7 * 60;
const DAY_END = 23 * 60;
const HOUR_PX = 48;
const SPRING = { type: 'spring', bounce: 0.12, duration: 0.55 } as const;

type Pending = { proposal: Proposal; item: ProposalItem };
type DayPhase = { phase: Phase; couldBe: Phase | null } | null;

function pendingSuggestions(proposals: readonly Proposal[]): Pending[] {
  return proposals.flatMap((proposal) => proposal.items.filter((i) => i.status === 'pending').map((item) => ({ proposal, item })));
}

const top = (minutes: number) => ((Math.max(DAY_START, minutes) - DAY_START) / 60) * HOUR_PX;
const height = (start: number, end: number) => Math.max(26, ((Math.min(DAY_END, end) - Math.max(DAY_START, start)) / 60) * HOUR_PX - 3);

export function Plan() {
  const { state, today, dispatch } = useReady();
  const [weekStart, setWeekStart] = useState<ISODate>(() => startOfWeek(today));
  const days = weekDates(weekStart);
  const pending = pendingSuggestions(state.proposals);
  const phases = useMemo(
    () =>
      days.map((date): DayPhase => {
        const e = estimatePhase(state.data.profile, date);
        return e.kind === 'estimate' ? { phase: e.phase, couldBe: e.couldBe } : null;
      }),
    [days, state.data.profile],
  );
  const isThisWeek = weekStart === startOfWeek(today);
  const pendingProposals = state.proposals.filter((p) => p.items.some((i) => i.status === 'pending'));

  return (
    <div className="page plan">
      <header className="plan-head">
        <div>
          <p className="eyebrow num">Week of {formatShortDate(weekStart)}</p>
          <h1 className="title-1">Plan</h1>
        </div>
        <div className="week-nav" role="group" aria-label="Choose week">
          <button type="button" className="btn btn-icon btn-quiet" aria-label="Previous week" onClick={() => setWeekStart((w) => addDays(w, -7))}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" className="btn btn-small" disabled={isThisWeek} onClick={() => setWeekStart(startOfWeek(today))}>
            This week
          </button>
          <button type="button" className="btn btn-icon btn-quiet" aria-label="Next week" onClick={() => setWeekStart((w) => addDays(w, 7))}>
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <LayoutGroup>
        <WeekGrid days={days} phases={phases} pending={pending} />
        <WeekList days={days} phases={phases} pending={pending} />
      </LayoutGroup>

      <p className="plan-legend footnote muted">
        Phase bands are estimates from your logged dates, and their edges are uncertain. They are hints for planning around how you feel, never limits on what you can do.
      </p>

      {createPortal(
        <AnimatePresence>
          {pending.length > 0 ? (
            <motion.div
              className="plan-bar-dock"
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
            >
              <Glass radius={28} className="plan-bar">
                <span className="plan-bar-text">
                  <strong className="num">{pending.length}</strong> {pending.length === 1 ? 'suggestion' : 'suggestions'} from Cadence
                  <span className="muted"> · nothing changes until you approve</span>
                </span>
                <span className="plan-bar-actions">
                  <button type="button" className="btn btn-small btn-quiet" onClick={() => go('guide')}>
                    Why?
                  </button>
                  <button type="button" className="btn btn-small btn-quiet" onClick={() => pendingProposals.forEach((p) => dispatch({ type: 'declineAll', proposalId: p.id }))}>
                    Decline all
                  </button>
                  <button type="button" className="btn btn-small btn-primary" onClick={() => pendingProposals.forEach((p) => dispatch({ type: 'approveAll', proposalId: p.id }))}>
                    <Check size={16} strokeWidth={2.6} aria-hidden="true" />
                    Approve all
                  </button>
                </span>
              </Glass>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

function PhaseCell({ phase }: { phase: DayPhase }) {
  if (!phase) return <div className="phase-cell is-unknown">No estimate</div>;
  const style: CSSProperties | undefined = phase.couldBe
    ? { background: `linear-gradient(90deg, var(--${phase.phase}-tint) 35%, var(--${phase.couldBe}-tint))` }
    : undefined;
  return (
    <div className={`phase-cell phase-${phase.phase}`} style={style}>
      <span className="swatch" aria-hidden="true" />
      <span>
        {PHASE_LABELS[phase.phase]}
        {phase.couldBe ? <span className="maybe"> or {PHASE_LABELS[phase.couldBe].toLowerCase()}</span> : null}
      </span>
    </div>
  );
}

function suggestionsFor(pending: Pending[], eventId: string) {
  return pending.filter(({ item }) => {
    const c = item.change;
    return (c.kind === 'moveEvent' || c.kind === 'editEvent') ? c.eventId === eventId : c.kind === 'removeEvent' ? c.event.id === eventId : false;
  });
}

function WeekGrid({ days, phases, pending }: { days: ISODate[]; phases: DayPhase[]; pending: Pending[] }) {
  const { state, today } = useReady();
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60);

  return (
    <div className="week card" role="grid" aria-label="Week calendar">
      <div className="week-head" role="row">
        <div className="gutter" />
        {days.map((date, i) => (
          <div key={date} className={`day-head${date === today ? ' is-today' : ''}`} role="columnheader">
            <span className="day-name">{shortDayName(date)}</span>
            <span className="day-num num">{Number(date.slice(8))}</span>
            <PhaseCell phase={phases[i] ?? null} />
          </div>
        ))}
      </div>
      <div className="week-body" style={{ height: (hours.length - 1) * HOUR_PX + 12 }}>
        <div className="gutter hours" aria-hidden="true">
          {hours.map((m) => (
            <span key={m} style={{ top: top(m) }}>
              {formatClock(m)}
            </span>
          ))}
        </div>
        {days.map((date) => {
          const events = state.data.events.filter((e) => dateOf(e.start) === date);
          const ghosts = pending.filter(({ item }) => ghostSlot(item.change)?.date === date);
          return (
            <div key={date} className={`day-col${date === today ? ' is-today' : ''}`} role="gridcell" aria-label={`${shortDayName(date)} ${formatShortDate(date)}`}>
              {hours.slice(0, -1).map((m) => (
                <span key={m} className="hour-line" style={{ top: top(m) }} aria-hidden="true" />
              ))}
              {events.map((e) => (
                <EventBlock key={e.id} event={e} suggestions={suggestionsFor(pending, e.id)} />
              ))}
              <AnimatePresence>
                {ghosts.map((g) => (
                  <GhostBlock key={g.item.id} {...g} />
                ))}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ghostSlot(change: AgentChange): { date: ISODate; start: number; end: number; title: string } | null {
  if (change.kind === 'moveEvent') return { date: dateOf(change.to.start), start: minutesOf(change.to.start), end: minutesOf(change.to.end), title: change.title };
  if (change.kind === 'addEvent') return { date: dateOf(change.event.start), start: minutesOf(change.event.start), end: minutesOf(change.event.end), title: change.event.title };
  return null;
}

function EventBlock({ event, suggestions }: { event: CalendarEvent; suggestions: Pending[] }) {
  const start = minutesOf(event.start);
  const end = minutesOf(event.end);
  const Icon = KIND_ICON[event.kind];
  const moving = suggestions.find((s) => s.item.change.kind === 'moveEvent');
  const removing = suggestions.find((s) => s.item.change.kind === 'removeEvent');
  const editing = suggestions.find((s) => s.item.change.kind === 'editEvent');
  const short = end - start < 60;
  const editedTitle = editing && editing.item.change.kind === 'editEvent' ? editing.item.change.after.title : null;

  return (
    <motion.div
      layoutId={`event-${event.id}`}
      layout
      transition={SPRING}
      className={`event load-${event.load}${short ? ' is-short' : ''}${moving ? ' is-moving' : ''}${removing ? ' is-removing' : ''}${editing ? ' is-editing' : ''}`}
      style={{ top: top(start), height: height(start, end), minHeight: editing || removing ? Math.max(92, height(start, end)) : undefined }}
      title={`${event.title}, ${formatClock(event.start)} to ${formatClock(event.end)}`}
    >
      <span className="event-title">
        <Icon size={13} strokeWidth={2.2} aria-hidden="true" />
        <span>{event.title}</span>
        {event.flexibility === 'fixed' ? <Lock size={11} strokeWidth={2.4} className="fixed" aria-label="Fixed" /> : null}
      </span>
      {short ? null : (
        <span className="event-time num">
          {formatClock(event.start)} to {formatClock(event.end)}
        </span>
      )}
      {editing && editedTitle ? (
        <span className="event-edit">
          <span className="suggested-label">Suggested</span>
          <span className="edit-title">{editedTitle}</span>
          <MiniActions pending={editing} />
        </span>
      ) : null}
      {removing ? (
        <span className="event-edit">
          <span className="suggested-label">Suggested: remove</span>
          <MiniActions pending={removing} />
        </span>
      ) : null}
      {!short && !editing ? <LoadMeter load={event.load} /> : null}
    </motion.div>
  );
}

function GhostBlock({ proposal, item }: Pending) {
  const slot = ghostSlot(item.change);
  if (!slot) return null;
  const layoutId = item.change.kind === 'addEvent' ? `event-${item.change.event.id}` : undefined;
  return (
    <motion.div
      layoutId={layoutId}
      className={`ghost${slot.end - slot.start <= 75 ? ' is-short' : ''}`}
      style={{ top: top(slot.start), height: height(slot.start, slot.end) }}
      initial={{ opacity: 0, scale: 0.94, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
      transition={SPRING}
    >
      <span className="suggested-label">{item.change.kind === 'moveEvent' ? 'Move here' : 'Suggested'}</span>
      <span className="ghost-title">{slot.title}</span>
      <span className="ghost-time num">
        {formatClock(slot.start)} to {formatClock(slot.end)}
      </span>
      <MiniActions pending={{ proposal, item }} />
    </motion.div>
  );
}

function MiniActions({ pending: { proposal, item } }: { pending: Pending }) {
  const { dispatch } = useReady();
  const title = describeChange(item.change).title;
  const ids = { proposalId: proposal.id, itemId: item.id };
  return (
    <span className="mini-actions">
      <button type="button" className="mini decline" onClick={() => dispatch({ type: 'decline', ...ids })} aria-label={`Decline: ${title}`} title="Decline">
        <X size={14} strokeWidth={2.6} />
      </button>
      <button type="button" className="mini approve" onClick={() => dispatch({ type: 'approve', ...ids })} aria-label={`Approve: ${title}`} title="Approve">
        <Check size={14} strokeWidth={2.8} />
      </button>
    </span>
  );
}

/** Phone layout: one list per day, with suggestions shown inline where they would land. */
function WeekList({ days, phases, pending }: { days: ISODate[]; phases: DayPhase[]; pending: Pending[] }) {
  const { state, today } = useReady();
  return (
    <div className="week-list">
      {days.map((date, i) => {
        const events = state.data.events.filter((e) => dateOf(e.start) === date);
        const added = pending.filter(({ item }) => item.change.kind === 'addEvent' && dateOf(item.change.event.start) === date);
        const phase = phases[i];
        return (
          <section key={date} className={`day-section card${date === today ? ' is-today' : ''}`} aria-label={`${shortDayName(date)} ${formatShortDate(date)}`}>
            <header className="day-section-head">
              <h2 className="title-3">
                {shortDayName(date)} <span className="num muted">{formatShortDate(date)}</span>
              </h2>
              {phase ? (
                <span className={`phase-pill phase-${phase.phase}`}>
                  <span className="swatch" aria-hidden="true" />
                  {PHASE_LABELS[phase.phase]}
                  {phase.couldBe ? ` or ${PHASE_LABELS[phase.couldBe].toLowerCase()}` : ''}
                </span>
              ) : null}
            </header>
            {events.length === 0 && added.length === 0 ? <p className="footnote muted">Nothing planned.</p> : null}
            <ol className="day-items">
              {events.map((e) => (
                <li key={e.id} className="day-item">
                  <span className="num time">{formatClock(e.start)}</span>
                  <span className="what">
                    <span className="title">
                      {e.title}
                      {e.flexibility === 'fixed' ? <Lock size={12} strokeWidth={2.4} className="fixed" aria-label="Fixed" /> : null}
                    </span>
                    {suggestionsFor(pending, e.id).map(({ proposal, item }) => (
                      <span key={item.id} className="inline-suggestion">
                        <span className="footnote">
                          <strong>Suggested:</strong> {describeChange(item.change).title}
                        </span>
                        <BeforeAfter item={item} />
                        <ItemActions proposal={proposal} item={item} />
                      </span>
                    ))}
                  </span>
                </li>
              ))}
              {added.map(({ proposal, item }) => (
                <li key={item.id} className="day-item">
                  <span className="inline-suggestion">
                    <span className="footnote">
                      <strong>Suggested:</strong> {describeChange(item.change).title}
                    </span>
                    <BeforeAfter item={item} />
                    <ItemActions proposal={proposal} item={item} />
                  </span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
