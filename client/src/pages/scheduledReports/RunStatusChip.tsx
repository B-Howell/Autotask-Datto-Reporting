import { Chip, Tooltip } from '@mui/material';
import type { ScheduleRun } from '@/api';

type RunStatus = ScheduleRun['status'] | null;

const COLORS: Record<Exclude<RunStatus, null>, 'success' | 'error' | 'info'> = {
  ok: 'success',
  error: 'error',
  running: 'info',
};

interface RunStatusChipProps {
  status: RunStatus;
  /** Shown as the tooltip of an error chip. */
  error?: string | null;
}

/** The outcome of a run as a small coloured chip; nothing when there has been no run. */
const RunStatusChip = ({ status, error }: RunStatusChipProps) => {
  if (!status) return null;
  const chip = <Chip label={status} size="small" color={COLORS[status]} variant="outlined" />;
  return status === 'error' && error ? <Tooltip title={error}>{chip}</Tooltip> : chip;
};

export default RunStatusChip;
