import { Download, Plus, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useReady } from '../app/AppProvider.tsx';
import { clearStorage } from '../app/session.ts';
import type { ThemeChoice } from '../app/store.ts';
import { SYSTEM_PROMPT } from '../agent/systemPrompt.ts';
import { MODELS, type ModelId } from '../domain/agent.ts';
import { compareDates, formatShortDate, parseISODate, type ISODate } from '../domain/time.ts';
import { CYCLE_LENGTH_BOUNDS, normalizePeriodStarts, PERIOD_LENGTH_BOUNDS, type CycleProfile, type Regularity } from '../domain/types.ts';
import { Glass } from '../ui/Glass.tsx';
import { Segmented, Stepper } from '../ui/Segmented.tsx';
import '../styles/settings.css';

export function Settings() {
  const { state, dispatch, bridge, agent, session } = useReady();
  const [confirming, setConfirming] = useState(false);
  const theme = session.themeOverride ?? state.settings.theme;

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), app: 'Cadence', data: state.data, proposals: state.proposals, chat: state.chat }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadence-export-${session.today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteEverything = () => {
    clearStorage(session);
    dispatch({ type: 'reset' });
    window.location.hash = '/today';
  };

  return (
    <div className="page settings">
      <header className="settings-head">
        <h1 className="title-1">Settings</h1>
      </header>

      <Group title="Agent">
        <Row label="Bridge" detail="Runs on this computer and uses your Claude Code login. No API key.">
          <span className={`bridge-state is-${agent.mode === 'replay' ? 'replay' : bridge}`}>
            <span className="dot" aria-hidden="true" />
            {agent.mode === 'replay' ? 'Replaying a recording' : bridge === 'online' ? 'Connected' : bridge === 'offline' ? 'Not running' : 'Checking'}
          </span>
        </Row>
        {bridge === 'offline' && agent.mode === 'live' ? (
          <p className="group-note">
            Start it with <code>npm run dev</code> from the project folder. The Guide connects on its own once it is up.
          </p>
        ) : null}
        <Row label="Model" detail={MODELS.find((m) => m.id === state.settings.model)?.note}>
          <Segmented<ModelId>
            label="Model"
            value={state.settings.model}
            options={MODELS.map((m) => ({ value: m.id, label: m.label.replace('Claude ', '') }))}
            onChange={(model) => dispatch({ type: 'settings', patch: { model } })}
          />
        </Row>
      </Group>

      <Group title="Appearance">
        <Row label="Theme">
          <Segmented<ThemeChoice>
            label="Theme"
            value={theme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={(t) => dispatch({ type: 'settings', patch: { theme: t } })}
          />
        </Row>
      </Group>

      <CycleSettings />

      <Group title="Your data">
        <Row label="Export" detail="Everything Cadence stores, as a JSON file you keep.">
          <button type="button" className="btn btn-small" onClick={exportData}>
            <Download size={16} aria-hidden="true" />
            Export my data
          </button>
        </Row>
        <Row label="Delete everything" detail="Removes your calendar, habits, check-ins, suggestions, and chat from this browser.">
          <button type="button" className="btn btn-small btn-danger" onClick={() => setConfirming(true)}>
            <Trash2 size={16} aria-hidden="true" />
            Delete
          </button>
        </Row>
      </Group>

      <Group title="The agent's instructions">
        <p className="group-note">This is the whole system prompt Cadence's agent runs with, word for word. Your message and today's date come after it.</p>
        <pre className="prompt">{SYSTEM_PROMPT}</pre>
      </Group>

      <p className="footnote muted settings-foot">Cadence 1.0, a CS 110 project. A planning tool, not medical advice.</p>

      {createPortal(
        <AnimatePresence>
          {confirming ? (
            <motion.div className="sheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirming(false)}>
              <motion.div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', bounce: 0.12, duration: 0.4 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Glass radius={30} className="confirm-sheet" frost={22}>
                  <h2 id="confirm-title" className="title-2">
                    Delete everything?
                  </h2>
                  <p className="muted">Your calendar, habits, check-ins, suggestions, and chat will be removed from this browser. This cannot be undone. Export first if you want a copy.</p>
                  <div className="confirm-actions">
                    <button type="button" className="btn" autoFocus onClick={() => setConfirming(false)}>
                      <X size={16} aria-hidden="true" />
                      Keep my data
                    </button>
                    <button type="button" className="btn btn-danger" onClick={deleteEverything}>
                      <Trash2 size={16} aria-hidden="true" />
                      Delete everything
                    </button>
                  </div>
                </Glass>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="group" aria-label={title}>
      <h2 className="eyebrow group-title">{title}</h2>
      <div className="card group-card">{children}</div>
    </section>
  );
}

function Row({ label, detail, children }: { label: string; detail?: string; children: React.ReactNode }) {
  return (
    <div className="row">
      <div className="row-text">
        <p className="row-label">{label}</p>
        {detail ? <p className="footnote muted">{detail}</p> : null}
      </div>
      <div className="row-control">{children}</div>
    </div>
  );
}

function CycleSettings() {
  const { state, dispatch, today } = useReady();
  const profile = state.data.profile;
  const [newDate, setNewDate] = useState('');

  const update = (after: CycleProfile) => dispatch({ type: 'change', change: { kind: 'setProfile', before: profile, after } });
  const parsed = parseISODate(newDate);
  const canAdd = parsed !== null && compareDates(parsed, today) <= 0 && !profile.periodStarts.includes(parsed);
  const recent = [...profile.periodStarts].reverse().slice(0, 6);

  return (
    <Group title="Your cycle">
      <Row label="Period starts" detail="The first day of each period you have logged. More dates make the estimate sharper.">
        <span className="date-add">
          <input type="date" className="field-date" value={newDate} max={today} onChange={(e) => setNewDate(e.target.value)} aria-label="Add a period start date" />
          <button
            type="button"
            className="btn btn-small btn-primary"
            disabled={!canAdd}
            onClick={() => {
              if (!parsed) return;
              update({ ...profile, periodStarts: normalizePeriodStarts([...profile.periodStarts, parsed]) });
              setNewDate('');
            }}
          >
            <Plus size={16} aria-hidden="true" />
            Add
          </button>
        </span>
      </Row>
      {recent.length ? (
        <ul className="start-list">
          {recent.map((date: ISODate) => (
            <li key={date} className="chip num">
              {formatShortDate(date)}, {date.slice(0, 4)}
              <button type="button" aria-label={`Remove ${formatShortDate(date)}`} onClick={() => update({ ...profile, periodStarts: profile.periodStarts.filter((d) => d !== date) })}>
                <X size={13} strokeWidth={2.4} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Row label="Usual cycle length" detail="From the first day of one period to the day before the next.">
        <Stepper label="Usual cycle length" value={profile.typicalCycleLength} min={CYCLE_LENGTH_BOUNDS.min} max={CYCLE_LENGTH_BOUNDS.max} unit="days" onChange={(v) => update({ ...profile, typicalCycleLength: v })} />
      </Row>
      <Row label="Usual period length">
        <Stepper label="Usual period length" value={profile.typicalPeriodLength} min={PERIOD_LENGTH_BOUNDS.min} max={PERIOD_LENGTH_BOUNDS.max} unit="days" onChange={(v) => update({ ...profile, typicalPeriodLength: v })} />
      </Row>
      <Row label="How regular" detail="Irregular or not sure makes the predicted windows wider.">
        <Segmented<Regularity>
          label="How regular"
          value={profile.regularity}
          options={[
            { value: 'regular', label: 'Regular' },
            { value: 'irregular', label: 'Irregular' },
            { value: 'unsure', label: 'Not sure' },
          ]}
          onChange={(regularity) => update({ ...profile, regularity })}
        />
      </Row>
    </Group>
  );
}
