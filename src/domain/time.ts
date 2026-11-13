declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };

/** A calendar day in the user's local time, `YYYY-MM-DD`. */
export type ISODate = Brand<string, 'ISODate'>;
/** A local wall-clock time, `YYYY-MM-DDTHH:mm`. Cadence is local-only, so there is no zone. */
export type LocalDateTime = Brand<string, 'LocalDateTime'>;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const DAY_MS = 86_400_000;

export function parseISODate(raw: string): ISODate | null {
  const m = DATE_RE.exec(raw);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
  return raw as ISODate;
}

export function parseLocalDateTime(raw: string): LocalDateTime | null {
  const m = DATE_TIME_RE.exec(raw);
  if (!m) return null;
  if (!parseISODate(raw.slice(0, 10))) return null;
  const [h, min] = [Number(m[4]), Number(m[5])];
  if (h > 23 || min > 59) return null;
  return raw as LocalDateTime;
}

/** For literals in sample data and tests. Throws on a malformed date, which is a programming error. */
export function d(raw: string): ISODate {
  const parsed = parseISODate(raw);
  if (!parsed) throw new Error(`Invalid ISODate literal: ${raw}`);
  return parsed;
}

export function dt(raw: string): LocalDateTime {
  const parsed = parseLocalDateTime(raw);
  if (!parsed) throw new Error(`Invalid LocalDateTime literal: ${raw}`);
  return parsed;
}

function toEpochDay(date: ISODate): number {
  const [y, m, day] = date.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(y, m - 1, day) / DAY_MS);
}

function fromEpochDay(epochDay: number): ISODate {
  return new Date(epochDay * DAY_MS).toISOString().slice(0, 10) as ISODate;
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromEpochDay(toEpochDay(date) + days);
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return toEpochDay(b) - toEpochDay(a);
}

export function compareDates(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 0 = Monday ... 6 = Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export function weekdayOf(date: ISODate): Weekday {
  // 1970-01-01 was a Thursday (index 3).
  return (((toEpochDay(date) + 3) % 7) + 7) % 7 as Weekday;
}

export function startOfWeek(date: ISODate): ISODate {
  return addDays(date, -weekdayOf(date));
}

export function weekDates(weekStart: ISODate): ISODate[] {
  return WEEKDAYS.map((i) => addDays(weekStart, i));
}

export function dateOf(value: LocalDateTime): ISODate {
  return value.slice(0, 10) as ISODate;
}

/** Minutes since local midnight. */
export function minutesOf(value: LocalDateTime): number {
  return Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16));
}

export function atTime(date: ISODate, minutes: number): LocalDateTime {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
  const h = String(Math.floor(clamped / 60)).padStart(2, '0');
  const m = String(clamped % 60).padStart(2, '0');
  return `${date}T${h}:${m}` as LocalDateTime;
}

/** Absolute minutes since the epoch day 0, for ordering and durations across days. */
export function absoluteMinutes(value: LocalDateTime): number {
  return toEpochDay(dateOf(value)) * 1440 + minutesOf(value);
}

export function fromAbsoluteMinutes(total: number): LocalDateTime {
  const day = Math.floor(total / 1440);
  return atTime(fromEpochDay(day), total - day * 1440);
}

export function todayLocal(now: Date = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}` as ISODate;
}

/** A closed range of days, `start <= end`. Construct with `dateRange`. */
export type DateRange = { readonly start: ISODate; readonly end: ISODate };

export function dateRange(a: ISODate, b: ISODate): DateRange {
  return compareDates(a, b) <= 0 ? { start: a, end: b } : { start: b, end: a };
}

export function rangeContains(range: DateRange, date: ISODate): boolean {
  return compareDates(range.start, date) <= 0 && compareDates(date, range.end) <= 0;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export function formatShortDate(date: ISODate): string {
  const [, m, day] = date.split('-').map(Number) as [number, number, number];
  return `${MONTHS[m - 1]} ${day}`;
}

export function dayName(date: ISODate): string {
  return DAY_NAMES[weekdayOf(date)] as string;
}

export function shortDayName(date: ISODate): string {
  return dayName(date).slice(0, 3);
}

export function formatRange(range: DateRange): string {
  if (range.start === range.end) return formatShortDate(range.start);
  const [, m1] = range.start.split('-');
  const [, m2, d2] = range.end.split('-');
  return m1 === m2 ? `${formatShortDate(range.start)} to ${Number(d2)}` : `${formatShortDate(range.start)} to ${formatShortDate(range.end)}`;
}

export function formatClock(value: LocalDateTime | number): string {
  const minutes = typeof value === 'number' ? value : minutesOf(value);
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}
