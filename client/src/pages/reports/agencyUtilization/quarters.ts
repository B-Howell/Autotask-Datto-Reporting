import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

export interface QuarterChoice {
  key: string;
  label: string;
  detail: string;
  start: string;
  end: string;
}

const MONTHS_OF: Record<number, string> = {
  1: 'Jan – Mar',
  2: 'Apr – Jun',
  3: 'Jul – Sep',
  4: 'Oct – Dec',
};
const iso = (d: Dayjs): string => d.format('YYYY-MM-DD');

const quarterRange = (year: number, q: number) => {
  const start = dayjs(new Date(year, (q - 1) * 3, 1));
  return { start: iso(start), end: iso(start.add(3, 'month').subtract(1, 'day')) };
};

/**
 * One entry per quarter, newest first, back to the tenant's earliest year. A
 * quarter is picked as one thing rather than from separate quarter and year
 * dropdowns, and future quarters are left out since they can only come back
 * empty. The floor is clamped to the current year so the list is never empty.
 */
export const quarterChoices = (earliestYear: number, now: Dayjs = dayjs()): QuarterChoice[] => {
  const out: QuarterChoice[] = [];
  const thisYear = now.year();
  const thisQuarter = Math.floor(now.month() / 3) + 1;
  const floor = Math.min(earliestYear, thisYear);
  for (let y = thisYear; y >= floor; y -= 1) {
    for (let q = 4; q >= 1; q -= 1) {
      if (y === thisYear && q > thisQuarter) continue;
      const inProgress = y === thisYear && q === thisQuarter;
      out.push({
        key: `${y}-Q${q}`,
        label: `Q${q} ${y}`,
        detail: `${MONTHS_OF[q]} ${y}${inProgress ? ' · in progress' : ''}`,
        ...quarterRange(y, q),
      });
    }
  }
  return out;
};

/** The quarter that just ended: the most recent one with complete data. */
export const defaultQuarterKey = (now: Dayjs = dayjs()): string => {
  const q = Math.floor(now.month() / 3) + 1;
  return q === 1 ? `${now.year() - 1}-Q4` : `${now.year()}-Q${q - 1}`;
};

/** Hours to two decimals, with zero shown as an empty cell. */
export const fmtHours = (n: number | null | undefined): string => {
  if (n === null || n === undefined || n === 0) return '';
  return (Math.round(n * 100) / 100).toString();
};
