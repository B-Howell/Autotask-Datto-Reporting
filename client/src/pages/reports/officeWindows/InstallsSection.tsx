import type { ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface InstallsSectionProps {
  icon: string;
  title: string;
  children: ReactNode;
}

/** A product table under its icon and heading. */
const InstallsSection = ({ icon, title, children }: InstallsSectionProps) => (
  <Paper sx={{ p: 2, mb: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Box component="img" src={icon} alt="" sx={{ height: '1.25em', width: 'auto' }} />
      <Typography variant="h6">{title}</Typography>
    </Box>
    {children}
  </Paper>
);

export default InstallsSection;
