import { Box, Typography } from '@mui/material';
import AgenciesSection from './settings/AgenciesSection';
import AppearanceSection from './settings/AppearanceSection';
import CredentialsSection from './settings/CredentialsSection';
import DataSyncSection from './settings/DataSyncSection';

// Credentials come first: on a fresh install nothing else works until they are entered.
const Settings = () => (
  <Box>
    <Typography variant="h5" sx={{ mb: 3 }}>
      Settings
    </Typography>
    <CredentialsSection />
    <AppearanceSection />
    <DataSyncSection />
    <AgenciesSection />
  </Box>
);

export default Settings;
