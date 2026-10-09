import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

interface ReportPageProps {
  title: string;
  children: ReactNode;
}

/** Page frame shared by every report: centred title above the content. */
const ReportPage = ({ title, children }: ReportPageProps) => (
  <Box>
    <Typography variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
      {title}
    </Typography>
    {children}
  </Box>
);

export default ReportPage;
