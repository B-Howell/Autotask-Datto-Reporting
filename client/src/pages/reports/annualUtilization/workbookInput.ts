import type { UtilizationEntry, UtilizationReport } from '@/api';
import type { RatedDepartment, Rates } from './departments';
import type { AnnualWorkbookInput } from './excelExport';
import { buildSummary } from './summary';

export interface AnnualWorkbookOptions {
  /** Only these agencies, kept in the report's order; absent or null means every agency. */
  companies?: readonly string[] | null;
  /** Rate overrides by department, laid over each department's standard rate. */
  rates?: Rates;
}

/**
 * Everything the annual workbook prints: the report and its raw entries, the
 * departments present, the agencies chosen, and the per-month summary priced
 * at the standard rates unless an override says otherwise.
 */
export function annualWorkbookInput(
  utilData: UtilizationReport,
  entries: UtilizationEntry[],
  departments: RatedDepartment[],
  { companies: chosen, rates = {} }: AnnualWorkbookOptions = {}
): AnnualWorkbookInput {
  const companies = chosen
    ? utilData.companies.filter((c) => chosen.includes(c))
    : utilData.companies;
  return {
    utilData,
    summary: buildSummary(utilData, rates, companies, departments),
    companies,
    departments,
    entries,
  };
}
