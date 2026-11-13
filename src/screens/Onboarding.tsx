import { ArrowLeft, ArrowRight, CalendarRange, HardDrive, Hand, Sparkles, Stethoscope, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { useApp } from '../app/AppProvider.tsx';
import { liveSample } from '../domain/sample.ts';
import { compareDates, parseISODate } from '../domain/time.ts';
import { CYCLE_LENGTH_BOUNDS, PERIOD_LENGTH_BOUNDS, type CycleProfile, type Regularity } from '../domain/types.ts';
import { Glass } from '../ui/Glass.tsx';
import { LogoMark } from '../ui/Logo.tsx';
import { Segmented, Stepper } from '../ui/Segmented.tsx';
import '../styles/onboarding.css';

const STEPS = ['Your cycle', 'Your privacy', 'Your week'] as const;

const PROMISES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: HardDrive, title: 'It stays on this computer', body: 'No account and no Cadence server. Your logs live in this browser, and you can export or delete them any time.' },
  { icon: Hand, title: 'The agent only suggests', body: 'Cadence’s AI can read your plans and suggest changes. Nothing changes until you approve it, and you can undo what you approve.' },
  { icon: Stethoscope, title: 'Not medical advice', body: 'Cadence is a planner. It cannot diagnose anything, and it will tell you when something is worth seeing a clinician about.' },
  { icon: CalendarRange, title: 'Estimates, not facts', body: 'Phase dates are ranges based on what you log. Never use them for birth control or for planning a pregnancy.' },
];

export function Onboarding() {
  const { dispatch, session } = useApp();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [lastStart, setLastStart] = useState('');
  const [unknownDate, setUnknownDate] = useState(false);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [regularity, setRegularity] = useState<Regularity>('regular');

  const parsed = parseISODate(lastStart);
  const dateOk = unknownDate || (parsed !== null && compareDates(parsed, session.today) <= 0);
  const profile: CycleProfile = {
    periodStarts: !unknownDate && parsed ? [parsed] : [],
    typicalCycleLength: cycleLength,
    typicalPeriodLength: periodLength,
    regularity,
  };

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const start = (sample: boolean) => {
    dispatch({
      type: 'start',
      data: sample ? liveSample(session.today, profile) : { profile, events: [], habits: [], habitLog: {}, checkIns: {} },
    });
    window.location.hash = '/today';
  };

  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 40 * direction, filter: 'blur(3px)' },
        animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
        exit: { opacity: 0, x: -30 * direction, filter: 'blur(2px)', transition: { duration: 0.16 } },
      };

  return (
    <div className="onboarding">
      <header className="onb-head">
        <span className="onb-brand">
          <LogoMark size={34} />
          <span className="serif">Cadence</span>
        </span>
        <Glass radius={20} className="onb-steps" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span key={s} className={`onb-step${i === step ? ' is-current' : i < step ? ' is-done' : ''}`}>
              <span className="num">{i + 1}</span>
              {s}
            </span>
          ))}
        </Glass>
      </header>

      <main className="onb-main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.section key={step} className="onb-card card" {...slide} transition={{ type: 'spring', bounce: 0, duration: 0.45 }}>
            {step === 0 ? (
              <>
                <h1 className="title-1">Your week, in step with your cycle.</h1>
                <p className="muted onb-lede">A few basics so Cadence can estimate where you are. Rough answers are fine, and you can change them later.</p>
                <div className="onb-field">
                  <label htmlFor="last-start" className="row-label">
                    When did your last period start?
                  </label>
                  <div className="onb-date">
                    <input id="last-start" type="date" className="field-date" value={lastStart} max={session.today} disabled={unknownDate} onChange={(e) => setLastStart(e.target.value)} />
                    <label className="check">
                      <input type="checkbox" checked={unknownDate} onChange={(e) => setUnknownDate(e.target.checked)} />
                      I don’t remember
                    </label>
                  </div>
                </div>
                <div className="onb-field">
                  <span className="row-label">How long is your cycle, usually?</span>
                  <Stepper label="Usual cycle length" value={cycleLength} min={CYCLE_LENGTH_BOUNDS.min} max={CYCLE_LENGTH_BOUNDS.max} unit="days" onChange={setCycleLength} />
                </div>
                <div className="onb-field">
                  <span className="row-label">And your period?</span>
                  <Stepper label="Usual period length" value={periodLength} min={PERIOD_LENGTH_BOUNDS.min} max={PERIOD_LENGTH_BOUNDS.max} unit="days" onChange={setPeriodLength} />
                </div>
                <div className="onb-field">
                  <span className="row-label">How regular is it?</span>
                  <Segmented<Regularity>
                    label="How regular"
                    value={regularity}
                    options={[
                      { value: 'regular', label: 'Regular' },
                      { value: 'irregular', label: 'Irregular' },
                      { value: 'unsure', label: 'Not sure' },
                    ]}
                    onChange={setRegularity}
                  />
                </div>
                <div className="onb-actions">
                  <span />
                  <button type="button" className="btn btn-primary" disabled={!dateOk} onClick={() => goTo(1)}>
                    Continue
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                </div>
              </>
            ) : step === 1 ? (
              <>
                <h1 className="title-1">Four promises</h1>
                <p className="muted onb-lede">Plain words, because this is personal data.</p>
                <ul className="promises">
                  {PROMISES.map(({ icon: Icon, title, body }) => (
                    <li key={title}>
                      <span className="promise-icon" aria-hidden="true">
                        <Icon size={20} strokeWidth={2} />
                      </span>
                      <div>
                        <p className="title-3">{title}</p>
                        <p className="callout muted">{body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="onb-actions">
                  <button type="button" className="btn btn-quiet" onClick={() => goTo(0)}>
                    <ArrowLeft size={17} aria-hidden="true" />
                    Back
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => goTo(2)}>
                    I understand
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="title-1">How would you like to start?</h1>
                <p className="muted onb-lede">A sample week is the quickest way to see what Cadence and its Guide can do.</p>
                <div className="start-choices">
                  <button type="button" className="start-choice is-primary" onClick={() => start(true)}>
                    <Sparkles size={22} aria-hidden="true" />
                    <span className="title-3">Start with a sample week</span>
                    <span className="callout muted">Classes, a midterm, café shifts, workouts, and plans with friends, plus a few weeks of sample check-ins for the Guide to read.</span>
                  </button>
                  <button type="button" className="start-choice" onClick={() => start(false)}>
                    <CalendarRange size={22} aria-hidden="true" />
                    <span className="title-3">Start blank</span>
                    <span className="callout muted">An empty week. Add your own check-ins as you go.</span>
                  </button>
                </div>
                <div className="onb-actions">
                  <button type="button" className="btn btn-quiet" onClick={() => goTo(1)}>
                    <ArrowLeft size={17} aria-hidden="true" />
                    Back
                  </button>
                  <span />
                </div>
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}
