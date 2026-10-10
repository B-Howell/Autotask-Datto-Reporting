import { Box, Typography } from '@mui/material';

interface LogTailPanelProps {
  /** Every line received so far, oldest first. */
  logs: string[];
  /** How many of the newest lines to render. */
  tail?: number;
}

/** A fixed-height monospace box showing the newest lines of a server log stream. */
const LogTailPanel = ({ logs, tail = 40 }: LogTailPanelProps) => (
  <Box
    sx={{ bgcolor: 'background.default', borderRadius: 2, p: 2, maxHeight: 260, overflow: 'auto' }}
  >
    {logs.length === 0 ? (
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
        Waiting for logs…
      </Typography>
    ) : (
      logs.slice(-tail).map((line, idx) => (
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

export default LogTailPanel;
