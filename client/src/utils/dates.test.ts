import { describe, expect, it } from 'vitest';
import { fileDateStamp, formatHour, parseUsDate, reportYears } from './dates';

describe('reportYears', () => {
  it('runs from the first year through next year', () => {
    expect(reportYears(2022, new Date(2026, 9, 9))).toEqual([2022, 2023, 2024, 2025, 2026, 2027]);
  });

  it('still offers next year when the first year is in the future', () => {
    expect(reportYears(2030, new Date(2026, 9, 9))).toEqual([2027]);
  });
});

describe('fileDateStamp', () => {
  it('is M-D-YY without zero padding', () => {
    expect(fileDateStamp(new Date(2026, 0, 5))).toBe('1-5-26');
  });
});

describe('parseUsDate', () => {
  it('accepts MM/DD/YYYY as a local date and rejects anything else', () => {
    expect(parseUsDate('10/09/2026')?.getDate()).toBe(9);
    expect(parseUsDate('2026-10-09')).toBeNull();
    expect(parseUsDate(42)).toBeNull();
  });
});

describe('formatHour', () => {
  it('pads the hour to two digits on the hour', () => {
    expect(formatHour(7)).toBe('07:00');
    expect(formatHour(23)).toBe('23:00');
  });
});
