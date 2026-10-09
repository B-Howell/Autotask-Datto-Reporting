import type { Ref } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { ChartLegend, DonutChart } from '@/components/report';
import type { DonutSlice } from '@/components/report';

interface PatchSummaryCardProps {
  slices: DonutSlice[];
  total: number;
  /** Receives the donut wrapper so the SVG can be captured for the PDF. */
  chartRef?: Ref<HTMLDivElement>;
}

const PatchSummaryCard = ({ slices, total, chartRef }: PatchSummaryCardProps) => (
  <Paper sx={{ p: 3, mb: 3 }}>
    <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
      Patch Summary
    </Typography>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        justifyContent: 'center',
        mt: 2,
      }}
    >
      <DonutChart ref={chartRef} slices={slices} centre={total} />
      <ChartLegend slices={slices} />
    </Box>
  </Paper>
);

export default PatchSummaryCard;
