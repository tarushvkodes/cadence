import { addDays, compareDates, dateRange, daysBetween, formatShortDate, type DateRange, type ISODate } from './time.ts';
import { CYCLE_LENGTH_BOUNDS, PERIOD_LENGTH_BOUNDS, type CycleProfile, type Phase } from './types.ts';

export type Confidence = 'high' | 'medium' | 'low';

/** One phase laid out on an expected-length cycle, in 1-indexed cycle days, inclusive. */
export type PhaseSpan = {
  readonly phase: Phase;
  readonly startDay: number;
  readonly endDay: number;
  /** How many days either side of each edge the boundary could really fall. */
  readonly edgeMargin: number;
};

export type CycleModel = {
  readonly expectedLength: number;
  readonly periodLength: number;
  /** Half-width, in days, of the next-period window for the current cycle. */
  readonly uncertainty: number;
  readonly observedLengths: readonly number[];
  readonly confidence: Confidence;
  readonly reasons: readonly string[];
};

export type PhaseEstimate =
  | { readonly kind: 'no-data'; readonly reason: string }
  | {
      readonly kind: 'estimate';
      readonly date: ISODate;
      readonly cycleDay: number;
      /** First day of the cycle that contains `date`, logged or projected. */
      readonly cycleStart: ISODate;
      /** 0 when `cycleStart` is a logged period start, otherwise how many cycles were projected. */
      readonly cyclesProjected: number;
      readonly cycleLength: number;
      readonly phase: Phase;
      /** The neighbouring phase when `date` sits inside a boundary's margin, else null. */
      readonly couldBe: Phase | null;
      readonly confidence: Confidence;
      readonly reasons: readonly string[];
      readonly spans: readonly PhaseSpan[];
      readonly windows: {
        readonly nextPeriod: DateRange;
        readonly ovulation: DateRange;
        readonly phaseEnds: DateRange;
      };
    };

/** Gaps outside this range between logged starts are treated as missed logs, not cycles. */
const PLAUSIBLE_GAP = { min: 15, max: 60 } as const;
const RECENT_CYCLES = 6;
const LUTEAL_LENGTH = 14;
const REGULARITY_MARGIN = { regular: 2, unsure: 3, irregular: 5 } as const;
const SPARSE_PENALTY = [3, 2, 1] as const;
const MAX_MARGIN = 10;

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

function lowerConfidence(c: Confidence, steps: number): Confidence {
  const order: Confidence[] = ['high', 'medium', 'low'];
  return order[Math.min(order.length - 1, order.indexOf(c) + steps)] as Confidence;
}

export function buildCycleModel(profile: CycleProfile): CycleModel {
  const starts = profile.periodStarts;
  const gaps = starts.slice(1).map((s, i) => daysBetween(starts[i] as ISODate, s));
  const plausible = gaps.filter((g) => g >= PLAUSIBLE_GAP.min && g <= PLAUSIBLE_GAP.max);
  const recent = plausible.slice(-RECENT_CYCLES);
  const typical = clamp(profile.typicalCycleLength, CYCLE_LENGTH_BOUNDS.min, CYCLE_LENGTH_BOUNDS.max);
  const reasons: string[] = [];

  let expectedLength: number;
  if (recent.length >= 2) {
    expectedLength = Math.round(median(recent));
    const lo = Math.min(...recent);
    const hi = Math.max(...recent);
    reasons.push(
      lo === hi
        ? `Based on ${recent.length} logged cycles of ${lo} days.`
        : `Based on ${recent.length} logged cycles of ${lo} to ${hi} days.`,
    );
  } else if (recent.length === 1) {
    expectedLength = Math.round(((recent[0] as number) + typical) / 2);
    reasons.push('Only one full cycle is logged, so this leans on your typical length.');
  } else {
    expectedLength = typical;
    reasons.push(
      starts.length === 0
        ? 'No period start is logged yet.'
        : 'Only your last period start is logged, so this uses your typical length.',
    );
  }
  expectedLength = clamp(expectedLength, PLAUSIBLE_GAP.min + 5, PLAUSIBLE_GAP.max);

  if (gaps.length > plausible.length) {
    reasons.push('One gap between logged periods looked like a missed log, so it was left out.');
  }

  const spread = recent.length >= 2 ? Math.ceil((Math.max(...recent) - Math.min(...recent)) / 2) : 0;
  const sparse = SPARSE_PENALTY[recent.length] ?? 0;
  const uncertainty = clamp(Math.max(spread, REGULARITY_MARGIN[profile.regularity]) + sparse, 1, MAX_MARGIN);

  if (profile.regularity === 'irregular') reasons.push('You said your cycle is irregular, so the windows are wider.');
  if (profile.regularity === 'unsure') reasons.push('You were not sure how regular your cycle is, so the windows are a little wider.');
  if (spread >= 3) reasons.push(`Your logged cycles vary by about ${spread * 2} days.`);

  const confidence: Confidence = recent.length >= 3 && uncertainty <= 2 ? 'high' : uncertainty <= 4 ? 'medium' : 'low';
  const periodLength = clamp(profile.typicalPeriodLength, PERIOD_LENGTH_BOUNDS.min, PERIOD_LENGTH_BOUNDS.max);

  return { expectedLength, periodLength, uncertainty, observedLengths: recent, confidence, reasons };
}

/**
 * Lay the four phases out on a cycle of `length` days. Ovulation is placed about 14 days before the
 * next period, because the luteal phase varies less between people than the follicular phase.
 * Short cycles can squeeze the follicular phase to nothing; it is then left out.
 */
export function phaseSpans(length: number, periodLength: number, margin: number): PhaseSpan[] {
  const period = Math.min(periodLength, length - 2);
  const ovulationDay = length - LUTEAL_LENGTH;
  const ovStart = Math.min(Math.max(period + 1, ovulationDay - 1), length - 1);
  const ovEnd = Math.min(Math.max(ovStart, ovulationDay + 1), length - 1);
  const spans: PhaseSpan[] = [
    { phase: 'menstrual', startDay: 1, endDay: period, edgeMargin: 1 },
    { phase: 'follicular', startDay: period + 1, endDay: ovStart - 1, edgeMargin: margin },
    { phase: 'ovulatory', startDay: ovStart, endDay: ovEnd, edgeMargin: margin },
    { phase: 'luteal', startDay: ovEnd + 1, endDay: length, edgeMargin: margin },
  ];
  return spans.filter((s) => s.endDay >= s.startDay);
}

function spanIndexFor(spans: readonly PhaseSpan[], cycleDay: number): number {
  const idx = spans.findIndex((s) => cycleDay >= s.startDay && cycleDay <= s.endDay);
  return idx === -1 ? spans.length - 1 : idx;
}

/** Where `date` falls in the user's cycle. Pure: the same profile and date always give the same answer. */
export function estimatePhase(profile: CycleProfile, date: ISODate): PhaseEstimate {
  const starts = profile.periodStarts;
  if (starts.length === 0) {
    return { kind: 'no-data', reason: 'Log the first day of your last period to see where you are in your cycle.' };
  }
  const model = buildCycleModel(profile);
  const L = model.expectedLength;

  const anchorIndex = findLastIndex(starts, (s) => compareDates(s, date) <= 0);
  let cycleStart: ISODate;
  let cycleLength = L;
  let cyclesProjected = 0;

  if (anchorIndex === -1) {
    const first = starts[0] as ISODate;
    const back = Math.ceil(daysBetween(date, first) / L);
    cycleStart = addDays(first, -back * L);
    cyclesProjected = back;
  } else {
    const anchor = starts[anchorIndex] as ISODate;
    const next = starts[anchorIndex + 1];
    const gap = next ? daysBetween(anchor, next) : null;
    if (gap !== null && gap >= PLAUSIBLE_GAP.min && gap <= PLAUSIBLE_GAP.max) {
      cycleStart = anchor;
      cycleLength = gap;
    } else {
      const elapsed = daysBetween(anchor, date);
      cyclesProjected = Math.floor(elapsed / L);
      cycleStart = addDays(anchor, cyclesProjected * L);
    }
  }

  const margin = Math.min(MAX_MARGIN, Math.ceil(model.uncertainty * Math.sqrt(cyclesProjected + 1)));
  const cycleDay = daysBetween(cycleStart, date) + 1;
  const spans = phaseSpans(cycleLength, model.periodLength, margin);
  const index = spanIndexFor(spans, cycleDay);
  const span = spans[index] as PhaseSpan;

  let couldBe: Phase | null = null;
  const prev = spans[index - 1];
  const next = spans[index + 1];
  if (!prev && cyclesProjected > 0 && cycleDay <= margin) couldBe = 'luteal';
  else if (prev && cycleDay - span.startDay < Math.min(span.edgeMargin, prev.edgeMargin)) couldBe = prev.phase;
  else if (next && span.endDay - cycleDay < span.edgeMargin) couldBe = next.phase;
  else if (!next && span.endDay - cycleDay < margin) couldBe = 'menstrual';

  const reasons = [...model.reasons];
  if (cyclesProjected > 0 && anchorIndex !== -1) {
    reasons.push(
      `This assumes a period started around ${formatShortDate(cycleStart)}, which is not logged yet. Log it when it starts and this sharpens.`,
    );
  }
  if (anchorIndex === -1) reasons.push('This date is before your first logged period, so it is projected backwards.');

  const ovulationDay = cycleLength - LUTEAL_LENGTH;
  const at = (day: number) => addDays(cycleStart, day - 1);

  return {
    kind: 'estimate',
    date,
    cycleDay,
    cycleStart,
    cyclesProjected,
    cycleLength,
    phase: span.phase,
    couldBe,
    confidence: lowerConfidence(model.confidence, cyclesProjected),
    reasons,
    spans,
    windows: {
      nextPeriod: dateRange(at(cycleLength + 1 - margin), at(cycleLength + 1 + margin)),
      ovulation: dateRange(at(Math.max(1, ovulationDay - 1 - margin)), at(ovulationDay + 1 + margin)),
      phaseEnds: dateRange(at(Math.max(cycleDay, span.endDay - span.edgeMargin)), at(span.endDay + span.edgeMargin)),
    },
  };
}

function findLastIndex<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i--) if (predicate(items[i] as T)) return i;
  return -1;
}

export const PHASE_LABELS: Record<Phase, string> = {
  menstrual: 'Menstrual',
  follicular: 'Follicular',
  ovulatory: 'Ovulatory',
  luteal: 'Luteal',
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: 'Fairly confident',
  medium: 'Rough estimate',
  low: 'Low confidence',
};
