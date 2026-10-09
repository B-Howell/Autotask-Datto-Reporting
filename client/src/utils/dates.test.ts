import { afterEach, describe, expect, it } from 'vitest';
import useTenantStore, { TENANT_DEFAULTS } from '@/store/tenantStore';
import { fileDateStamp, parseUsDate, reportYears } from './dates';

afterEach(() => useTenantStore.setState({ tenant: TENANT_DEFAULTS, loaded: false }));

describe('reportYears', () => {
  it('runs from the given first year through next year', () => {
    expect(reportYears(new Date(2026, 9, 9), 2022)).toEqual([2022, 2023, 2024, 2025, 2026, 2027]);
  });

  it('starts at the tenant first report year when none is given', () => {
    useTenantStore.getState().setTenant({ ...TENANT_DEFAULTS, firstReportYear: 2025 });
    expect(reportYears(new Date(2026, 9, 9))).toEqual([2025, 2026, 2027]);
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
