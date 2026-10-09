import { Box, CircularProgress, Typography } from '@mui/material';
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import AppDataGrid from './AppDataGrid';
import type { DeviceRow } from '@/pages/reports/deviceReports/sheetRows';

const PAGE_SIZE = 100;

interface DeviceSpreadsheetProps {
  title: string;
  columns: GridColDef<DeviceRow>[];
  rows: DeviceRow[];
  hasData: boolean;
  loading: boolean;
  lastLogLine: string;
  isDark: boolean;
  page: number;
  setPage: (page: number) => void;
  processRowUpdate: (newRow: DeviceRow, oldRow: DeviceRow) => DeviceRow;
}

const DeviceSpreadsheet = ({
  title,
  columns,
  rows,
  hasData,
  loading,
  lastLogLine,
  isDark,
  page,
  setPage,
  processRowUpdate,
}: DeviceSpreadsheetProps) => {
  const paginationModel: GridPaginationModel = { page, pageSize: PAGE_SIZE };

  return (
    <>
      {hasData && (
        <Typography variant="h6" sx={{ mb: 2 }}>
          Devices for {title}
        </Typography>
      )}

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CircularProgress size={24} />
          <Typography sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {lastLogLine}
          </Typography>
        </Box>
      )}

      {hasData && (
        <Box
          sx={{
            height: 'calc(100vh - 250px)',
            width: '100%',
            mb: 2,
            border: '1px solid',
            borderColor: isDark ? '#444' : '#ccc',
            borderRadius: '4px',
            backgroundColor: isDark ? '#1e1e1e' : '#fff',
            color: isDark ? '#ddd' : '#111',
            '& .edited-cell': { backgroundColor: '#1976d2 !important', color: '#fff' },
          }}
        >
          <AppDataGrid<DeviceRow>
            rows={rows}
            columns={columns}
            pagination
            paginationModel={paginationModel}
            onPaginationModelChange={(model) => setPage(model.page)}
            pageSizeOptions={[PAGE_SIZE]}
            disableRowSelectionOnClick
            processRowUpdate={processRowUpdate}
            editMode="cell"
          />
        </Box>
      )}
    </>
  );
};

export default DeviceSpreadsheet;
