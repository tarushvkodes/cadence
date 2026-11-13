import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { useApp } from './app/AppProvider.tsx';
import { Nav } from './app/Nav.tsx';
import { useRoute, type Route } from './app/routes.ts';
import { Guide } from './screens/Guide.tsx';
import { Learn } from './screens/Learn.tsx';
import { Onboarding } from './screens/Onboarding.tsx';
import { Plan } from './screens/Plan.tsx';
import { Settings } from './screens/Settings.tsx';
import { Today } from './screens/Today.tsx';
import { NoticeToast } from './ui/NoticeToast.tsx';

const SCREENS: Record<Route, () => React.JSX.Element> = { today: Today, plan: Plan, guide: Guide, learn: Learn, settings: Settings };
const TITLES: Record<Route, string> = { today: 'Today', plan: 'Plan', guide: 'Guide', learn: 'Learn', settings: 'Settings' };

export function App() {
  const { state } = useApp();
  const route = useRoute();
  const reduce = useReducedMotion();

  useEffect(() => {
    document.title = state.status === 'ready' ? `${TITLES[route]} · Cadence` : 'Welcome · Cadence';
  }, [route, state.status]);

  if (state.status === 'onboarding') return <Onboarding />;
  const Screen = SCREENS[route];
  return (
    <>
      <Nav route={route} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={route}
          id="main"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, filter: 'blur(2px)', transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }}
          transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
        >
          <Screen />
        </motion.main>
      </AnimatePresence>
      <NoticeToast />
    </>
  );
}
