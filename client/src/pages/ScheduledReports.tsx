import { Box, CircularProgress, Typography } from '@mui/material';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ErrorBanner, ReportPage } from '@/components/report';
import DeliveryTestButton from './scheduledReports/DeliveryTestButton';
import RendererStatusChip from './scheduledReports/RendererStatusChip';
import RunnerLog from './scheduledReports/RunnerLog';
import RunsTable from './scheduledReports/RunsTable';
import SchedulesTable from './scheduledReports/SchedulesTable';
import useSchedules from './scheduledReports/useSchedules';

/** Every monthly delivery on record, with the runner's live log and each schedule's run history. */
const ScheduledReports = () => {
  const {
    schedules,
    status,
    loading,
    error,
    selectedId,
    runs,
    removeTarget,
    select,
    toggle,
    askRemove,
    cancelRemove,
    remove,
    runNow,
  } = useSchedules();
  const selected = schedules.find((row) => row.id === selectedId) ?? null;

  return (
    <ReportPage title="Scheduled Reports">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <RendererStatusChip />
        <Box sx={{ flexGrow: 1 }} />
        <DeliveryTestButton />
      </Box>
      <ErrorBanner error={error} />
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
          <CircularProgress size={20} />
          <Typography>Loading…</Typography>
        </Box>
      ) : (
        <SchedulesTable
          schedules={schedules}
          selectedId={selectedId}
          runningId={status.running ? status.schedule_id : null}
          onSelect={select}
          onRunNow={(id) => void runNow(id)}
          onToggle={(id, enabled) => void toggle(id, enabled)}
          onDelete={askRemove}
        />
      )}
      <RunnerLog running={status.running} />
      {selected && (
        <RunsTable
          title={`Runs of ${selected.preset?.name ?? `schedule ${selected.id}`}`}
          runs={runs}
        />
      )}
      <ConfirmDialog
        open={removeTarget !== null}
        title="Delete this schedule?"
        confirmLabel="Delete"
        destructive
        onConfirm={() => removeTarget && void remove(removeTarget.id)}
        onClose={cancelRemove}
      >
        {removeTarget?.preset?.name ?? 'This schedule'} will stop going out and its run history is
        removed. The report preset and any saved reports are kept.
      </ConfirmDialog>
    </ReportPage>
  );
};

export default ScheduledReports;
