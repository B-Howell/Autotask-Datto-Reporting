import { Box, Paper, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import useThemeStore from '@/store/themeStore';
import type { ThemeMode } from '@/store/themeStore';

const AppearanceSection = () => {
  const mode = useThemeStore((s) => s.mode);
  const toggleMode = useThemeStore((s) => s.toggleMode);

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Appearance
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body1">Theme</Typography>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_e, val: ThemeMode | null) => {
            if (val && val !== mode) toggleMode();
          }}
          size="small"
        >
          <ToggleButton value="light">
            <LightModeIcon sx={{ mr: 0.5 }} /> Light
          </ToggleButton>
          <ToggleButton value="dark">
            <DarkModeIcon sx={{ mr: 0.5 }} /> Dark
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Paper>
  );
};

export default AppearanceSection;
