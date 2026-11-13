import { BookOpen, CalendarDays, Compass, Settings2, SunMedium, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { pendingItems } from '../domain/proposal.ts';
import { Glass } from '../ui/Glass.tsx';
import { Wordmark } from '../ui/Logo.tsx';
import { useReady } from './AppProvider.tsx';
import { go, type Route } from './routes.ts';

const TABS: { route: Route; label: string; icon: LucideIcon }[] = [
  { route: 'today', label: 'Today', icon: SunMedium },
  { route: 'plan', label: 'Plan', icon: CalendarDays },
  { route: 'guide', label: 'Guide', icon: Compass },
  { route: 'learn', label: 'Learn', icon: BookOpen },
];

const SPRING = { type: 'spring', bounce: 0.18, duration: 0.42 } as const;

export function Nav({ route }: { route: Route }) {
  const { state, bridge, agent, session } = useReady();
  const pending = pendingItems(state.proposals).length;
  const status =
    agent.mode === 'replay' ? { label: 'Replay', tone: 'replay' } : bridge === 'online' ? { label: 'Agent ready', tone: 'online' } : bridge === 'offline' ? { label: 'Agent offline', tone: 'offline' } : { label: 'Checking', tone: 'checking' };

  return (
    <>
      <header className="topbar" aria-label="Cadence">
        <Glass as="a" href="#/today" radius={22} className="topbar-brand glass-press" aria-label="Cadence, go to Today">
          <Wordmark />
        </Glass>

        <Glass as="nav" radius={26} className="topbar-tabs" aria-label="Main">
          {TABS.map(({ route: r, label, icon: Icon }) => {
            const active = r === route;
            const badge = (r === 'plan' || r === 'guide') && pending > 0 ? pending : 0;
            return (
              <a key={r} href={`#/${r}`} className="tab" aria-current={active ? 'page' : undefined}>
                {active ? <motion.span layoutId="tab-lens" className="tab-lens" transition={SPRING} /> : null}
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
                <span>{label}</span>
                {badge ? <span className="tab-badge num" aria-label={`${badge} suggestions waiting`}>{badge}</span> : null}
              </a>
            );
          })}
        </Glass>

        <Glass radius={22} className="topbar-end">
          <span className={`status-dot status-${status.tone}`} title={session.demo ? `Demo: ${session.demo.seed.title}` : undefined}>
            <span className="dot" aria-hidden="true" />
            {status.label}
          </span>
          <a href="#/settings" className={`icon-link${route === 'settings' ? ' is-active' : ''}`} aria-label="Settings" aria-current={route === 'settings' ? 'page' : undefined}>
            <Settings2 size={19} strokeWidth={2} aria-hidden="true" />
          </a>
        </Glass>
      </header>

      <Glass as="nav" radius={30} className="tabbar" aria-label="Main">
        {[...TABS, { route: 'settings' as Route, label: 'Settings', icon: Settings2 }].map(({ route: r, label, icon: Icon }) => {
          const active = r === route;
          return (
            <button key={r} type="button" className="tabbar-item" aria-current={active ? 'page' : undefined} onClick={() => go(r)}>
              {active ? <motion.span layoutId="tabbar-lens" className="tab-lens" transition={SPRING} /> : null}
              <Icon size={21} strokeWidth={2} aria-hidden="true" />
              <span>{label}</span>
              {(r === 'plan' || r === 'guide') && pending > 0 ? <span className="tab-badge num">{pending}</span> : null}
            </button>
          );
        })}
      </Glass>
    </>
  );
}
