import { useCallback, useEffect, useRef, useState } from 'react';
import { schedulesApi } from '@/api';
import type { ReportSchedule, RunnerStatus, ScheduleRun } from '@/api';
import useToastStore from '@/store/toastStore';
import { errorMessage } from '@/utils/reportJob';

const IDLE_STATUS: RunnerStatus = { running: false, schedule_id: null };
const RUNNING_POLL_MS = 5000;
const IDLE_POLL_MS = 30000;

/**
 * The schedule list, the runner's status and the runs of the selected schedule,
 * refreshed together: every 5 s while a run is in flight, otherwise every 30 s.
 *
 * Deleting a schedule leaves its preset in place: presets can be shared by
 * several schedules, so the page never calls `deletePreset` on its own.
 */
const useSchedules = () => {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [status, setStatus] = useState<RunnerStatus>(IDLE_STATUS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [runs, setRuns] = useState<ScheduleRun[]>([]);
  const [removeTarget, setRemoveTarget] = useState<ReportSchedule | null>(null);
  const [removing, setRemoving] = useState(false);
  // Each refresh takes a ticket; a response arriving after a newer refresh
  // started (or after the selection changed) is dropped rather than applied.
  const ticketRef = useRef(0);
  const showToast = useToastStore((s) => s.showToast);

  const refresh = useCallback(async () => {
    const ticket = ++ticketRef.current;
    try {
      const [list, runner, selectedRuns] = await Promise.all([
        schedulesApi.fetchSchedules(),
        schedulesApi.fetchRunnerStatus(),
        selectedId === null ? Promise.resolve(null) : schedulesApi.fetchRuns(selectedId),
      ]);
      if (ticket !== ticketRef.current) return;
      setSchedules(list);
      setStatus(runner);
      if (selectedRuns) setRuns(selectedRuns);
      setError(null);
    } catch (err) {
      if (ticket !== ticketRef.current) return;
      setError(errorMessage(err) || 'Schedules could not be loaded');
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(
      () => void refresh(),
      status.running ? RUNNING_POLL_MS : IDLE_POLL_MS
    );
    return () => clearInterval(timer);
  }, [refresh, status.running]);

  const select = (id: number) => {
    ticketRef.current += 1;
    setSelectedId((current) => (current === id ? null : id));
    setRuns([]);
  };

  const toggle = async (id: number, enabled: boolean) => {
    try {
      const updated = await schedulesApi.updateSchedule(id, { enabled });
      setSchedules((rows) => rows.map((row) => (row.id === id ? updated : row)));
    } catch (err) {
      showToast(errorMessage(err) || 'The schedule could not be updated', 'error');
    }
  };

  const askRemove = (id: number) => setRemoveTarget(schedules.find((row) => row.id === id) ?? null);
  const cancelRemove = () => setRemoveTarget(null);

  const remove = async (id: number) => {
    setRemoving(true);
    try {
      await schedulesApi.deleteSchedule(id);
      setSchedules((rows) => rows.filter((row) => row.id !== id));
      if (selectedId === id) setSelectedId(null);
      showToast('Schedule deleted; its preset is kept', 'info');
    } catch (err) {
      showToast(errorMessage(err) || 'The schedule could not be deleted', 'error');
    }
    setRemoving(false);
    setRemoveTarget(null);
  };

  // Marking the runner busy here flips the poll to its fast cadence, and the
  // effect that rebuilds the interval refreshes at once, so no extra call is needed.
  const runNow = async (id: number) => {
    try {
      await schedulesApi.runNow(id);
      showToast('Run started', 'info');
      setStatus({ running: true, schedule_id: id });
    } catch (err) {
      showToast(errorMessage(err) || 'The run could not start', 'error');
    }
  };

  return {
    schedules,
    status,
    loading,
    error,
    selectedId,
    runs,
    removeTarget,
    removing,
    select,
    toggle,
    askRemove,
    cancelRemove,
    remove,
    runNow,
  };
};

export default useSchedules;
