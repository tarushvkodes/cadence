import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/**
 * Text from the model arrives in bursts. Reveal it at a steady, readable pace that speeds up when it
 * falls behind, so live and replayed sessions both read like someone typing. Text that was already
 * complete when it mounted shows in full.
 */
export function useSmoothText(target: string, startComplete: boolean): { text: string; catchingUp: boolean } {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(() => (startComplete ? target.length : 0));
  const shownRef = useRef(shown);

  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - lastTime);
      lastTime = now;
      const current = Math.min(shownRef.current, target.length);
      const backlog = target.length - current;
      if (backlog <= 0) return;
      const perSecond = 90 + backlog * 2.2;
      const next = Math.min(target.length, current + Math.max(1, Math.round((perSecond * dt) / 1000)));
      shownRef.current = next;
      setShown(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduce]);

  if (reduce) return { text: target, catchingUp: false };
  const visible = Math.min(shown, target.length);
  return { text: target.slice(0, visible), catchingUp: visible < target.length };
}
