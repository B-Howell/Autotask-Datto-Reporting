export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export type MonthName = (typeof MONTH_NAMES)[number];

/**
 * Years offered in month/year pickers: the tenant's first reporting year through
 * next year. The floor is clamped to next year so the list is never empty.
 */
export function reportYears(firstYear: number, now = new Date()): number[] {
  const last = now.getFullYear() + 1;
  const first = Math.min(firstYear, last);
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/** `M-D-YY`, the stamp used in exported file names. */
export function fileDateStamp(now = new Date()): string {
  return `${now.getMonth() + 1}-${now.getDate()}-${String(now.getFullYear()).slice(-2)}`;
}

/** "October 9, 2026", for report headings. */
export function longDate(now = new Date()): string {
  return now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Parse the server's `MM/DD/YYYY` strings into a local Date, or null. */
export function parseUsDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `HH:00`, the hour of the day a schedule fires at. */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}
