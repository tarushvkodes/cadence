import { describe, expect, it } from 'vitest';
import { buildCycleModel, estimatePhase, phaseSpans, type PhaseEstimate } from './cycle.ts';
import { addDays, d, daysBetween, rangeContains, type ISODate } from './time.ts';
import type { CycleProfile, Regularity } from './types.ts';

function profile(starts: string[], opts: Partial<{ length: number; period: number; regularity: Regularity }> = {}): CycleProfile {
  return {
    periodStarts: starts.map(d),
    typicalCycleLength: opts.length ?? 28,
    typicalPeriodLength: opts.period ?? 5,
    regularity: opts.regularity ?? 'regular',
  };
}

function estimate(p: CycleProfile, date: string): Extract<PhaseEstimate, { kind: 'estimate' }> {
  const result = estimatePhase(p, d(date));
  if (result.kind !== 'estimate') throw new Error('expected an estimate');
  return result;
}

const width = (r: { start: ISODate; end: ISODate }) => daysBetween(r.start, r.end);

/** Four logged starts 28 days apart: Sep 1, Sep 29, Oct 27, Nov 24. */
const regular28 = profile(['2026-09-01', '2026-09-29', '2026-10-27', '2026-11-24']);

describe('estimatePhase with no data', () => {
  it('asks for a period start instead of guessing', () => {
    const result = estimatePhase(profile([]), d('2026-11-13'));
    expect(result.kind).toBe('no-data');
  });
});

describe('estimatePhase on a regular 28-day cycle', () => {
  it('counts cycle day 1 on a logged start', () => {
    const e = estimate(regular28, '2026-11-24');
    expect(e.cycleDay).toBe(1);
    expect(e.phase).toBe('menstrual');
    expect(e.cyclesProjected).toBe(0);
  });

  it.each([
    ['2026-11-28', 5, 'menstrual'],
    ['2026-11-29', 6, 'follicular'],
    ['2026-12-05', 12, 'follicular'],
    ['2026-12-06', 13, 'ovulatory'],
    ['2026-12-08', 15, 'ovulatory'],
    ['2026-12-09', 16, 'luteal'],
    ['2026-12-21', 28, 'luteal'],
  ] as const)('on %s is cycle day %i, %s', (date, day, phase) => {
    const e = estimate(regular28, date);
    expect(e.cycleDay).toBe(day);
    expect(e.phase).toBe(phase);
  });

  it('flags the neighbouring phase right at a boundary', () => {
    expect(estimate(regular28, '2026-11-28').couldBe).toBe('follicular');
    expect(estimate(regular28, '2026-11-29').couldBe).toBe('menstrual');
    expect(estimate(regular28, '2026-12-01').couldBe).toBeNull();
  });

  it('is fairly confident with several consistent cycles', () => {
    expect(estimate(regular28, '2026-12-01').confidence).toBe('high');
  });

  it('predicts the next period as a range around day 29, not a point', () => {
    const e = estimate(regular28, '2026-12-01');
    expect(width(e.windows.nextPeriod)).toBeGreaterThanOrEqual(2);
    expect(rangeContains(e.windows.nextPeriod, d('2026-12-22'))).toBe(true);
  });

  it('places the ovulation window around 14 days before the next period', () => {
    const e = estimate(regular28, '2026-12-01');
    expect(rangeContains(e.windows.ovulation, d('2026-12-07'))).toBe(true);
    expect(width(e.windows.ovulation)).toBeGreaterThanOrEqual(4);
  });

  it('uses the real length for a cycle between two logged starts', () => {
    const p = profile(['2026-09-01', '2026-10-03', '2026-10-31']);
    const e = estimate(p, '2026-09-20');
    expect(e.cycleLength).toBe(32);
    expect(e.cyclesProjected).toBe(0);
  });
});

describe('estimatePhase past the expected length', () => {
  it('projects the next cycle and says the start is assumed', () => {
    const e = estimate(regular28, '2026-12-23');
    expect(e.cyclesProjected).toBe(1);
    expect(e.cycleDay).toBe(2);
    expect(e.couldBe).toBe('luteal');
    expect(e.reasons.join(' ')).toMatch(/not logged yet/);
  });

  it('loses confidence and widens windows with every projected cycle', () => {
    const now = estimate(regular28, '2026-12-01');
    const later = estimate(regular28, '2027-01-26');
    expect(later.cyclesProjected).toBe(2);
    expect(later.confidence).toBe('low');
    expect(width(later.windows.nextPeriod)).toBeGreaterThan(width(now.windows.nextPeriod));
  });
});

describe('estimatePhase with irregular or sparse history', () => {
  const irregular = profile(['2026-06-01', '2026-06-27', '2026-08-01', '2026-09-01', '2026-10-11'], { regularity: 'irregular' });

  it('lowers confidence when logged cycles vary a lot', () => {
    expect(estimate(irregular, '2026-10-20').confidence).toBe('low');
  });

  it('draws a wider next-period window than a regular history', () => {
    const wide = estimate(irregular, '2026-10-20').windows.nextPeriod;
    const narrow = estimate(regular28, '2026-12-01').windows.nextPeriod;
    expect(width(wide)).toBeGreaterThan(width(narrow));
  });

  it('is less confident with one logged start than with four', () => {
    const sparse = estimate(profile(['2026-11-24']), '2026-12-01');
    expect(sparse.confidence).not.toBe('high');
    expect(width(sparse.windows.nextPeriod)).toBeGreaterThan(width(estimate(regular28, '2026-12-01').windows.nextPeriod));
  });

  it('widens further when the user says they are unsure or irregular', () => {
    const base = ['2026-11-24'];
    const regular = estimate(profile(base), '2026-12-01').windows.nextPeriod;
    const unsure = estimate(profile(base, { regularity: 'unsure' }), '2026-12-01').windows.nextPeriod;
    const irr = estimate(profile(base, { regularity: 'irregular' }), '2026-12-01').windows.nextPeriod;
    expect(width(unsure)).toBeGreaterThan(width(regular));
    expect(width(irr)).toBeGreaterThan(width(unsure));
  });

  it('ignores a gap that looks like a missed log', () => {
    const p = profile(['2026-05-01', '2026-07-30', '2026-08-27', '2026-09-24', '2026-10-22']);
    const model = buildCycleModel(p);
    expect(model.observedLengths).toEqual([28, 28, 28]);
    expect(model.reasons.join(' ')).toMatch(/missed log/);
  });
});

describe('estimatePhase on long and short cycles', () => {
  it('stretches the follicular phase on a 40-day cycle', () => {
    const p = profile(['2026-08-01', '2026-09-10', '2026-10-20'], { length: 40 });
    expect(estimate(p, '2026-11-10').phase).toBe('follicular');
    expect(estimate(p, '2026-11-14').phase).toBe('ovulatory');
    expect(estimate(p, '2026-11-20').phase).toBe('luteal');
  });

  it('keeps a valid layout on a 21-day cycle with a long period', () => {
    const spans = phaseSpans(21, 7, 2);
    expect(spans.map((s) => s.phase)).toEqual(['menstrual', 'ovulatory', 'luteal']);
    expect(spans[0]?.endDay).toBe(7);
  });
});

describe('phaseSpans', () => {
  it.each([21, 24, 28, 31, 35, 40, 45])('covers every day of a %i-day cycle exactly once', (length) => {
    for (const period of [2, 5, 8, 10]) {
      const spans = phaseSpans(length, period, 2);
      expect(spans[0]?.startDay).toBe(1);
      expect(spans.at(-1)?.endDay).toBe(length);
      spans.slice(1).forEach((s, i) => expect(s.startDay).toBe((spans[i]?.endDay ?? 0) + 1));
    }
  });
});

describe('estimatePhase windows', () => {
  it('always returns ordered ranges', () => {
    let date = d('2026-08-01');
    for (let i = 0; i < 160; i++) {
      const e = estimate(regular28, date);
      for (const r of Object.values(e.windows)) expect(r.start <= r.end).toBe(true);
      date = addDays(date, 1);
    }
  });
});
