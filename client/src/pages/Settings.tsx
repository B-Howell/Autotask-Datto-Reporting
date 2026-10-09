import { Box, Typography } from '@mui/material';
import AgenciesSection from './settings/AgenciesSection';
import AppearanceSection from './settings/AppearanceSection';
import DataSyncSection from './settings/DataSyncSection';

const Settings = () => (
  <Box>
    <Typography variant="h5" sx={{ mb: 3 }}>
      Settings
    </Typography>
    <AppearanceSection />
    <DataSyncSection />
    <AgenciesSection />
  </Box>
);

export default Settings;
