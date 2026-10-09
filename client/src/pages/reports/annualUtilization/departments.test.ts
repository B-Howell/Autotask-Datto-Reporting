import { afterEach, describe, expect, it } from 'vitest';
import type { UtilizationReport } from '@/api';
import useTenantStore, { TENANT_DEFAULTS } from '@/store/tenantStore';
import { departmentsIn, normalizeCategory, withDefaultRates } from './departments';

afterEach(() => useTenantStore.setState({ tenant: TENANT_DEFAULTS, loaded: false }));

const report = (categories: string[]): UtilizationReport => ({
  categories,
  companies: [],
  rows: categories.map((category) => ({ category, worker: 'w', byCompany: {} })),
  categoryTotals: {},
  companyTotals: {},
  grandTotal: 0,
  start: '2025-09-01',
  end: '2026-08-31',
  periodLabel: 'FY 2026',
  synced_at: null,
});

describe('departmentsIn', () => {
  it('keeps the given departments in their own order, only where the data has rows', () => {
    const departments = [
      { department: 'Help Desk', rate: 75 },
      { department: 'Call Center', rate: 65 },
    ];
    const data = report(['Call Center', 'Help Desk', 'Unknown']);
    expect(departmentsIn(data, departments).map((d) => d.department)).toEqual([
      'Help Desk',
      'Call Center',
    ]);
  });

  it('folds the Level 0 alias onto Administration and gives nothing for no data', () => {
    expect(normalizeCategory('Level 0 - Administration')).toBe('Administration');
    expect(departmentsIn(report(['Level 0 - Administration'])).map((d) => d.department)).toEqual([
      'Administration',
    ]);
    expect(departmentsIn(null)).toEqual([]);
  });
});

describe('withDefaultRates', () => {
  it('lays the overrides over the given standard rates', () => {
    const departments = [{ department: 'Help Desk', rate: 75 }];
    expect(withDefaultRates({ 'Help Desk': '80' }, departments)).toEqual({ 'Help Desk': '80' });
    expect(withDefaultRates({}, departments)).toEqual({ 'Help Desk': 75 });
  });

  it('uses the tenant departments when none are given', () => {
    useTenantStore.getState().setTenant({
      ...TENANT_DEFAULTS,
      ratedDepartments: [{ department: 'Field Tech', rate: 95 }],
    });
    expect(withDefaultRates({})).toEqual({ 'Field Tech': 95 });
  });
});
