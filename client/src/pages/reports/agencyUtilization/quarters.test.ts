import dayjs from 'dayjs';
import { afterEach, describe, expect, it } from 'vitest';
import useTenantStore, { TENANT_DEFAULTS } from '@/store/tenantStore';
import { defaultQuarterKey, quarterChoices } from './quarters';

afterEach(() => useTenantStore.setState({ tenant: TENANT_DEFAULTS, loaded: false }));

describe('quarterChoices', () => {
  it('walks back from the current quarter to the given earliest year, newest first', () => {
    const keys = quarterChoices(dayjs('2026-10-09'), 2025).map((c) => c.key);
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
    const [current, previous] = quarterChoices(dayjs('2026-10-09'), 2026);
    expect(current).toMatchObject({ key: '2026-Q4', start: '2026-10-01', end: '2026-12-31' });
    expect(current!.detail).toContain('in progress');
    expect(previous!.detail).not.toContain('in progress');
  });

  it('floors at the tenant earliest quarter year when none is given', () => {
    useTenantStore.getState().setTenant({ ...TENANT_DEFAULTS, earliestQuarterYear: 2026 });
    expect(quarterChoices(dayjs('2026-10-09')).map((c) => c.key)).toEqual([
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
