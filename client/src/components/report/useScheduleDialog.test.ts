import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { presetsApi, schedulesApi } from '@/api';
import type { ReportPreset, ReportSchedule } from '@/api';
import useToastStore from '@/store/toastStore';
import type { PresetDraft } from './scheduleDraft';
import useScheduleDialog from './useScheduleDialog';

vi.mock('@/api', () => ({
  presetsApi: { createPreset: vi.fn(), deletePreset: vi.fn() },
  schedulesApi: { createSchedule: vi.fn() },
}));

const draft: PresetDraft = {
  reportType: 'devices',
  agencyKey: '1000',
  agencyName: 'Harbor Point Health',
  options: { columns: ['Product'] },
};
const preset = {
  name: 'Harbor Point Health Device inventory',
  report_type: 'devices' as const,
  agency_key: '1000',
  agency_name: 'Harbor Point Health',
  options: { columns: ['Product'] },
};
const schedule = {
  day_of_month: 1,
  hour: 7,
  recipients_to: ['a@example.com'],
  recipients_cc: [],
  subject: '{report} {period}',
  body: '',
};
const STAMP = '2026-10-09T19:00:00+00:00';
const presetRow: ReportPreset = { id: 4, ...preset, created_at: STAMP, updated_at: STAMP };
const scheduleRow: ReportSchedule = {
  id: 9,
  preset_id: 4,
  preset: presetRow,
  ...schedule,
  enabled: true,
  next_run_at: '2026-11-01T07:00:00+00:00',
  last_run_at: null,
  last_status: null,
  last_error: null,
  created_at: STAMP,
  updated_at: STAMP,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  useToastStore.getState().hideToast();
});

describe('useScheduleDialog', () => {
  it('opens with the draft the factory returns and stays closed on null', () => {
    const { result, rerender } = renderHook(({ make }) => useScheduleDialog(make), {
      initialProps: { make: () => null as PresetDraft | null },
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

  it('hands the form a fresh copy on every open even when the factory memoises', () => {
    const { result } = renderHook(() => useScheduleDialog(() => draft));
    act(() => result.current.openDialog());
    const first = result.current.draft;
    act(() => result.current.closeDialog());
    act(() => result.current.openDialog());

    expect(result.current.draft).toEqual(draft);
    expect(result.current.draft).not.toBe(first);
    expect(result.current.draft?.options).not.toBe(draft.options);
  });

  it('creates the preset then the schedule, toasts the next run and closes', async () => {
    vi.mocked(presetsApi.createPreset).mockResolvedValue(presetRow);
    vi.mocked(schedulesApi.createSchedule).mockResolvedValue(scheduleRow);
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
    vi.mocked(presetsApi.createPreset).mockResolvedValue(presetRow);
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

  it('warns, without a second toast, when the leftover preset cannot be removed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(presetsApi.createPreset).mockResolvedValue(presetRow);
    vi.mocked(presetsApi.deletePreset).mockRejectedValue(new Error('Request failed (500)'));
    vi.mocked(schedulesApi.createSchedule).mockRejectedValue(new Error('A subject is required'));
    const { result } = renderHook(() => useScheduleDialog(() => draft));
    await act(() => result.current.save({ preset, schedule }));

    expect(warn).toHaveBeenCalledWith(
      'Preset 4 could not be removed after a failed schedule',
      expect.any(Error)
    );
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
