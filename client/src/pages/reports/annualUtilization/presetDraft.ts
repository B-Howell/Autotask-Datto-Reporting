import type { PresetDraft } from '@/components/report';
import type { Rates } from './departments';

interface AnnualDraftInput {
  /** The saved agency selection; null means every agency, which the preset leaves unsaid. */
  companies: Set<string> | null;
  /** The user's rate overrides only; a scheduled run lays them over the tenant's defaults. */
  rates: Rates;
}

/**
 * Describes the annual utilization report on screen for a schedule. Only a
 * real selection and real overrides are stored, so a preset saved with the
 * defaults keeps following the tenant settings if they change later.
 */
export const annualPresetDraft = ({ companies, rates }: AnnualDraftInput): PresetDraft => {
  const options: Record<string, unknown> = {};
  if (companies) options.companies = [...companies];
  if (Object.keys(rates).length > 0) options.rates = rates;
  return { reportType: 'annual_utilization', agencyKey: null, agencyName: '', options };
};
