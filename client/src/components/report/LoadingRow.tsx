import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingRowProps {
  message?: string;
}

/** A small spinner beside a short message, shown in place of a list that is still loading. */
const LoadingRow = ({ message = 'Loading…' }: LoadingRowProps) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
    <CircularProgress size={20} />
    <Typography>{message}</Typography>
  </Box>
);

export default LoadingRow;
