import { forwardRef } from 'react';
import { Box, Typography } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  /** Figure shown in the hole, usually the total. */
  centre: ReactNode;
  size?: number;
}

type ReactNode = React.ReactNode;

/** Donut with a figure in the middle. The ref exposes the wrapper so the SVG can be captured. */
const DonutChart = forwardRef<HTMLDivElement, DonutChartProps>(function DonutChart(
  { slices, centre, size = 260 },
  ref
) {
  return (
    <Box ref={ref} sx={{ position: 'relative', width: size, height: size }}>
      <PieChart
        series={[
          {
            data: slices.filter((s) => s.value > 0),
            innerRadius: size * 0.27,
            outerRadius: size * 0.46,
            paddingAngle: 1,
            cornerRadius: 2,
          },
        ]}
        width={size}
        height={size}
        margin={{ top: 5, bottom: 5, left: 5, right: 5 }}
        hideLegend
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          {centre}
        </Typography>
      </Box>
    </Box>
  );
});

interface ChartLegendProps {
  slices: DonutSlice[];
}

export const ChartLegend = ({ slices }: ChartLegendProps) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    {slices.map((s) => (
      <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: s.color, flexShrink: 0 }} />
        <Typography variant="body1">
          {s.label}:{' '}
          <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {s.value}
          </Box>
        </Typography>
      </Box>
    ))}
  </Box>
);

export default DonutChart;
