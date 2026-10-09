import { useCallback } from 'react';
import { utilizationApi } from '@/api';
import type { UtilizationReport } from '@/api';
import type { ReportDataState } from '@/store/reportDataStore';
import type { StoreApi, UseBoundStore } from 'zustand';
import useTrackedReport from './useTrackedReport';

type UtilizationStore = UseBoundStore<StoreApi<ReportDataState<UtilizationReport>>>;

/**
 * Shared fetcher for the quarterly and annual utilization reports. Both hit the
 * same endpoint with different date ranges and differ only in which store holds
 * the result and what the status bar calls the run.
 *
 * `afterFetch` runs inside the job, so a report with work outstanding (the
 * annual raw entries) does not present itself as finished early.
 */
const useUtilizationData = (
  store: UtilizationStore,
  label: string,
  route: string,
  afterFetch?: (report: UtilizationReport, signal: AbortSignal) => Promise<void>
) => {
  const utilData = store((s) => s.data);
  const loading = store((s) => s.loading);
  const error = store((s) => s.error);
  const logs = store((s) => s.logs);

  const { setData, setLoading, setError, setLogs } = store.getState();
  const runReport = useTrackedReport({ setLoading, setLogs, setError });

  // `refresh` re-pulls from Autotask; without it the server answers from its
  // snapshot, the difference between a quarter of a second and six minutes.
  const fetchUtilization = useCallback(
    (start: string, end: string, { refresh = false } = {}) => {
      setData(null);
      return runReport({
        label: `${label} · ${start} to ${end}`,
        route,
        logsUrl: utilizationApi.UTILIZATION_LOGS_URL,
        run: async (signal) => {
          const report = await utilizationApi.fetchUtilizationReport(start, end, {
            refresh,
            signal,
          });
          if (afterFetch) await afterFetch(report, signal);
          return report;
        },
        onSuccess: setData,
      });
    },
    [runReport, setData, label, route, afterFetch]
  );

  return { utilData, loading, error, logs, fetchUtilization };
};

export default useUtilizationData;
