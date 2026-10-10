import { Box, Button, IconButton, Paper, Switch, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { ReportSchedule } from '@/api';
import { DataTable, EmptyState, REPORT_LABELS } from '@/components/report';
import type { DataColumn } from '@/components/report';
import { formatDateTime } from '@/utils/dates';
import RunStatusChip from './RunStatusChip';

const whenLabel = (row: ReportSchedule) =>
  `Day ${row.day_of_month} at ${String(row.hour).padStart(2, '0')}:00`;

const Secondary = ({ text }: { text: string }) =>
  text ? (
    <Typography variant="caption" color="text.secondary" component="div">
      {text}
    </Typography>
  ) : null;

interface SchedulesTableProps {
  schedules: ReportSchedule[];
  selectedId: number | null;
  /** The schedule a run is in flight for, whose Run now stays disabled. */
  runningId: number | null;
  onSelect: (id: number) => void;
  onRunNow: (id: number) => void;
  onToggle: (id: number, enabled: boolean) => void;
  onDelete: (id: number) => void;
}

export const EMPTY_TEXT = 'No schedules yet. Open a report, generate it, and press Schedule.';

/** Every schedule as a row; clicking a row selects it, the action cell acts alone. */
const SchedulesTable = ({
  schedules,
  selectedId,
  runningId,
  onSelect,
  onRunNow,
  onToggle,
  onDelete,
}: SchedulesTableProps) => {
  const columns: DataColumn<ReportSchedule>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <>
          <Typography variant="body2">{row.preset?.name ?? 'Preset missing'}</Typography>
          <Secondary
            text={
              row.preset
                ? [REPORT_LABELS[row.preset.report_type], row.preset.agency_name]
                    .filter(Boolean)
                    .join(' / ')
                : ''
            }
          />
        </>
      ),
    },
    { key: 'when', label: 'When', render: whenLabel },
    {
      key: 'recipients',
      label: 'Recipients',
      render: (row) => (
        <>
          <Typography variant="body2">{row.recipients_to.join(', ')}</Typography>
          <Secondary text={row.recipients_cc.length ? `cc ${row.recipients_cc.join(', ')}` : ''} />
        </>
      ),
    },
    { key: 'next', label: 'Next run', render: (row) => formatDateTime(row.next_run_at) },
    {
      key: 'last',
      label: 'Last run',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>{formatDateTime(row.last_run_at)}</span>
          <RunStatusChip status={row.last_status} error={row.last_error} />
        </Box>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Box
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            size="small"
            startIcon={<PlayArrowIcon />}
            onClick={() => onRunNow(row.id)}
            disabled={runningId === row.id}
          >
            Run now
          </Button>
          <Switch
            size="small"
            checked={row.enabled}
            onChange={(event) => onToggle(row.id, event.target.checked)}
            slotProps={{
              input: { 'aria-label': `${row.enabled ? 'Disable' : 'Enable'} schedule` },
            }}
          />
          <IconButton
            size="small"
            color="error"
            title="Delete"
            aria-label="Delete schedule"
            onClick={() => onDelete(row.id)}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (schedules.length === 0) return <EmptyState>{EMPTY_TEXT}</EmptyState>;
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <DataTable
        columns={columns}
        rows={schedules}
        rowKey={(row) => row.id}
        selectedKey={selectedId}
        onRowClick={(row) => onSelect(row.id)}
      />
    </Paper>
  );
};

export default SchedulesTable;
