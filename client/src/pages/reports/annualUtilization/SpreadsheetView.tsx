import { Box } from '@mui/material';
import AppDataGrid from '@/components/AppDataGrid';
import type { GridRow, TabGrid } from './gridModels';

interface SpreadsheetViewProps {
  grid: TabGrid;
}

const SpreadsheetView = ({ grid }: SpreadsheetViewProps) => (
  <Box sx={{ height: 'calc(100vh - 320px)', width: '100%' }}>
    <AppDataGrid<GridRow>
      rows={grid.rows}
      columns={grid.columns}
      disableRowSelectionOnClick
      density="compact"
      initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
      pageSizeOptions={[100]}
    />
  </Box>
);

export default SpreadsheetView;
