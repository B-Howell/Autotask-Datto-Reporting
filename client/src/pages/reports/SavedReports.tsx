import { useState } from 'react';
import { Box, Button, CircularProgress, MenuItem, TextField, Typography } from '@mui/material';
import type { SavedReport } from '@/api';
import { EmptyState, ReportPage, ReportToolbar } from '@/components/report';
import SavedReportViewer from '@/components/SavedReportViewer';
import { REPORT_TYPE_LABELS } from './savedReports/reportTypes';
import SavedReportsTable from './savedReports/SavedReportsTable';
import useSavedReports from './savedReports/useSavedReports';

const SavedReports = () => {
  const { reports, loading, reload, remove } = useSavedReports();
  const [typeFilter, setTypeFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [viewing, setViewing] = useState<SavedReport | null>(null);

  const agencies = [...new Set(reports.map((r) => r.agency_name).filter(Boolean))].sort();
  const filtered = reports.filter(
    (r) =>
      (!typeFilter || r.report_type === typeFilter) &&
      (!agencyFilter || r.agency_name === agencyFilter)
  );

  return (
    <ReportPage title="Saved Reports">
      <ReportToolbar
        actions={
          <Button variant="outlined" size="small" onClick={() => void reload()}>
            Refresh
          </Button>
        }
      >
        <TextField
          select
          label="Agency"
          value={agencyFilter}
          onChange={(e) => setAgencyFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All agencies</MenuItem>
          {agencies.map((a) => (
            <MenuItem key={a} value={a}>
              {a}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Report type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All types</MenuItem>
          {Object.entries(REPORT_TYPE_LABELS).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </ReportToolbar>

      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
          <CircularProgress size={20} />
          <Typography>Loading…</Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <EmptyState>
          No saved reports yet. Generate a report and click <b>Save to app</b> to store it here.
        </EmptyState>
      ) : (
        <SavedReportsTable reports={filtered} onOpen={setViewing} onDelete={remove} />
      )}
      <SavedReportViewer report={viewing} onClose={() => setViewing(null)} />
    </ReportPage>
  );
};

export default SavedReports;
