import ScheduleDialog from './ScheduleDialog';
import type useScheduleDialog from './useScheduleDialog';

/** What `useScheduleDialog` returns, minus `openDialog`, which the Schedule button takes. */
export type ReportSchedule = Omit<ReturnType<typeof useScheduleDialog>, 'openDialog'>;

interface ReportScheduleDialogProps {
  schedule: ReportSchedule;
}

/**
 * The Schedule dialog as a report page mounts it: nothing until the first
 * open has produced a draft, then `ScheduleDialog` bound to the hook's state.
 */
const ReportScheduleDialog = ({ schedule }: ReportScheduleDialogProps) =>
  schedule.draft ? (
    <ScheduleDialog
      open={schedule.open}
      draft={schedule.draft}
      onClose={schedule.closeDialog}
      onSave={schedule.save}
      saving={schedule.saving}
    />
  ) : null;

export default ReportScheduleDialog;
