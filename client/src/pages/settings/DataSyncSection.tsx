import { Box, Button, CircularProgress, LinearProgress, Paper, Typography } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import type { SyncStatus } from '@/api';
import { formatDateTime } from '@/utils/dates';
import SyncLogPanel from './SyncLogPanel';
import useSyncStatus from './useSyncStatus';

const formatWhen = (iso: string | null): string => (iso ? formatDateTime(iso) : 'never');

const SyncProgress = ({ status }: { status: SyncStatus }) => (
  <Box sx={{ mb: 2 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {status.current || 'Working…'}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {status.total ? `${status.done} / ${status.total}` : ''}
      </Typography>
    </Box>
    <LinearProgress
      variant={status.total ? 'determinate' : 'indeterminate'}
      value={status.total ? Math.round((status.done / status.total) * 100) : undefined}
    />
  </Box>
);

const DataSyncSection = () => {
  const { status, logs, startSync } = useSyncStatus();

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Data Sync
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Reports read from a local cache that refreshes automatically every 24 hours. Run a manual
        sync to pull the latest data from Autotask &amp; Datto now.
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="small"
          startIcon={status.running ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
          onClick={() => void startSync()}
          disabled={status.running}
        >
          {status.running ? 'Syncing…' : 'Sync now'}
        </Button>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Last synced: {formatWhen(status.last_synced_at)}
        </Typography>
      </Box>
      {status.running && <SyncProgress status={status} />}
      {(status.running || logs.length > 0) && <SyncLogPanel logs={logs} />}
    </Paper>
  );
};

export default DataSyncSection;
