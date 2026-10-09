import { Box, Typography } from '@mui/material';

const TAIL = 40;

interface SyncLogPanelProps {
  logs: string[];
}

const SyncLogPanel = ({ logs }: SyncLogPanelProps) => (
  <Box
    sx={{ bgcolor: 'background.default', borderRadius: 2, p: 2, maxHeight: 260, overflow: 'auto' }}
  >
    {logs.length === 0 ? (
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
        Waiting for logs…
      </Typography>
    ) : (
      logs.slice(-TAIL).map((line, idx) => (
        <Typography
          key={idx}
          variant="body2"
          sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
        >
          {line}
        </Typography>
      ))
    )}
  </Box>
);

export default SyncLogPanel;
