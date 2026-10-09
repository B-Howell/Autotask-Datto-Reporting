import type { ReactNode } from 'react';
import { Paper, Typography } from '@mui/material';

interface EmptyStateProps {
  children: ReactNode;
}

const EmptyState = ({ children }: EmptyStateProps) => (
  <Paper sx={{ p: 3, mb: 3 }}>
    <Typography color="text.secondary">{children}</Typography>
  </Paper>
);

export default EmptyState;
