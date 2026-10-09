import { useCallback } from 'react';
import { errorMessage, isAbortError, runReportJob } from '@/utils/reportJob';
import type { ReportJobOptions } from '@/utils/reportJob';

export interface TrackedReportTarget {
  setLoading: (loading: boolean) => void;
  setLogs?: (update: (prev: string[]) => string[]) => void;
  setError?: (error: string | null) => void;
}

export interface TrackedReportRun<T> extends Omit<ReportJobOptions<T>, 'onLogs'> {
  onSuccess: (data: T) => void;
  onFailure?: () => void;
}

/**
 * The lifecycle every report hook shares: mark loading, clear the log and
 * error, run the job with the status bar tracking it, store the result or
 * the error, and never treat a cancellation as a failure.
 */
const useTrackedReport = (target: TrackedReportTarget) => {
  const { setLoading, setLogs, setError } = target;

  return useCallback(
    async <T>({ onSuccess, onFailure, ...job }: TrackedReportRun<T>) => {
      setLoading(true);
      setLogs?.(() => []);
      setError?.(null);
      try {
        const data = await runReportJob<T>({
          ...job,
          onLogs: setLogs ? (lines) => setLogs((prev) => [...prev, ...lines]) : undefined,
        });
        onSuccess(data);
      } catch (err) {
        if (isAbortError(err)) return;
        console.error(`${job.label} failed:`, err);
        setError?.(errorMessage(err));
        onFailure?.();
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setLogs, setError]
  );
};

export default useTrackedReport;
