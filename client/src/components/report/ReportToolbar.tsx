import type { ReactNode } from 'react';
import { Box, Paper } from '@mui/material';

interface ReportToolbarProps {
  /** Filters and selectors, laid out left to right. */
  children?: ReactNode;
  /** Buttons, pushed to the right edge. */
  actions?: ReactNode;
}

const ReportToolbar = ({ children, actions }: ReportToolbarProps) => (
  <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
    {children}
    {actions && (
      <Box sx={{ ml: 'auto', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {actions}
      </Box>
    )}
  </Paper>
);

export default ReportToolbar;
