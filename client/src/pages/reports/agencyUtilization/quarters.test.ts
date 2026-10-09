import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { defaultQuarterKey, quarterChoices } from './quarters';

describe('quarterChoices', () => {
  it('walks back from the current quarter to the earliest year, newest first', () => {
    const keys = quarterChoices(2025, dayjs('2026-10-09')).map((c) => c.key);
    expect(keys).toEqual([
      '2026-Q4',
      '2026-Q3',
      '2026-Q2',
      '2026-Q1',
      '2025-Q4',
      '2025-Q3',
      '2025-Q2',
      '2025-Q1',
    ]);
  });

  it('marks only the current quarter as in progress and gives inclusive date ranges', () => {
    const [current, previous] = quarterChoices(2026, dayjs('2026-10-09'));
    expect(current).toMatchObject({ key: '2026-Q4', start: '2026-10-01', end: '2026-12-31' });
    expect(current!.detail).toContain('in progress');
    expect(previous!.detail).not.toContain('in progress');
  });

  it('still offers the current year when the earliest year is in the future', () => {
    expect(quarterChoices(2030, dayjs('2026-10-09')).map((c) => c.key)).toEqual([
      '2026-Q4',
      '2026-Q3',
      '2026-Q2',
      '2026-Q1',
    ]);
  });
});

describe('defaultQuarterKey', () => {
  it('is the quarter that just ended, crossing the year boundary in Q1', () => {
    expect(defaultQuarterKey(dayjs('2026-10-09'))).toBe('2026-Q3');
    expect(defaultQuarterKey(dayjs('2026-02-15'))).toBe('2025-Q4');
  });
});
