import { useEffect } from 'react';
import { jobsApi } from '@/api';
import useReportJobStore from '@/store/reportJobStore';

const POLL_MS = 2000;

/**
 * Keeps the status bar in step with whatever report the server is running, so
 * a reload (or a second tab) shows a run already under way instead of nothing.
 * Runs started in this tab are left to their own log stream.
 */
const useServerJob = (): void => {
  const adoptServerJob = useReportJobStore((s) => s.adoptServerJob);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const job = await jobsApi.fetchCurrentJob();
        if (!cancelled && job) adoptServerJob(job);
      } catch {
        // An unreachable server is not something the status bar should report;
        // the next poll will pick it up.
      }
    };

    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [adoptServerJob]);
};

export default useServerJob;
