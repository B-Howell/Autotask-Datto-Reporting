import type { RatedDepartment, UtilizationReport } from '@/api';

export type { RatedDepartment } from '@/api';

/** Rate overrides by department name; strings because the settings dialog stores raw input. */
export type Rates = Record<string, number | string>;

// Autotask's "Level 0 - Administration" is the same team as Administration, so
// it is aliased onto that row rather than standing apart.
export const CATEGORY_ALIASES: Record<string, string> = {
  'Level 0 - Administration': 'Administration',
};

export const normalizeCategory = (name: string): string => CATEGORY_ALIASES[name] || name;

/**
 * Only the rated departments that appear in the data get a row. The list is the
 * tenant's `ratedDepartments`, in its order; the caller subscribes and passes it.
 */
export const departmentsIn = (
  utilData: UtilizationReport | null,
  departments: RatedDepartment[]
): RatedDepartment[] => {
  const present = new Set(
    (utilData?.rows || []).filter((r) => r.category).map((r) => normalizeCategory(r.category))
  );
  return departments.filter((d) => present.has(d.department));
};

/** The saved rate overrides laid over the standard rates of the given departments. */
export const withDefaultRates = (overrides: Rates, departments: RatedDepartment[]): Rates => ({
  ...Object.fromEntries(departments.map((d) => [d.department, d.rate])),
  ...overrides,
});
