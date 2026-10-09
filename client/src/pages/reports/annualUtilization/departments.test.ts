import { describe, expect, it } from 'vitest';
import type { UtilizationReport } from '@/api';
import { TENANT_DEFAULTS } from '@/store/tenantStore';
import { departmentsIn, normalizeCategory, withDefaultRates } from './departments';

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
    const defaults = TENANT_DEFAULTS.ratedDepartments;
    expect(normalizeCategory('Level 0 - Administration')).toBe('Administration');
    expect(
      departmentsIn(report(['Level 0 - Administration']), defaults).map((d) => d.department)
    ).toEqual(['Administration']);
    expect(departmentsIn(null, defaults)).toEqual([]);
  });
});

describe('withDefaultRates', () => {
  it('lays the overrides over the standard rates of the given departments', () => {
    const departments = [{ department: 'Help Desk', rate: 75 }];
    expect(withDefaultRates({ 'Help Desk': '80' }, departments)).toEqual({ 'Help Desk': '80' });
    expect(withDefaultRates({}, departments)).toEqual({ 'Help Desk': 75 });
  });
});
