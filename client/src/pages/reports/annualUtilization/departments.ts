import type { UtilizationReport } from '@/api';
import type { Rates } from '@/store/annualUtilizationStore';

export interface RatedDepartment {
  department: string;
  rate: number;
}

// Departments with a standard rate, in the order the annual report lists them.
export const RATED_DEPARTMENTS: RatedDepartment[] = [
  { department: 'Administration', rate: 0 },
  { department: 'Call Center', rate: 65 },
  { department: 'Help Desk', rate: 75 },
  { department: 'Jr Sys Admin', rate: 80 },
  { department: 'Sr Sys Admin', rate: 90 },
];

// Autotask's "Level 0 - Administration" is the same team as Administration, so
// it is aliased onto that row rather than standing apart.
export const CATEGORY_ALIASES: Record<string, string> = {
  'Level 0 - Administration': 'Administration',
};

export const normalizeCategory = (name: string): string => CATEGORY_ALIASES[name] || name;

/** Only the RATED_DEPARTMENTS that actually appear in the data get a row. */
export const departmentsIn = (utilData: UtilizationReport | null): RatedDepartment[] => {
  const present = new Set(
    (utilData?.rows || []).filter((r) => r.category).map((r) => normalizeCategory(r.category))
  );
  return RATED_DEPARTMENTS.filter((d) => present.has(d.department));
};

/** The saved rate overrides laid over the standard rates. */
export const withDefaultRates = (overrides: Rates): Rates => ({
  ...Object.fromEntries(RATED_DEPARTMENTS.map((d) => [d.department, d.rate])),
  ...overrides,
});
