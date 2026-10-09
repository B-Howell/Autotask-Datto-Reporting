import type { SxProps, Theme } from '@mui/material/styles';

export const fmtPct = (v: number): string => `${(v * 100).toFixed(1)}%`;

export const pctColor = (v: number): string =>
  v >= 0.95 ? 'success.main' : v >= 0.8 ? 'warning.main' : 'error.main';

export const grandTotalRowSx: SxProps<Theme> = {
  backgroundColor: (t) =>
    t.palette.mode === 'dark' ? 'rgba(59,130,246,0.08)' : 'rgba(29,78,216,0.06)',
  '& td': { fontWeight: 800 },
};
