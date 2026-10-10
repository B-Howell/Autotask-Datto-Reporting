import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { schedulesApi } from '@/api';
import type { ReportSchedule, RunnerStatus, ScheduleRun } from '@/api';
import useToastStore from '@/store/toastStore';
import useSchedules from './useSchedules';

vi.mock('@/api', () => ({
  schedulesApi: {
    fetchSchedules: vi.fn(),
    fetchRunnerStatus: vi.fn(),
    fetchRuns: vi.fn(),
    updateSchedule: vi.fn(),
    deleteSchedule: vi.fn(),
    runNow: vi.fn(),
  },
}));

const STAMP = '2026-10-09T19:00:00+00:00';
const row: ReportSchedule = {
  id: 9,
  preset_id: 4,
  preset: null,
  day_of_month: 1,
  hour: 7,
  recipients_to: ['ops@example.com'],
  recipients_cc: [],
  subject: '{report} {period}',
  body: '',
  enabled: true,
  next_run_at: '2026-11-01T07:00:00+00:00',
  last_run_at: null,
  last_status: null,
  last_error: null,
  created_at: STAMP,
  updated_at: STAMP,
};
const run: ScheduleRun = {
  id: 1,
  schedule_id: 9,
  trigger: 'manual',
  started_at: STAMP,
  finished_at: STAMP,
  status: 'error',
  error: 'DELIVERY_WEBHOOK_URL is not set',
  saved_report_id: 7,
};

const mocked = vi.mocked(schedulesApi);

const loaded = async () => {
  mocked.fetchSchedules.mockResolvedValue([row]);
  mocked.fetchRunnerStatus.mockResolvedValue({ running: false, schedule_id: null });
  mocked.fetchRuns.mockResolvedValue([run]);
  const hook = renderHook(() => useSchedules());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};

afterEach(() => {
  vi.clearAllMocks();
  useToastStore.getState().hideToast();
});

describe('useSchedules', () => {
  it('loads the list and the runner status, and the runs of the selected schedule', async () => {
    const { result } = await loaded();
    expect(result.current.schedules).toEqual([row]);
    expect(result.current.status).toEqual({ running: false, schedule_id: null });
    expect(result.current.error).toBeNull();
    expect(mocked.fetchRuns).not.toHaveBeenCalled();

    act(() => result.current.select(9));
    await waitFor(() => expect(result.current.runs).toEqual([run]));
    expect(mocked.fetchRuns).toHaveBeenCalledWith(9);

    act(() => result.current.select(9));
    expect(result.current.selectedId).toBeNull();
    expect(result.current.runs).toEqual([]);
  });

  it('reports a failed load through error', async () => {
    mocked.fetchSchedules.mockRejectedValue(new Error('Request failed (500)'));
    mocked.fetchRunnerStatus.mockResolvedValue({ running: false, schedule_id: null });
    const { result } = renderHook(() => useSchedules());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Request failed (500)');
  });

  it('toggles through updateSchedule and keeps the returned row', async () => {
    const { result } = await loaded();
    mocked.updateSchedule.mockResolvedValue({ ...row, enabled: false });
    await act(() => result.current.toggle(9, false));
    expect(mocked.updateSchedule).toHaveBeenCalledWith(9, { enabled: false });
    expect(result.current.schedules[0].enabled).toBe(false);
  });

  it('asks before deleting, then removes the row and leaves the preset alone', async () => {
    const { result } = await loaded();
    act(() => result.current.askRemove(9));
    expect(result.current.removeTarget).toEqual(row);
    act(() => result.current.cancelRemove());
    expect(result.current.removeTarget).toBeNull();

    mocked.deleteSchedule.mockResolvedValue({ deleted: true });
    await act(() => result.current.remove(9));
    expect(mocked.deleteSchedule).toHaveBeenCalledWith(9);
    expect(result.current.schedules).toEqual([]);
    expect(useToastStore.getState().message).toBe('Schedule deleted; its preset is kept');
  });

  it('toasts the conflict detail when a run is already in flight', async () => {
    const { result } = await loaded();
    mocked.runNow.mockRejectedValue(new Error('A run of schedule 3 is already in flight'));
    await act(() => result.current.runNow(9));
    expect(useToastStore.getState().severity).toBe('error');
    expect(useToastStore.getState().message).toBe('A run of schedule 3 is already in flight');
  });

  it('marks the runner busy as soon as a run is accepted, before any poll says so', async () => {
    const { result } = await loaded();
    mocked.runNow.mockResolvedValue({ started: true });
    let answerStatus: (status: RunnerStatus) => void = () => undefined;
    mocked.fetchRunnerStatus.mockImplementationOnce(
      () => new Promise<RunnerStatus>((resolve) => (answerStatus = resolve))
    );
    await act(() => result.current.runNow(9));
    expect(useToastStore.getState().message).toBe('Run started');
    expect(mocked.fetchRunnerStatus).toHaveBeenCalledTimes(2);
    expect(result.current.status).toEqual({ running: true, schedule_id: 9 });

    // The poll the flip triggered answers afterwards and its word is final.
    await act(async () => answerStatus({ running: false, schedule_id: null }));
    expect(result.current.status).toEqual({ running: false, schedule_id: null });
  });

  it('drops a refresh that resolves after the selection changed', async () => {
    const { result } = await loaded();
    let resolveRuns: (runs: ScheduleRun[]) => void = () => undefined;
    mocked.fetchRuns.mockImplementationOnce(
      () => new Promise<ScheduleRun[]>((resolve) => (resolveRuns = resolve))
    );
    act(() => result.current.select(9));
    await waitFor(() => expect(mocked.fetchRuns).toHaveBeenCalledWith(9));
    act(() => result.current.select(9));
    await act(async () => resolveRuns([run]));
    expect(result.current.selectedId).toBeNull();
    expect(result.current.runs).toEqual([]);
  });

  it('reports removing while the delete request is in flight', async () => {
    const { result } = await loaded();
    let resolveDelete: (value: { deleted: boolean }) => void = () => undefined;
    mocked.deleteSchedule.mockImplementationOnce(
      () => new Promise<{ deleted: boolean }>((resolve) => (resolveDelete = resolve))
    );
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.remove(9);
    });
    expect(result.current.removing).toBe(true);
    await act(async () => {
      resolveDelete({ deleted: true });
      await pending;
    });
    expect(result.current.removing).toBe(false);
    expect(result.current.schedules).toEqual([]);
  });
});
