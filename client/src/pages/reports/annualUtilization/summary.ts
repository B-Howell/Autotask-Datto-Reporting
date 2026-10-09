import type { UtilizationReport } from '@/api';
import type { Rates } from '@/store/annualUtilizationStore';
import { CATEGORY_ALIASES, normalizeCategory } from './departments';
import type { RatedDepartment } from './departments';
import { MONTHS_IN_YEAR } from './fiscalYear';

export interface CompanyFigures {
  annualHours: number;
  hours: number;
  cost: number;
}

export interface DepartmentSummary extends RatedDepartment {
  byCompany: Record<string, CompanyFigures>;
}

export interface CompanyTotals {
  hours: number;
  cost: number;
  annualHours: number;
  annualCost: number;
}

export interface Summary {
  perDept: DepartmentSummary[];
  totals: Record<string, CompanyTotals>;
}

export interface WorkerHours {
  worker: string;
  hours: number;
}

export interface DepartmentDetail extends RatedDepartment {
  workers: WorkerHours[];
  total: number;
}

export type SummaryRow = CompanyTotals & { company: string };

export const hrs = (n: number | undefined): string =>
  n ? (Math.round(n * 100) / 100).toLocaleString() : '';

export const money = (n: number | undefined): string =>
  n
    ? n.toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      })
    : '';

// The server keys totals by Autotask's raw category names, so an aliased
// department reads from whichever key the server used.
const categoryTotals = (
  utilData: UtilizationReport,
  department: string
): Record<string, number> | undefined => {
  const aliasKey = Object.keys(CATEGORY_ALIASES).find((k) => CATEGORY_ALIASES[k] === department);
  return (
    utilData.categoryTotals[department] ??
    (aliasKey ? utilData.categoryTotals[aliasKey] : undefined)
  );
};

/**
 * Hours come from the same totals the quarterly report uses, so the two
 * reports cannot disagree about a period they share. The summary is stated per
 * month: an average month is what gets compared against a monthly agreement,
 * which is the question this table exists to answer.
 */
export const buildSummary = (
  utilData: UtilizationReport,
  rates: Rates,
  companies: string[],
  departments: RatedDepartment[]
): Summary => {
  const perDept = departments.map((d): DepartmentSummary => {
    const rate = Number(rates[d.department] ?? d.rate) || 0;
    const totalsByCompany = categoryTotals(utilData, d.department);
    const byCompany = Object.fromEntries(
      companies.map((c): [string, CompanyFigures] => {
        const annualHours = totalsByCompany?.[c] || 0;
        const hours = annualHours / MONTHS_IN_YEAR;
        return [c, { annualHours, hours, cost: hours * rate }];
      })
    );
    return { ...d, rate, byCompany };
  });
  const totals = Object.fromEntries(
    companies.map((c): [string, CompanyTotals] => {
      const hours = perDept.reduce((sum, d) => sum + d.byCompany[c].hours, 0);
      const cost = perDept.reduce((sum, d) => sum + d.byCompany[c].cost, 0);
      return [
        c,
        { hours, cost, annualHours: hours * MONTHS_IN_YEAR, annualCost: cost * MONTHS_IN_YEAR },
      ];
    })
  );
  return { perDept, totals };
};

/** One agency's detail: each billed department, the people in it and their hours for the year. */
export const buildDetail = (
  utilData: UtilizationReport,
  company: string,
  departments: RatedDepartment[]
): DepartmentDetail[] => {
  if (!company) return [];
  return departments
    .map((d): DepartmentDetail => {
      const workers = (utilData.rows || [])
        .filter(
          (r) => normalizeCategory(r.category) === d.department && (r.byCompany[company] || 0) > 0
        )
        .map((r): WorkerHours => ({ worker: r.worker, hours: r.byCompany[company] }))
        .sort((a, b) => b.hours - a.hours);
      return { ...d, workers, total: workers.reduce((s, w) => s + w.hours, 0) };
    })
    .filter((d) => d.workers.length);
};

/** Alphabetical, so an agency is found by name rather than by hunting for its size. */
export const summaryRowsOf = (summary: Summary, companies: string[]): SummaryRow[] =>
  companies
    .map((company): SummaryRow => ({ company, ...summary.totals[company] }))
    .sort((a, b) => a.company.localeCompare(b.company));

export const detailTotal = (detail: DepartmentDetail[]): number =>
  detail.reduce((s, d) => s + d.total, 0);
