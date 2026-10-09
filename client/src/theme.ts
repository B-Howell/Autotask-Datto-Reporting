import { createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { ThemeMode } from '@/store/themeStore';

const palette = (mode: ThemeMode) =>
  mode === 'dark'
    ? {
        background: { default: '#0a0e17', paper: '#111827' },
        primary: { main: '#51c3ff', contrastText: '#fff' },
        secondary: { main: '#6366f1' },
        divider: 'rgba(255,255,255,0.08)',
      }
    : {
        background: { default: '#f0f2f5', paper: '#ffffff' },
        primary: { main: '#51c3ff', contrastText: '#fff' },
        secondary: { main: '#4f46e5' },
        divider: 'rgba(0,0,0,0.08)',
      };

// Thin scrollbars applied globally so every overflowing surface (page, grids,
// dropdowns, log boxes) matches without per-component styling. The stable
// gutter keeps the thumb from painting over the last grid column.
const scrollbarStyles = (theme: Theme) => {
  const dark = theme.palette.mode === 'dark';
  const thumb = dark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.22)';
  const thumbHover = dark ? 'rgba(255,255,255,0.32)' : 'rgba(15,23,42,0.38)';
  const thumbActive = dark ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.52)';
  const ring = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)';
  const scrollbarColor = `${dark ? 'rgba(255,255,255,0.28)' : 'rgba(15,23,42,0.32)'} transparent`;
  return {
    '*': { scrollbarWidth: 'thin', scrollbarColor, scrollbarGutter: 'stable' },
    '*::-webkit-scrollbar': { width: 10, height: 10, backgroundColor: 'transparent' },
    '*::-webkit-scrollbar-track': { backgroundColor: 'transparent', border: 'none' },
    '*::-webkit-scrollbar-thumb': {
      backgroundColor: thumb,
      borderRadius: 10,
      border: `2px solid ${ring}`,
      backgroundClip: 'padding-box',
      minHeight: 32,
      minWidth: 32,
      transition: 'background-color 120ms ease',
    },
    '*::-webkit-scrollbar-thumb:hover': { backgroundColor: thumbHover },
    '*::-webkit-scrollbar-thumb:active': { backgroundColor: thumbActive },
    '*::-webkit-scrollbar-corner': { backgroundColor: 'transparent' },
    '*::-webkit-scrollbar-button': { display: 'none', width: 0, height: 0 },
  };
};

export function buildTheme(mode: ThemeMode): Theme {
  return createTheme({
    palette: { mode, ...palette(mode) },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    components: {
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: 'none',
            border: `1px solid ${theme.palette.divider}`,
          }),
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: 'none',
            border: `1px solid ${theme.palette.divider}`,
          }),
        },
      },
      MuiButton: {
        styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } },
      },
      MuiCssBaseline: { styleOverrides: scrollbarStyles },
    },
  });
}
