import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

// The reporting year runs September through August and is named for both
// calendar years it spans.
export const FISCAL_START_MONTH = 9;
export const MONTHS_IN_YEAR = 12;

// Sentinel for the raw-entries tab. Not '' (Summary) and not an agency name.
export const RAW_TAB = '__datto__';

export interface DateRange {
  start: string;
  end: string;
  label: string;
  detail: string;
  incomplete: boolean;
}

export const currentFiscalYear = (now = dayjs()): number =>
  now.month() >= FISCAL_START_MONTH - 1 ? now.year() : now.year() - 1;

// The year can start in any month, but it is always twelve whole months: pick
// the month it opens in and it runs to the day before that month comes round
// again, so August 2025 gives 1 Aug 2025 - 31 Jul 2026. Keeping the window at a
// full year is what lets every monthly figure stay a division by
// MONTHS_IN_YEAR; an arbitrary start and end would quietly make all of them
// wrong rather than merely differently scoped.
export const rangeFromStartMonth = (value: Dayjs | null): DateRange | null => {
  if (!value) return null;
  // Whatever day the picker hands back, the year opens on the 1st.
  const start = dayjs(value).startOf('month');
  if (!start.isValid()) return null;
  const end = start.add(1, 'year').subtract(1, 'day');
  return {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD'),
    label: `${start.format('MMM YYYY')} – ${end.format('MMM YYYY')}`,
    detail: `${start.format('D MMM YYYY')} – ${end.format('D MMM YYYY')}`,
    // A range running past today has months with no data yet, which drags every
    // average down. Worth saying rather than leaving to be discovered.
    incomplete: end.isAfter(dayjs()),
  };
};

// Default to the last complete Sep-Aug year. The one in progress has partial
// data and would understate every figure on the page.
export const defaultStartMonth = (now = dayjs()): Dayjs =>
  dayjs(new Date(currentFiscalYear(now) - 1, FISCAL_START_MONTH - 1, 1));

// Clearing the month input must not take the range down with it; the default
// start month is always a valid date, so the fallback is never null.
export const rangeOrDefault = (value: Dayjs | null): DateRange =>
  rangeFromStartMonth(value) ?? (rangeFromStartMonth(defaultStartMonth()) as DateRange);
