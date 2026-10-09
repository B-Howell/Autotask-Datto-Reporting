import { Paper, Typography } from '@mui/material';

interface ErrorBannerProps {
  error: string | null | undefined;
}

const ErrorBanner = ({ error }: ErrorBannerProps) => {
  if (!error) return null;
  return (
    <Paper sx={{ p: 2, mb: 3, borderColor: 'error.main' }}>
      <Typography color="error">Error: {error}</Typography>
    </Paper>
  );
};

export default ErrorBanner;
