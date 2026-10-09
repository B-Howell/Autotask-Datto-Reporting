import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { presetsApi, schedulesApi } from '@/api';
import useToastStore from '@/store/toastStore';
import useScheduleDialog from './useScheduleDialog';

vi.mock('@/api', () => ({
  presetsApi: { createPreset: vi.fn(), deletePreset: vi.fn() },
  schedulesApi: { createSchedule: vi.fn() },
}));

const draft = {
  reportType: 'devices' as const,
  agencyKey: '1000',
  agencyName: 'Harbor Point Health',
  options: {},
};
const preset = {
  name: 'Harbor Point Health Device inventory',
  report_type: 'devices' as const,
  agency_key: '1000',
  agency_name: 'Harbor Point Health',
  options: {},
};
const schedule = {
  day_of_month: 1,
  hour: 7,
  recipients_to: ['a@example.com'],
  recipients_cc: [],
  subject: '{report} {period}',
  body: '',
};

afterEach(() => {
  vi.clearAllMocks();
  useToastStore.getState().hideToast();
});

describe('useScheduleDialog', () => {
  it('opens with the draft the factory returns and stays closed on null', () => {
    const { result, rerender } = renderHook(({ make }) => useScheduleDialog(make), {
      initialProps: { make: () => null as typeof draft | null },
    });
    act(() => result.current.openDialog());
    expect(result.current.open).toBe(false);

    rerender({ make: () => draft });
    act(() => result.current.openDialog());
    expect(result.current.open).toBe(true);
    expect(result.current.draft).toEqual(draft);
    act(() => result.current.closeDialog());
    expect(result.current.open).toBe(false);
  });

  it('creates the preset then the schedule, toasts the next run and closes', async () => {
    vi.mocked(presetsApi.createPreset).mockResolvedValue({ id: 4 } as never);
    vi.mocked(schedulesApi.createSchedule).mockResolvedValue({
      id: 9,
      next_run_at: '2026-11-01T07:00:00+00:00',
    } as never);
    const { result } = renderHook(() => useScheduleDialog(() => draft));
    act(() => result.current.openDialog());
    await act(() => result.current.save({ preset, schedule }));

    expect(schedulesApi.createSchedule).toHaveBeenCalledWith({ ...schedule, preset_id: 4 });
    expect(result.current.open).toBe(false);
    expect(result.current.saving).toBe(false);
    expect(useToastStore.getState().severity).toBe('success');
    expect(useToastStore.getState().message).toMatch(/^Scheduled: next run /);
  });

  it('removes the preset again when the schedule cannot be saved', async () => {
    vi.mocked(presetsApi.createPreset).mockResolvedValue({ id: 4 } as never);
    vi.mocked(presetsApi.deletePreset).mockResolvedValue({ deleted: true });
    vi.mocked(schedulesApi.createSchedule).mockRejectedValue(new Error('A subject is required'));
    const { result } = renderHook(() => useScheduleDialog(() => draft));
    act(() => result.current.openDialog());
    await act(() => result.current.save({ preset, schedule }));

    expect(presetsApi.deletePreset).toHaveBeenCalledWith(4);
    expect(result.current.open).toBe(true);
    expect(useToastStore.getState().severity).toBe('error');
    expect(useToastStore.getState().message).toBe('A subject is required');
  });

  it('does not try to delete anything when the preset itself is rejected', async () => {
    vi.mocked(presetsApi.createPreset).mockRejectedValue(new Error('This report needs an agency'));
    const { result } = renderHook(() => useScheduleDialog(() => draft));
    await act(() => result.current.save({ preset, schedule }));

    expect(schedulesApi.createSchedule).not.toHaveBeenCalled();
    expect(presetsApi.deletePreset).not.toHaveBeenCalled();
    expect(useToastStore.getState().message).toBe('This report needs an agency');
  });
});
