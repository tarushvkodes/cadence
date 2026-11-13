import { ArrowRight, Check, ChevronDown, Droplet, Lock, MapPin, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useReady } from '../app/AppProvider.tsx';
import { go } from '../app/routes.ts';
import { changeEventId, describeChange } from '../domain/changes.ts';
import { CONFIDENCE_LABELS, PHASE_LABELS, type PhaseEstimate } from '../domain/cycle.ts';
import { phaseInsight } from '../domain/insights.ts';
import { dateOf, dayName, formatClock, formatRange, formatShortDate } from '../domain/time.ts';
import {
  ENERGY_LABELS,
  habitForPhase,
  habitScheduledOn,
  isLevel,
  MOOD_LABELS,
  normalizePeriodStarts,
  SYMPTOMS,
  type CheckIn,
  type Level,
  type Phase,
  type Symptom,
} from '../domain/types.ts';
import { weekdayOf } from '../domain/time.ts';
import { phaseGuide, STANCE } from '../content/evidence.ts';
import { CycleDial } from '../ui/CycleDial.tsx';
import { KIND_ICON, LoadMeter } from '../ui/eventMeta.tsx';
import { BeforeAfter, ItemActions } from '../ui/Suggestion.tsx';
import '../styles/today.css';

type Estimate = Extract<PhaseEstimate, { kind: 'estimate' }>;

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, bounce: 0, duration: 0.5, delay: 0.06 * i },
});

export function Today() {
  const { estimate, today } = useReady();
  return (
    <div className="page today">
      <header className="today-head">
        <p className="eyebrow num">{dayName(today)}, {formatShortDate(today)}</p>
        <h1 className="title-1">{greeting(estimate)}</h1>
      </header>
      <div className="today-grid">
        <section className="today-hero" aria-label="Your cycle">
          {estimate?.kind === 'estimate' ? <DialHero estimate={estimate} /> : <NoCycleData />}
        </section>
        <div className="today-cards">
          {estimate?.kind === 'estimate' ? (
            <motion.div {...stagger(0)}>
              <NoticeCard phase={estimate.phase} />
            </motion.div>
          ) : null}
          <motion.div {...stagger(1)}>
            <CheckInCard />
          </motion.div>
          <motion.div {...stagger(2)}>
            <ScheduleCard />
          </motion.div>
          <motion.div {...stagger(3)}>
            <HabitsCard phase={estimate?.kind === 'estimate' ? estimate.phase : null} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function greeting(estimate: PhaseEstimate | null): string {
  if (!estimate || estimate.kind !== 'estimate') return 'Welcome to your week';
  if (estimate.phase === 'menstrual' && estimate.cycleDay <= 2 && estimate.cyclesProjected === 0) return 'Go gently today';
  return 'Here is your day';
}

function DialHero({ estimate }: { estimate: Estimate }) {
  const { state, dispatch, today } = useReady();
  const [why, setWhy] = useState(false);
  const profile = state.data.profile;
  const loggedToday = profile.periodStarts.includes(today);
  const range = estimate.windows.nextPeriod;

  const logPeriod = () =>
    dispatch({
      type: 'change',
      change: { kind: 'setProfile', before: profile, after: { ...profile, periodStarts: normalizePeriodStarts([...profile.periodStarts, today]) } },
      notice: 'Logged your period starting today.',
    });

  return (
    <div className={`dial-hero phase-${estimate.phase}`}>
      <div className="dial-wrap">
        <CycleDial estimate={estimate} />
        <div className="dial-center">
          <span className="eyebrow">Day</span>
          <span className="dial-day serif num">{estimate.cycleDay}</span>
          <span className="dial-of num">of about {estimate.cycleLength}</span>
        </div>
      </div>

      <div className="dial-caption">
        <p className="phase-line">
          <span className="phase-pill">
            <span className="swatch" aria-hidden="true" />
            {PHASE_LABELS[estimate.phase]} phase
          </span>
          {estimate.couldBe ? <span className="could-be">could be {PHASE_LABELS[estimate.couldBe].toLowerCase()}</span> : null}
        </p>
        <dl className="dial-facts">
          <div>
            <dt>Next period likely</dt>
            <dd className="num">{formatRange(range)}</dd>
          </div>
          <div>
            <dt>Estimate</dt>
            <dd>
              <button type="button" className="link-button" aria-expanded={why} onClick={() => setWhy((v) => !v)}>
                {CONFIDENCE_LABELS[estimate.confidence]}
                <ChevronDown size={15} strokeWidth={2.2} className={why ? 'flip' : undefined} aria-hidden="true" />
              </button>
            </dd>
          </div>
        </dl>
        <AnimatePresence initial={false}>
          {why ? (
            <motion.div className="why" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', bounce: 0, duration: 0.35 }}>
              <ul>
                {estimate.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
                <li>Windows are ranges because cycles vary. This is never reliable for birth control or for planning a pregnancy.</li>
              </ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {loggedToday ? null : (
          <button type="button" className="btn btn-small log-period" onClick={logPeriod}>
            <Droplet size={16} strokeWidth={2.2} aria-hidden="true" />
            My period started today
          </button>
        )}
      </div>
    </div>
  );
}

function NoCycleData() {
  return (
    <div className="card empty-cycle">
      <h2 className="title-2">Add your last period to see your cycle</h2>
      <p className="muted">Cadence works without it, but the dial and the phase hints need at least one start date.</p>
      <button type="button" className="btn btn-primary" onClick={() => go('settings')}>
        Add a date
        <ArrowRight size={17} aria-hidden="true" />
      </button>
    </div>
  );
}

function NoticeCard({ phase }: { phase: Phase }) {
  const { state } = useReady();
  const guide = phaseGuide(phase);
  const insight = useMemo(() => phaseInsight(state.data, phase), [state.data, phase]);
  const label = PHASE_LABELS[phase].toLowerCase();

  return (
    <section className={`card notice-card phase-${phase}`} aria-labelledby="notice-title">
      <div className="card-head">
        <h2 id="notice-title" className="title-3">
          What you might notice
        </h2>
        <span className="chip">Hints, not rules</span>
      </div>
      {insight.days >= 3 ? (
        <p className="own-logs">
          <span className="own-label">From your own check-ins</span>
          In your {label} phase you have logged {insight.days} days.
          {insight.avgEnergy !== null ? ` Energy averaged ${insight.avgEnergy.toFixed(1)} of 5.` : ''}
          {insight.topSymptoms.length
            ? ` Most often: ${insight.topSymptoms.map((s) => `${s.symptom} (${s.count})`).join(', ')}.`
            : ' No symptoms stood out.'}
        </p>
      ) : (
        <p className="own-logs">
          <span className="own-label">From your own check-ins</span>
          Not enough check-ins in this phase yet. A few more and Cadence can show your own pattern here.
        </p>
      )}
      <ul className="might-notice">
        {guide.mightNotice.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <p className="stance">
        {STANCE.headline}{' '}
        <a href="#/learn" className="inline-link">
          What the research says
        </a>
      </p>
    </section>
  );
}

const SHOWN_SYMPTOMS: Symptom[] = ['cramps', 'fatigue', 'headache', 'bloating', 'poor sleep', 'back pain', 'cravings', 'low mood', 'anxious', 'heavy flow'];

function LevelPicker({ label, labels, value, onChange }: { label: string; labels: Record<Level, string>; value: Level | null; onChange: (v: Level) => void }) {
  return (
    <fieldset className="level-picker">
      <legend className="footnote muted">{label}</legend>
      <div className="level-options" role="radiogroup" aria-label={label}>
        {([1, 2, 3, 4, 5] as Level[]).map((level) => {
          const checked = value === level;
          return (
            <button key={level} type="button" role="radio" aria-checked={checked} className="level-option" onClick={() => onChange(level)}>
              {checked ? <motion.span layoutId={`${label}-lens`} className="level-lens" transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }} /> : null}
              <span className="level-dots" aria-hidden="true">
                {Array.from({ length: level }, (_, i) => (
                  <i key={i} />
                ))}
              </span>
              <span className="level-text">{labels[level]}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function CheckInCard() {
  const { state, dispatch, today } = useReady();
  const existing = state.data.checkIns[today] ?? null;
  const [editing, setEditing] = useState(existing === null);
  const [energy, setEnergy] = useState<Level | null>(existing?.energy ?? null);
  const [mood, setMood] = useState<Level | null>(existing?.mood ?? null);
  const [symptoms, setSymptoms] = useState<Symptom[]>([...(existing?.symptoms ?? [])]);
  const [note, setNote] = useState(existing?.note ?? '');
  const [moreSymptoms, setMoreSymptoms] = useState(false);

  const toggle = (s: Symptom) => setSymptoms((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]));
  const shown = moreSymptoms ? SYMPTOMS : SHOWN_SYMPTOMS;

  const save = () => {
    if (!energy || !mood || !isLevel(energy) || !isLevel(mood)) return;
    const after: CheckIn = { date: today, energy, mood, symptoms, ...(note.trim() ? { note: note.trim() } : {}) };
    dispatch({ type: 'change', change: { kind: 'setCheckIn', date: today, before: existing, after }, notice: 'Check-in saved.' });
    setEditing(false);
  };

  if (existing && !editing) {
    return (
      <section className="card checkin-card is-done" aria-labelledby="checkin-title">
        <div className="card-head">
          <h2 id="checkin-title" className="title-3">
            Today's check-in
          </h2>
          <button type="button" className="btn btn-small btn-quiet" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
        <div className="checkin-summary">
          <span className="chip">Energy: {ENERGY_LABELS[existing.energy]}</span>
          <span className="chip">Mood: {MOOD_LABELS[existing.mood]}</span>
          {existing.symptoms.map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
        </div>
        {existing.note ? <p className="callout muted">“{existing.note}”</p> : null}
      </section>
    );
  }

  return (
    <section className="card checkin-card" aria-labelledby="checkin-title">
      <div className="card-head">
        <h2 id="checkin-title" className="title-3">
          How are you, really?
        </h2>
        <span className="chip">10 seconds</span>
      </div>
      <LevelPicker label="Energy" labels={ENERGY_LABELS} value={energy} onChange={setEnergy} />
      <LevelPicker label="Mood" labels={MOOD_LABELS} value={mood} onChange={setMood} />
      <fieldset className="symptoms">
        <legend className="footnote muted">Anything else? Tap all that fit.</legend>
        <div className="symptom-chips">
          {shown.map((s) => (
            <button key={s} type="button" className="symptom" aria-pressed={symptoms.includes(s)} onClick={() => toggle(s)}>
              {symptoms.includes(s) ? <Check size={14} strokeWidth={2.6} aria-hidden="true" /> : null}
              {s}
            </button>
          ))}
          {moreSymptoms ? null : (
            <button type="button" className="symptom more" onClick={() => setMoreSymptoms(true)}>
              <Plus size={14} strokeWidth={2.4} aria-hidden="true" />
              More
            </button>
          )}
        </div>
      </fieldset>
      <label className="note-field">
        <span className="visually-hidden">Note</span>
        <input type="text" placeholder="Add a note, if you like" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </label>
      <div className="card-foot">
        <span className="footnote muted">Saved on this computer only.</span>
        <button type="button" className="btn btn-primary" disabled={!energy || !mood} onClick={save}>
          Save check-in
        </button>
      </div>
    </section>
  );
}

function ScheduleCard() {
  const { state, today } = useReady();
  const events = state.data.events.filter((e) => dateOf(e.start) === today);
  const suggestions = state.proposals.flatMap((p) =>
    p.items.filter((i) => i.status === 'pending').map((item) => ({ proposal: p, item, eventId: changeEventId(item.change) })),
  );
  const forEvent = (id: string) => suggestions.filter((s) => s.eventId === id);
  const newToday = suggestions.filter((s) => s.item.change.kind === 'addEvent' && dateOf(s.item.change.event.start) === today);

  return (
    <section className="card schedule-card" aria-labelledby="schedule-title">
      <div className="card-head">
        <h2 id="schedule-title" className="title-3">
          Today's schedule
        </h2>
        <a href="#/plan" className="btn btn-small btn-quiet">
          Week
          <ArrowRight size={15} aria-hidden="true" />
        </a>
      </div>
      {events.length === 0 && newToday.length === 0 ? <p className="empty muted">Nothing on the calendar today.</p> : null}
      <ol className="schedule">
        {events.map((e) => {
          const Icon = KIND_ICON[e.kind];
          return (
            <li key={e.id} className="schedule-item">
              <span className="time num">{formatClock(e.start)}</span>
              <span className="kind-icon" aria-hidden="true">
                <Icon size={17} strokeWidth={2} />
              </span>
              <div className="what">
                <p className="title">
                  {e.title}
                  {e.flexibility === 'fixed' ? <Lock size={13} strokeWidth={2.2} className="fixed" aria-label="Fixed" /> : null}
                </p>
                <p className="footnote muted num">
                  {formatClock(e.start)} to {formatClock(e.end)}
                  {e.location ? (
                    <>
                      {' '}
                      · <MapPin size={12} strokeWidth={2} className="inline-icon" aria-hidden="true" /> {e.location}
                    </>
                  ) : null}
                </p>
              </div>
              <LoadMeter load={e.load} />
              {forEvent(e.id).map(({ proposal, item }) => (
                <div key={item.id} className="inline-suggestion">
                  <p className="footnote">
                    <strong>Suggested:</strong> {describeChange(item.change).title}
                  </p>
                  <BeforeAfter item={item} />
                  <ItemActions proposal={proposal} item={item} />
                </div>
              ))}
            </li>
          );
        })}
        {newToday.map(({ proposal, item }) => (
          <li key={item.id} className="schedule-item ghost">
            <div className="inline-suggestion">
              <p className="footnote">
                <strong>Suggested:</strong> {describeChange(item.change).title}
              </p>
              <BeforeAfter item={item} />
              <ItemActions proposal={proposal} item={item} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function HabitsCard({ phase }: { phase: Phase | null }) {
  const { state, dispatch, today } = useReady();
  const habits = state.data.habits.filter((h) => habitScheduledOn(h, weekdayOf(today)));
  const done = new Set(state.data.habitLog[today] ?? []);

  return (
    <section className="card habits-card" aria-labelledby="habits-title">
      <div className="card-head">
        <h2 id="habits-title" className="title-3">
          Today's habits
        </h2>
        <span className="footnote muted num">
          {habits.filter((h) => done.has(h.id)).length} of {habits.length}
        </span>
      </div>
      {habits.length === 0 ? <p className="empty muted">No habits scheduled today.</p> : null}
      <ul className="habits">
        {habits.map((h) => {
          const shown = habitForPhase(h, phase);
          const isDone = done.has(h.id);
          return (
            <li key={h.id}>
              <button
                type="button"
                className={`habit${isDone ? ' is-done' : ''}`}
                aria-pressed={isDone}
                onClick={() => dispatch({ type: 'change', change: { kind: 'setHabitDone', habitId: h.id, date: today, done: !isDone } })}
              >
                <span className="habit-check" aria-hidden="true">
                  <AnimatePresence>
                    {isDone ? (
                      <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: 'spring', bounce: 0.35, duration: 0.3 }}>
                        <Check size={15} strokeWidth={3} />
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </span>
                <span className="habit-text">
                  <span className="habit-name">{shown.name}</span>
                  {shown.isVariant && phase ? (
                    <span className={`habit-variant phase-${phase}`}>
                      {PHASE_LABELS[phase]} version of “{h.name}”
                    </span>
                  ) : null}
                  {shown.note ? <span className="footnote muted">{shown.note}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
