import type { PresetDraft } from '@/components/report';
import type { RatedDepartment, Rates } from './departments';

interface AnnualDraftInput {
  /** The saved agency selection; null means every agency, which the preset leaves unsaid. */
  companies: Set<string> | null;
  /** The store's rates, which hold every department once the settings dialog has been used. */
  rates: Rates;
  /** The tenant's departments with their standard rates. */
  departments: RatedDepartment[];
}

/**
 * The entries of `rates` that differ from the department's standard rate,
 * compared as numbers so `'95'` and `95` are the same rate. A name with no
 * standard rate is always an override.
 */
export const rateOverrides = (rates: Rates, departments: RatedDepartment[]): Rates => {
  const standard = new Map(departments.map((d) => [d.department, d.rate]));
  return Object.fromEntries(
    Object.entries(rates).filter(([name, rate]) => Number(rate) !== standard.get(name))
  );
};

/**
 * Describes the annual utilization report on screen for a schedule. Only a
 * real selection and real overrides are stored, so a preset saved with the
 * defaults keeps following the tenant settings if they change later.
 */
export const annualPresetDraft = ({
  companies,
  rates,
  departments,
}: AnnualDraftInput): PresetDraft => {
  const options: Record<string, unknown> = {};
  if (companies) options.companies = [...companies];
  const overrides = rateOverrides(rates, departments);
  if (Object.keys(overrides).length > 0) options.rates = overrides;
  return { reportType: 'annual_utilization', agencyKey: null, agencyName: '', options };
};
