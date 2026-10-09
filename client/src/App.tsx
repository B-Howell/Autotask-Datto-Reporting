import { useEffect, useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import NavBar from '@/components/NavBar';
import RunningReportBar from '@/components/RunningReportBar';
import Toaster from '@/components/Toaster';
import Home from '@/pages/Home';
import Settings from '@/pages/Settings';
import AgencyUtilization from '@/pages/reports/AgencyUtilization';
import AnnualUtilization from '@/pages/reports/AnnualUtilization';
import DeviceReports from '@/pages/reports/DeviceReports';
import HddTickets from '@/pages/reports/HddTickets';
import OfficeWindowsReports from '@/pages/reports/OfficeWindowsReports';
import PatchManagement from '@/pages/reports/PatchManagement';
import Reports from '@/pages/reports/Reports';
import SavedReports from '@/pages/reports/SavedReports';
import SlaPerformance from '@/pages/reports/SlaPerformance';
import Tickets from '@/pages/reports/Tickets';
import { tenantApi } from '@/api';
import useAgencyStore from '@/store/agencyStore';
import useTenantStore from '@/store/tenantStore';
import useThemeStore from '@/store/themeStore';
import { buildTheme } from '@/theme';

function App() {
  const mode = useThemeStore((state) => state.mode);
  const fetchAgencies = useAgencyStore((state) => state.fetchAgencies);
  const theme = useMemo(() => buildTheme(mode), [mode]);

  useEffect(() => {
    void fetchAgencies();
  }, [fetchAgencies]);

  // Presentation settings (groups, logos, rates, picker years) come from the
  // server once; until they arrive, and if the fetch fails, the store's
  // defaults apply, which match the server's own.
  useEffect(() => {
    tenantApi
      .fetchTenant()
      .then(useTenantStore.getState().setTenant)
      .catch((err) => console.error('Failed to load tenant settings:', err));
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster />
      <BrowserRouter>
        {/* The app shell never scrolls; only the routed page does. The global
            `scrollbar-gutter: stable` would otherwise reserve an empty strip on
            each of these containers, so it is reset to auto on both. */}
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', scrollbarGutter: 'auto' }}>
          <NavBar />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              scrollbarGutter: 'auto',
            }}
          >
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
              <Routes>
                <Route path="/reports" element={<Reports />}>
                  <Route path="device" element={<DeviceReports />} />
                  <Route path="office-windows" element={<OfficeWindowsReports />} />
                  <Route path="tickets" element={<Tickets />} />
                  <Route path="sla-performance" element={<SlaPerformance />} />
                  <Route path="agency-utilization" element={<AgencyUtilization />} />
                  <Route path="annual-utilization" element={<AnnualUtilization />} />
                  <Route path="patch-management" element={<PatchManagement />} />
                  <Route path="hdd-tickets" element={<HddTickets />} />
                  <Route path="saved-reports" element={<SavedReports />} />
                </Route>
                <Route path="/settings" element={<Settings />} />
                <Route path="/" element={<Home />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Box>
            {/* Outside the routed area, so a report in flight keeps reporting
                whatever page the user moves to. */}
            <RunningReportBar />
          </Box>
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
