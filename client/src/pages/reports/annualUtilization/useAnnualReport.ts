import { useCallback, useEffect, useMemo } from 'react';
import { utilizationApi } from '@/api';
import type { UtilizationEntry, UtilizationReport } from '@/api';
import useUtilizationData from '@/hooks/useUtilizationData';
import useAnnualUtilizationStore from '@/store/annualUtilizationStore';
import useTenantStore from '@/store/tenantStore';
import { departmentsIn, withDefaultRates } from './departments';
import { RAW_TAB } from './fiscalYear';
import { buildDetail, summaryRowsOf } from './summary';
import { annualWorkbookInput } from './workbookInput';

// Runs inside the report job: the raw entries are part of the report, so it
// is not finished until they are here. Presenting totals while this is still
// running showed a report that was not ready.
const loadEntries = async (report: UtilizationReport, signal: AbortSignal): Promise<void> => {
  const { setEntries, setEntriesFor } = useAnnualUtilizationStore.getState();
  setEntries(null);
  setEntriesFor(null);
  try {
    const data = await utilizationApi.fetchUtilizationEntries(report.start, report.end, { signal });
    setEntries(data.entries || []);
    setEntriesFor(`${report.start}:${report.end}`);
  } catch (err) {
    // The totals are still worth showing if only the raw sheet failed.
    console.error('Could not load raw entries:', err);
    setEntries([]);
  }
};

const NO_ENTRIES: UtilizationEntry[] = [];
const NO_COMPANIES: string[] = [];

/**
 * The report and everything derived from it: the selected companies, the
 * departments present, the per-month summary, the open agency's detail and the
 * raw entries. The tab and entries live in the store with the report they
 * describe, so a finished report is still there after navigating away. The
 * companies and summary come from the same workbook input the export uses, so
 * the screen and the file cannot disagree.
 */
const useAnnualReport = () => {
  const ratedDepartments = useTenantStore((s) => s.tenant.ratedDepartments);
  const storeRates = useAnnualUtilizationStore((s) => s.rates);
  const rates = useMemo(
    () => withDefaultRates(storeRates, ratedDepartments),
    [storeRates, ratedDepartments]
  );
  const selectedCompanies = useAnnualUtilizationStore((s) => s.selectedCompanies);
  // '' is the Summary tab; any other value is the agency whose sheet is open.
  const tab = useAnnualUtilizationStore((s) => s.tab);
  const setTab = useAnnualUtilizationStore((s) => s.setTab);
  const entries = useAnnualUtilizationStore((s) => s.entries) ?? NO_ENTRIES;
  const entriesFor = useAnnualUtilizationStore((s) => s.entriesFor);

  const { utilData, loading, error, fetchUtilization } = useUtilizationData(
    useAnnualUtilizationStore,
    'Annual Utilization',
    '/reports/annual-utilization',
    loadEntries
  );

  const allCompanies = useMemo(() => utilData?.companies || [], [utilData]);
  const departments = useMemo(
    () => departmentsIn(utilData, ratedDepartments),
    [utilData, ratedDepartments]
  );

  const workbookInput = useMemo(
    () =>
      utilData
        ? annualWorkbookInput(utilData, entries, departments, {
            companies: selectedCompanies && [...selectedCompanies],
            rates,
          })
        : null,
    [utilData, entries, departments, selectedCompanies, rates]
  );
  const companies = workbookInput?.companies ?? NO_COMPANIES;
  const summary = workbookInput?.summary ?? null;

  useEffect(() => {
    if (tab && tab !== RAW_TAB && !companies.includes(tab)) setTab('');
  }, [companies, tab, setTab]);

  const detail = useMemo(
    () => (utilData ? buildDetail(utilData, tab, departments) : []),
    [utilData, tab, departments]
  );
  const summaryRows = useMemo(
    () => (summary ? summaryRowsOf(summary, companies) : []),
    [summary, companies]
  );

  const generate = useCallback(
    (start: string, end: string, refresh: boolean) => fetchUtilization(start, end, { refresh }),
    [fetchUtilization]
  );

  return {
    utilData,
    loading,
    error,
    generate,
    rates,
    tab,
    setTab,
    entries,
    entriesFor,
    allCompanies,
    companies,
    departments,
    summary,
    detail,
    summaryRows,
    workbookInput,
  };
};

export default useAnnualReport;
