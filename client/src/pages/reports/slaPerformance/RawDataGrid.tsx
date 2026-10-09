import { useMemo } from 'react';
import { Box, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import type { SlaTicket } from '@/api';
import AppDataGrid from '@/components/AppDataGrid';
import { COLUMNS } from './columns';
import type { SlaColumn } from './columns';

type SlaGridRow = SlaTicket & { id: string | number };

const renderMet = (params: GridRenderCellParams<SlaGridRow, boolean | null>) => {
  if (params.value === null || params.value === undefined) return '';
  return (
    <Chip
      label={params.value ? 'Yes' : 'No'}
      size="small"
      color={params.value ? 'success' : 'error'}
      variant="outlined"
      sx={{ fontWeight: 600, minWidth: 48 }}
    />
  );
};

const gridColumn = (col: SlaColumn): GridColDef<SlaGridRow> => {
  const centred = col.numeric || col.met;
  const base: GridColDef<SlaGridRow> = {
    field: col.key,
    headerName: col.label,
    width: col.width,
    sortable: true,
    filterable: true,
    headerAlign: centred ? 'center' : 'left',
    align: centred ? 'center' : 'left',
  };
  if (col.met) return { ...base, type: 'boolean', renderCell: renderMet };
  if (col.numeric) return { ...base, type: 'number' };
  return base;
};

const GRID_COLUMNS = COLUMNS.map(gridColumn);

interface RawDataGridProps {
  tickets: SlaTicket[];
}

const RawDataGrid = ({ tickets }: RawDataGridProps) => {
  const isDark = useTheme().palette.mode === 'dark';
  const rows = useMemo<SlaGridRow[]>(
    () => tickets.map((t, idx) => ({ id: t.ticketNumber || idx, ...t })),
    [tickets]
  );

  return (
    <Box
      sx={{
        height: 'calc(100vh - 380px)',
        minHeight: 400,
        width: '100%',
        border: '1px solid',
        borderColor: isDark ? '#444' : '#ccc',
        borderRadius: '4px',
        backgroundColor: isDark ? '#1e1e1e' : '#fff',
        color: isDark ? '#ddd' : '#111',
      }}
    >
      <AppDataGrid<SlaGridRow>
        rows={rows}
        columns={GRID_COLUMNS}
        density="compact"
        pageSizeOptions={[50, 100, 250]}
        initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
        disableRowSelectionOnClick
      />
    </Box>
  );
};

export default RawDataGrid;
