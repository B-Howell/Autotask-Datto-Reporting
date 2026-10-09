import { useCallback, useState } from 'react';
import { presetsApi, schedulesApi } from '@/api';
import useToastStore from '@/store/toastStore';
import { errorMessage } from '@/utils/reportJob';
import type { PresetDraft } from './scheduleDraft';
import type { SchedulePayload } from './useScheduleForm';

const nextRunText = (nextRunAt: string | null) =>
  nextRunAt ? `Scheduled: next run ${new Date(nextRunAt).toLocaleString()}` : 'Scheduled';

/**
 * Owns the Schedule dialog for one report page.
 *
 * `draftFactory` describes the report on screen; a null means there is nothing
 * to schedule yet and the dialog stays closed. Saving stores the preset first
 * and the schedule second, and removes the preset again if the schedule is
 * rejected so a failed save leaves nothing behind on the server.
 */
export default function useScheduleDialog(draftFactory: () => PresetDraft | null) {
  const [draft, setDraft] = useState<PresetDraft | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const openDialog = useCallback(() => {
    const next = draftFactory();
    if (!next) return;
    // A copy, so a page that memoises its draft still hands the form a new
    // identity on every open and the fields start over.
    setDraft({ ...next, options: { ...next.options } });
    setOpen(true);
  }, [draftFactory]);

  const closeDialog = useCallback(() => setOpen(false), []);

  const save = useCallback(async ({ preset, schedule }: SchedulePayload) => {
    const { showToast } = useToastStore.getState();
    setSaving(true);
    let presetId: number | null = null;
    try {
      presetId = (await presetsApi.createPreset(preset)).id;
      const created = await schedulesApi.createSchedule({ ...schedule, preset_id: presetId });
      showToast(nextRunText(created.next_run_at), 'success');
      setOpen(false);
    } catch (err) {
      showToast(errorMessage(err), 'error');
      // The preset exists but nothing points at it; the delete cannot be
      // refused (no schedule references it), so its own failure is logged
      // rather than raising a second toast over the first.
      if (presetId !== null) {
        await presetsApi.deletePreset(presetId).catch((cleanupErr: unknown) => {
          console.warn(
            `Preset ${presetId} could not be removed after a failed schedule`,
            cleanupErr
          );
        });
      }
    } finally {
      setSaving(false);
    }
  }, []);

  return { open, draft, openDialog, closeDialog, save, saving };
}
