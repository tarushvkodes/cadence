import type { PlannerData } from './changes.ts';
import { estimatePhase } from './cycle.ts';
import type { Phase, Symptom } from './types.ts';

export type PhaseInsight = {
  readonly phase: Phase;
  readonly days: number;
  readonly avgEnergy: number | null;
  readonly avgMood: number | null;
  readonly topSymptoms: readonly { symptom: Symptom; count: number }[];
};

/** What this person's own check-ins say about a phase. The point is their pattern, not a textbook one. */
export function phaseInsight(data: PlannerData, phase: Phase): PhaseInsight {
  const entries = Object.values(data.checkIns).filter((c) => {
    const e = estimatePhase(data.profile, c.date);
    return e.kind === 'estimate' && e.phase === phase;
  });
  const counts = new Map<Symptom, number>();
  for (const c of entries) for (const s of c.symptoms) counts.set(s, (counts.get(s) ?? 0) + 1);
  const avg = (pick: (n: (typeof entries)[number]) => number) => (entries.length ? entries.reduce((sum, c) => sum + pick(c), 0) / entries.length : null);
  return {
    phase,
    days: entries.length,
    avgEnergy: avg((c) => c.energy),
    avgMood: avg((c) => c.mood),
    topSymptoms: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([symptom, count]) => ({ symptom, count })),
  };
}
