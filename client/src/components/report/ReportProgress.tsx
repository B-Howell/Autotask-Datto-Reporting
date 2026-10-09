import { Box, CircularProgress, LinearProgress, Paper, Typography } from '@mui/material';

interface ReportProgressProps {
  message: string;
  logs: string[];
  /** How many of the most recent log lines to show. */
  tail?: number;
}

/** Spinner, bar and a monospace tail of the server log while a report runs. */
const ReportProgress = ({ message, logs, tail = 25 }: ReportProgressProps) => (
  <Paper sx={{ p: 3, mb: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
      <CircularProgress size={20} />
      <Typography>{message}</Typography>
    </Box>
    <LinearProgress sx={{ mb: 2 }} />
    <Box
      sx={{
        bgcolor: 'background.default',
        borderRadius: 2,
        p: 2,
        maxHeight: 320,
        overflow: 'auto',
      }}
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
  </Paper>
);

export default ReportProgress;
