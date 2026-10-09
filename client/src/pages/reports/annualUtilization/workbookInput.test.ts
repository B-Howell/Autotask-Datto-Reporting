import { describe, expect, it } from 'vitest';
import type { UtilizationEntry, UtilizationReport } from '@/api';
import { annualWorkbookInput } from './workbookInput';

const utilData: UtilizationReport = {
  categories: ['Help Desk'],
  companies: ['Bluewater Public Library', 'Harbor Point Health'],
  rows: [
    {
      category: 'Help Desk',
      worker: 'Dana',
      byCompany: { 'Bluewater Public Library': 60, 'Harbor Point Health': 120 },
    },
  ],
  categoryTotals: { 'Help Desk': { 'Bluewater Public Library': 60, 'Harbor Point Health': 120 } },
  companyTotals: { 'Bluewater Public Library': 60, 'Harbor Point Health': 120 },
  grandTotal: 180,
  start: '2025-09-01',
  end: '2026-08-31',
  periodLabel: 'FY 2025-26',
  synced_at: null,
};

const entries: UtilizationEntry[] = [
  {
    date: '2025-09-02',
    company: 'Harbor Point Health',
    ticket: 'T20250902.0001',
    title: 'Password reset',
    resource: 'Dana',
    hours: 0.5,
    role: 'Help Desk',
  },
];

const departments = [{ department: 'Help Desk', rate: 75 }];

describe('annualWorkbookInput', () => {
  it('carries the report, entries and departments through with a summary over every company', () => {
    const input = annualWorkbookInput(utilData, entries, departments);
    expect(input.utilData).toBe(utilData);
    expect(input.entries).toBe(entries);
    expect(input.departments).toBe(departments);
    expect(input.companies).toEqual(['Bluewater Public Library', 'Harbor Point Health']);
    const annualHours = input.companies.reduce(
      (sum, c) => sum + input.summary.totals[c]!.annualHours,
      0
    );
    expect(annualHours).toBe(utilData.grandTotal);
    expect(input.summary.totals['Harbor Point Health']!.cost).toBe(10 * 75);
  });

  it('narrows to the chosen companies in report order and prices with the rate overrides', () => {
    const input = annualWorkbookInput(utilData, entries, departments, {
      companies: ['Harbor Point Health', 'Not In Report'],
      rates: { 'Help Desk': '80' },
    });
    expect(input.companies).toEqual(['Harbor Point Health']);
    expect(input.summary.perDept[0]!.rate).toBe(80);
    expect(input.summary.totals['Harbor Point Health']!.cost).toBe(10 * 80);
  });

  it('treats an empty selection as no companies and a null one as every company', () => {
    expect(
      annualWorkbookInput(utilData, entries, departments, { companies: [] }).companies
    ).toEqual([]);
    expect(annualWorkbookInput(utilData, entries, departments, { companies: null }).companies).toBe(
      utilData.companies
    );
  });
});
