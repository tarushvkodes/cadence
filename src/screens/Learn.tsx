import { ArrowUpRight, Ban, BookOpenCheck, Eye, HardDrive, TriangleAlert } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { TOOL_META, TOOL_NAMES } from '../domain/agent.ts';
import { PHASE_LABELS } from '../domain/cycle.ts';
import { CYCLE_FACTS, EVIDENCE_LABELS, PHASE_GUIDES, SOURCES, STANCE, type Claim, type EvidenceLevel, type SourceId } from '../content/evidence.ts';
import '../styles/learn.css';

const LEVEL_BARS: Record<EvidenceLevel, number> = { 'well-supported': 3, mixed: 2, weak: 1 };

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { type: 'spring' as const, bounce: 0, duration: 0.6 },
};

export function Learn() {
  return (
    <div className="page learn">
      <header className="learn-hero">
        <p className="eyebrow">What the research says</p>
        <h1 className="display">{STANCE.headline}</h1>
        <p className="learn-lede">{STANCE.body}</p>
        <EvidenceKey />
      </header>

      <section className="learn-section" aria-labelledby="phases-title">
        <h2 id="phases-title" className="title-1">
          The four phases
        </h2>
        <p className="section-lede muted">What happens, what some people notice, and how strong the evidence is for each claim you might hear.</p>
        <div className="phase-grid">
          {PHASE_GUIDES.map((g, i) => (
            <motion.article key={g.phase} className={`card phase-card phase-${g.phase}`} {...reveal} transition={{ ...reveal.transition, delay: i * 0.06 }}>
              <header>
                <span className="phase-pill">
                  <span className="swatch" aria-hidden="true" />
                  {PHASE_LABELS[g.phase]}
                </span>
                <p className="footnote muted">{g.when}</p>
              </header>
              <p className="what-happens">{g.whatHappens}</p>
              <div className="notice-block">
                <h3 className="eyebrow">Some people notice</h3>
                <ul>
                  {g.mightNotice.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
              <ul className="claims">
                {g.claims.map((c) => (
                  <ClaimRow key={c.text} claim={c} />
                ))}
              </ul>
            </motion.article>
          ))}
        </div>
      </section>

      <motion.section className="learn-section" aria-labelledby="vary-title" {...reveal}>
        <h2 id="vary-title" className="title-1">
          Cycles vary more than apps admit
        </h2>
        <p className="section-lede muted">That is why Cadence draws its predictions as ranges and tells you how sure it is.</p>
        <ul className="claims card facts">
          {CYCLE_FACTS.map((c) => (
            <ClaimRow key={c.text} claim={c} />
          ))}
        </ul>
      </motion.section>

      <AiExplainer />

      <p className="learn-foot footnote muted">
        Cadence is a planning tool, not medical advice. If something about your cycle worries you, a clinician is the right person to ask.
      </p>
    </div>
  );
}

function EvidenceKey() {
  return (
    <ul className="evidence-key" aria-label="Evidence labels">
      {(Object.keys(EVIDENCE_LABELS) as EvidenceLevel[]).map((level) => (
        <li key={level}>
          <EvidenceBadge level={level} />
          <span className="footnote muted">{EVIDENCE_LABELS[level].meaning}</span>
        </li>
      ))}
    </ul>
  );
}

function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  return (
    <span className={`evidence evidence-${level}`}>
      <span className="bars" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <i key={i} className={i <= LEVEL_BARS[level] ? 'on' : undefined} />
        ))}
      </span>
      {EVIDENCE_LABELS[level].label}
    </span>
  );
}

function Cite({ id }: { id: SourceId }) {
  const source = SOURCES[id];
  const label = `${source.cite}, ${source.venue}`;
  if (!('url' in source)) return <span className="cite">{label}</span>;
  return (
    <a className="cite" href={source.url} target="_blank" rel="noreferrer" title={'title' in source ? source.title : undefined}>
      {label}
      <ArrowUpRight size={12} strokeWidth={2.4} aria-hidden="true" />
    </a>
  );
}

function ClaimRow({ claim }: { claim: Claim }) {
  return (
    <li className="claim">
      <EvidenceBadge level={claim.level} />
      <p className="claim-text">{claim.text}</p>
      {claim.detail ? <p className="claim-detail">{claim.detail}</p> : null}
      <p className="claim-sources">
        {claim.sources.map((s) => (
          <Cite key={s} id={s} />
        ))}
      </p>
    </li>
  );
}

const LOOP_STEPS = [
  { title: 'You ask', body: 'A question or a request, in your own words.' },
  { title: 'Claude decides', body: 'The model reads your message and picks a tool to call, or answers.' },
  { title: 'Cadence runs the tool', body: 'The app does the work and hands back a short result.' },
  { title: 'Claude reads it', body: 'It may call another tool. This repeats until it has enough.' },
  { title: 'It replies and suggests', body: 'Changes arrive as suggestions with a before and after.' },
  { title: 'You decide', body: 'Only what you approve changes. You can undo it.' },
];

function LoopDiagram() {
  const reduce = useReducedMotion();
  const cx = 200;
  const cy = 200;
  const r = 138;
  const points = LOOP_STEPS.map((_, i) => {
    const a = (i / LOOP_STEPS.length) * 2 * Math.PI - Math.PI / 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  });
  return (
    <figure className="loop">
      <svg viewBox="0 0 400 400" role="img" aria-label="The agent loop: you ask, Claude decides, Cadence runs a tool, Claude reads the result and may repeat, it replies with suggestions, and you decide.">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line-strong)" strokeWidth="2" strokeDasharray="4 7" />
        <path
          d={`M ${points[2]![0]} ${points[2]![1]} Q ${cx + 30} ${cy + 10} ${points[1]![0]} ${points[1]![1]}`}
          fill="none"
          stroke="var(--phase)"
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeDasharray="3 5"
        />
        {reduce ? null : (
          <circle r="6" fill="var(--phase)">
            <animateMotion dur="9s" repeatCount="indefinite" path={`M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`} />
          </circle>
        )}
        {points.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="22" fill={i === 5 ? 'var(--phase)' : 'var(--elevated)'} stroke={i === 5 ? 'none' : 'var(--line-strong)'} strokeWidth="1.5" />
            <text x={x} y={y} dy="0.36em" textAnchor="middle" className="loop-num" fill={i === 5 ? 'var(--phase-on)' : 'var(--ink)'}>
              {i + 1}
            </text>
          </g>
        ))}
        <text x={cx} y={cy - 8} textAnchor="middle" className="loop-center">
          The loop
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="loop-center-sub">
          steps 2 to 4 repeat
        </text>
      </svg>
      <ol className="loop-steps">
        {LOOP_STEPS.map((s, i) => (
          <li key={s.title}>
            <span className={`loop-dot${i === 5 ? ' is-you' : ''}`}>{i + 1}</span>
            <div>
              <p className="title-3">{s.title}</p>
              <p className="footnote muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function AiExplainer() {
  return (
    <section className="learn-section ai" aria-labelledby="ai-title">
      <motion.div {...reveal}>
        <p className="eyebrow">How this AI works</p>
        <h2 id="ai-title" className="title-1">
          An agent is a model that can use tools, in a loop
        </h2>
      </motion.div>

      <div className="ai-grid">
        <motion.div className="ai-block" {...reveal}>
          <h3 className="title-3">What a model is</h3>
          <p>
            Claude is a large language model. It learned from a huge amount of text to predict what words come next, which turns out to make it good at
            reading, reasoning, and writing. It does not know you. It only knows what is in the conversation and what its tools return.
          </p>
        </motion.div>
        <motion.div className="ai-block" {...reveal}>
          <h3 className="title-3">What tools are</h3>
          <p>
            A tool is a function the app offers the model, with a name and a description. The model cannot run code itself. It asks for a tool by name,
            Cadence runs it, and the result goes back to the model. Cadence offers six tools and nothing else.
          </p>
          <ul className="tool-list">
            {TOOL_NAMES.map((t) => (
              <li key={t}>
                <code>{t}</code>
                <span className={`tool-kind kind-${TOOL_META[t].kind}`}>{TOOL_META[t].kind === 'read' ? 'Reads' : 'Suggests'}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      <motion.div {...reveal}>
        <LoopDiagram />
      </motion.div>

      <div className="ai-grid three">
        <motion.div className="ai-block" {...reveal}>
          <h3 className="title-3">
            <Eye size={18} aria-hidden="true" /> What it can see
          </h3>
          <p>Only what its tools return: your cycle estimate, your calendar for the dates it asks about, your habits, and your recent check-ins. No web, no files, no location, nothing from other apps.</p>
        </motion.div>
        <motion.div className="ai-block" {...reveal}>
          <h3 className="title-3">
            <Ban size={18} aria-hidden="true" /> What it cannot do
          </h3>
          <p>Change anything by itself. Its only way to touch your plans is to draft a suggestion, and the app has no code path that applies one without your tap. It also does not diagnose or give medication advice.</p>
        </motion.div>
        <motion.div className="ai-block" {...reveal}>
          <h3 className="title-3">
            <TriangleAlert size={18} aria-hidden="true" /> Why it can be wrong
          </h3>
          <p>It predicts likely words, so it can sound sure and still be mistaken. It can misread a pattern in a few weeks of logs, and cycle dates are only estimates. Read each suggestion before you approve it.</p>
        </motion.div>
      </div>

      <motion.div className="card privacy" {...reveal}>
        <div className="privacy-icon" aria-hidden="true">
          <HardDrive size={22} />
        </div>
        <div>
          <h3 className="title-3">Where your data goes</h3>
          <p>
            Everything you log stays in this browser, on this computer. There is no account and no Cadence server. When you ask the Guide something, the
            results of the tools it calls are sent to Claude through the Claude Code login on this computer so it can reply. Period apps have shared
            health data before, which is why this matters (<Cite id="ftcFlo2021" />).
          </p>
        </div>
      </motion.div>

      <motion.p className="ai-sources footnote muted" {...reveal}>
        <BookOpenCheck size={15} aria-hidden="true" /> Read more: <Cite id="anthropicToolUse" /> <Cite id="anthropicLoop" /> <Cite id="agentSdk" />
      </motion.p>
    </section>
  );
}
