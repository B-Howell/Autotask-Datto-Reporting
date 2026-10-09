import { useCallback } from 'react';
import { slaApi } from '@/api';
import useSlaDataStore from '@/store/slaDataStore';
import useTrackedReport from './useTrackedReport';

const useSlaData = () => {
  const slaData = useSlaDataStore((s) => s.data);
  const loading = useSlaDataStore((s) => s.loading);
  const error = useSlaDataStore((s) => s.error);
  const logs = useSlaDataStore((s) => s.logs);

  const { setData, setLoading, setError, setLogs } = useSlaDataStore.getState();
  const runReport = useTrackedReport({ setLoading, setLogs, setError });

  const fetchSlaPerformance = useCallback(
    (year: number, month: number) => {
      setData(null);
      return runReport({
        label: `SLA Performance · ${year}-${String(month).padStart(2, '0')}`,
        route: '/reports/sla-performance',
        logsUrl: slaApi.SLA_LOGS_URL,
        run: (signal) => slaApi.fetchSlaReport(year, month, { signal }),
        onSuccess: setData,
      });
    },
    [runReport, setData]
  );

  return { slaData, loading, error, logs, fetchSlaPerformance };
};

export default useSlaData;
