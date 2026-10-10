import { Link as RouterLink } from 'react-router-dom';
import { Link, Paper, Typography } from '@mui/material';
import type { ScheduleRun } from '@/api';
import { DataTable } from '@/components/report';
import type { DataColumn } from '@/components/report';
import { formatDateTime } from '@/utils/dates';
import RunStatusChip from './RunStatusChip';

const SAVED_REPORTS_PATH = '/reports/saved-reports';

const COLUMNS: DataColumn<ScheduleRun>[] = [
  { key: 'started', label: 'Started', render: (run) => formatDateTime(run.started_at) },
  { key: 'finished', label: 'Finished', render: (run) => formatDateTime(run.finished_at) },
  { key: 'trigger', label: 'Trigger', render: (run) => run.trigger },
  { key: 'status', label: 'Status', render: (run) => <RunStatusChip status={run.status} /> },
  {
    key: 'error',
    label: 'Error',
    render: (run) => (
      <Typography variant="body2" color="error" sx={{ wordBreak: 'break-word' }}>
        {run.error}
      </Typography>
    ),
  },
  {
    key: 'report',
    label: 'Report',
    render: (run) =>
      run.saved_report_id === null ? null : (
        <Link component={RouterLink} to={SAVED_REPORTS_PATH} variant="body2">
          Open saved report
        </Link>
      ),
  },
];

interface RunsTableProps {
  title: string;
  runs: ScheduleRun[];
}

/** The run history of one schedule, newest first as the server lists it. */
const RunsTable = ({ title, runs }: RunsTableProps) => (
  <Paper sx={{ p: 2, mb: 3 }}>
    <Typography variant="h6" sx={{ mb: 1 }}>
      {title}
    </Typography>
    {runs.length === 0 ? (
      <Typography variant="body2" color="text.secondary">
        No runs yet.
      </Typography>
    ) : (
      <DataTable columns={COLUMNS} rows={runs} rowKey={(run) => run.id} />
    )}
  </Paper>
);

export default RunsTable;
