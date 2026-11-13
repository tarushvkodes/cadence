import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useApp } from '../app/AppProvider.tsx';
import { Glass } from './Glass.tsx';

export function NoticeToast() {
  const { state, dispatch } = useApp();
  const notice = state.status === 'ready' ? state.notice : null;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => dispatch({ type: 'dismissNotice' }), notice.undo ? 6000 : 4500);
    return () => window.clearTimeout(timer);
  }, [notice, dispatch]);

  return (
    <div className="notice-wrap" aria-live="polite">
      <AnimatePresence>
        {notice ? (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          >
            <Glass radius={26} className="notice" data-tone={notice.tone} role={notice.tone === 'error' ? 'alert' : 'status'}>
              <span>{notice.text}</span>
              {notice.undo ? (
                <button
                  type="button"
                  className="btn btn-small btn-quiet"
                  onClick={() => {
                    if (notice.undo) dispatch({ type: 'change', change: notice.undo });
                    dispatch({ type: 'dismissNotice' });
                  }}
                >
                  Undo
                </button>
              ) : (
                <button type="button" className="btn btn-small btn-quiet" onClick={() => dispatch({ type: 'dismissNotice' })}>
                  OK
                </button>
              )}
            </Glass>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
