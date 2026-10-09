import type { RatedDepartment, UtilizationReport } from '@/api';
import type { Rates } from '@/store/annualUtilizationStore';
import useTenantStore from '@/store/tenantStore';

export type { RatedDepartment } from '@/api';

/** Departments with a standard rate, in the order the annual report lists them. */
export const ratedDepartments = (): RatedDepartment[] =>
  useTenantStore.getState().tenant.ratedDepartments;

// Autotask's "Level 0 - Administration" is the same team as Administration, so
// it is aliased onto that row rather than standing apart.
export const CATEGORY_ALIASES: Record<string, string> = {
  'Level 0 - Administration': 'Administration',
};

export const normalizeCategory = (name: string): string => CATEGORY_ALIASES[name] || name;

/** Only the rated departments (the tenant's unless given) that appear in the data get a row. */
export const departmentsIn = (
  utilData: UtilizationReport | null,
  departments: RatedDepartment[] = ratedDepartments()
): RatedDepartment[] => {
  const present = new Set(
    (utilData?.rows || []).filter((r) => r.category).map((r) => normalizeCategory(r.category))
  );
  return departments.filter((d) => present.has(d.department));
};

/** The saved rate overrides laid over the standard rates (the tenant's unless given). */
export const withDefaultRates = (
  overrides: Rates,
  departments: RatedDepartment[] = ratedDepartments()
): Rates => ({
  ...Object.fromEntries(departments.map((d) => [d.department, d.rate])),
  ...overrides,
});
