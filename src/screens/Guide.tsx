import { ArrowUp, CalendarDays, Check, CircleAlert, CircleDot, Eye, ListChecks, NotebookPen, PenLine, Square, WandSparkles, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useReady } from '../app/AppProvider.tsx';
import { MODELS, TOOL_META, TOOL_NAMES, type AssistantMessage, type AssistantPart, type ToolName } from '../domain/agent.ts';
import { Glass } from '../ui/Glass.tsx';
import { Markdown } from '../ui/Markdown.tsx';
import { ProposalCard } from '../ui/ProposalCard.tsx';
import { useSmoothText } from '../ui/useSmoothText.ts';
import '../styles/guide.css';

const TOOL_ICON: Record<ToolName, LucideIcon> = {
  get_cycle_status: CircleDot,
  list_events: CalendarDays,
  list_habits: ListChecks,
  get_check_ins: NotebookPen,
  propose_changes: WandSparkles,
  log_check_in: PenLine,
};

const STARTERS = [
  'Plan my week around my cycle.',
  'Today feels rough, what should I change?',
  'What do my check-ins say about my energy?',
  'When is my next period likely to start?',
];

export function Guide() {
  const { state, agent } = useReady();
  const bottom = useRef<HTMLDivElement | null>(null);
  const pinned = useRef(true);

  useEffect(() => {
    const onScroll = () => {
      pinned.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const last = state.chat.at(-1);
  const lastSize = last?.role === 'assistant' ? last.parts.length + (last.parts.at(-1)?.type === 'text' ? (last.parts.at(-1) as { text: string }).text.length : 0) : 0;
  useLayoutEffect(() => {
    if (pinned.current) bottom.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [state.chat.length, lastSize, state.proposals]);

  const starters = agent.nextPrompt ? [agent.nextPrompt] : STARTERS;
  const model = MODELS.find((m) => m.id === state.settings.model);

  return (
    <div className="page guide">
      <header className="guide-head">
        <div>
          <h1 className="title-1">Guide</h1>
          <p className="muted guide-sub">Cadence reads what you have logged and suggests changes. Nothing changes until you approve it.</p>
        </div>
        <span className="chip model-chip">{agent.mode === 'replay' ? 'Recorded session' : model?.label}</span>
      </header>

      {state.chat.length === 0 ? <EmptyGuide starters={starters} /> : null}

      <div className="thread" aria-live="polite">
        {state.chat.map((m) =>
          m.role === 'user' ? (
            <motion.div key={m.id} className="msg-user" initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}>
              <p>{m.text}</p>
            </motion.div>
          ) : (
            <AssistantReply key={m.id} message={m} />
          ),
        )}
        {state.chat.length > 0 && !agent.busy && agent.nextPrompt ? <NextPrompt prompt={agent.nextPrompt} /> : null}
        <div ref={bottom} className="thread-end" />
      </div>

      <Composer />
    </div>
  );
}

function EmptyGuide({ starters }: { starters: string[] }) {
  const { agent } = useReady();
  return (
    <motion.section className="guide-empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', bounce: 0, duration: 0.5 }}>
      <div className="starters" role="list" aria-label="Things to ask">
        {starters.map((s, i) => (
          <motion.button
            key={s}
            role="listitem"
            type="button"
            className="starter"
            disabled={!agent.canSend}
            onClick={() => agent.send(s)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.45, delay: 0.05 * i }}
          >
            <span>{s}</span>
            <ArrowUp size={17} strokeWidth={2.2} aria-hidden="true" />
          </motion.button>
        ))}
      </div>
      <div className="can-see card">
        <h2 className="title-3">
          <Eye size={18} strokeWidth={2} aria-hidden="true" /> What Cadence can use
        </h2>
        <ul>
          {TOOL_NAMES.map((t) => {
            const Icon = TOOL_ICON[t];
            const meta = TOOL_META[t];
            return (
              <li key={t}>
                <Icon size={16} strokeWidth={2} aria-hidden="true" />
                <span>{meta.plain}</span>
                <span className={`tool-kind kind-${meta.kind}`}>{meta.kind === 'read' ? 'Reads' : 'Suggests'}</span>
              </li>
            );
          })}
        </ul>
        <p className="footnote muted">It has no web access, no files, and no way to change anything on its own.</p>
      </div>
    </motion.section>
  );
}

function NextPrompt({ prompt }: { prompt: string }) {
  const { agent } = useReady();
  return (
    <motion.div className="next-prompt" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
      <button type="button" className="starter" disabled={!agent.canSend} onClick={() => agent.send(prompt)}>
        <span>{prompt}</span>
        <ArrowUp size={17} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </motion.div>
  );
}

type Group = { kind: 'tools'; parts: Extract<AssistantPart, { type: 'tool' }>[] } | { kind: 'text'; text: string; index: number } | { kind: 'proposal'; id: string };

function groupParts(parts: readonly AssistantPart[]): Group[] {
  const groups: Group[] = [];
  parts.forEach((p, index) => {
    const prev = groups.at(-1);
    if (p.type === 'tool') {
      if (prev?.kind === 'tools') prev.parts.push(p);
      else groups.push({ kind: 'tools', parts: [p] });
    } else if (p.type === 'text') groups.push({ kind: 'text', text: p.text, index });
    else groups.push({ kind: 'proposal', id: p.proposalId });
  });
  return groups;
}

function AssistantReply({ message }: { message: AssistantMessage }) {
  const { state } = useReady();
  const groups = groupParts(message.parts);
  const lastText = [...groups].reverse().find((g) => g.kind === 'text');
  const live = message.status === 'thinking' || message.status === 'streaming';

  return (
    <article className="msg-assistant" aria-busy={live}>
      <div className="msg-avatar" aria-hidden="true">
        <span />
      </div>
      <div className="msg-body">
        {groups.map((g, i) => {
          if (g.kind === 'tools') return <ToolSteps key={`t${i}`} parts={g.parts} />;
          if (g.kind === 'proposal') {
            const proposal = state.proposals.find((p) => p.id === g.id);
            return proposal ? <ProposalCard key={g.id} proposal={proposal} /> : null;
          }
          return <StreamedText key={`x${g.index}`} text={g.text} streaming={live && g === lastText} />;
        })}
        <AnimatePresence>
          {message.status === 'thinking' ? (
            <motion.p key="thinking" className="thinking shimmer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
              Thinking
            </motion.p>
          ) : null}
        </AnimatePresence>
        {message.status === 'error' ? (
          <p className="msg-error" role="alert">
            <CircleAlert size={16} strokeWidth={2.2} aria-hidden="true" />
            {message.error}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function StreamedText({ text, streaming }: { text: string; streaming: boolean }) {
  const [startedComplete] = useState(!streaming);
  const smooth = useSmoothText(text, startedComplete);
  return <Markdown text={smooth.text} caret={streaming || smooth.catchingUp} />;
}

function ToolSteps({ parts }: { parts: Extract<AssistantPart, { type: 'tool' }>[] }) {
  return (
    <ol className="tool-steps" aria-label="Steps Cadence took">
      <AnimatePresence initial={false}>
        {parts.map((p) => {
          const Icon = TOOL_ICON[p.tool];
          return (
            <motion.li
              key={p.callId}
              className={`tool-step is-${p.status} kind-${TOOL_META[p.tool].kind}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            >
              <span className="tool-icon" aria-hidden="true">
                <Icon size={15} strokeWidth={2.1} />
              </span>
              <span className={p.status === 'running' ? 'shimmer' : undefined}>{p.status === 'running' ? `${TOOL_META[p.tool].running}` : p.summary}</span>
              {p.status === 'done' ? <Check size={15} strokeWidth={2.6} className="tool-done" aria-label="done" /> : null}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}

function Composer() {
  const { agent, bridge } = useReady();
  const [text, setText] = useState('');
  const area = useRef<HTMLTextAreaElement | null>(null);
  const replay = agent.mode === 'replay';
  const value = replay ? (agent.nextPrompt ?? '') : text;

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  }, [value]);

  const submit = () => {
    if (!agent.canSend || !value.trim()) return;
    agent.send(value);
    if (!replay) setText('');
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const offline = !replay && bridge === 'offline';
  const placeholder = replay ? 'This recorded session has no more turns. Reload to replay it.' : offline ? 'The agent bridge is offline' : 'Ask about your week, or how you are feeling';

  return createPortal(
    <div className="composer-dock">
      <AnimatePresence>
        {offline ? (
          <motion.p className="composer-note" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <CircleAlert size={15} strokeWidth={2.2} aria-hidden="true" />
            The agent bridge is not running. Start Cadence with <code>npm run dev</code> and it connects on its own.
          </motion.p>
        ) : replay ? (
          <motion.p className="composer-note is-replay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Replaying a recorded session with real model output. Live mode runs without <code>?demo</code>.
          </motion.p>
        ) : null}
      </AnimatePresence>
      <Glass radius={28} className="composer" frost={20}>
        <label className="visually-hidden" htmlFor="composer-input">
          Message Cadence
        </label>
        <textarea
          id="composer-input"
          ref={area}
          rows={1}
          value={value}
          readOnly={replay}
          disabled={offline}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
        />
        {agent.busy ? (
          <button type="button" className="send stop" onClick={agent.stop} aria-label="Stop">
            <Square size={14} strokeWidth={0} fill="currentColor" />
          </button>
        ) : (
          <button type="button" className="send" onClick={submit} disabled={!agent.canSend || !value.trim()} aria-label="Send">
            <ArrowUp size={19} strokeWidth={2.6} />
          </button>
        )}
      </Glass>
    </div>,
    document.body,
  );
}
