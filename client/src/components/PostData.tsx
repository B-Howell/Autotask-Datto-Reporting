import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import type { DeviceRow } from '@/pages/reports/deviceReports/sheetRows';

interface PostDataProps {
  columns: GridColDef<DeviceRow>[];
  rows: DeviceRow[];
}

const REQUIRED = ['Primary User or Role', 'Purchase Date', 'Department', 'Location'] as const;

/** End-user devices with any of the editable Autotask fields still blank. */
const PostData = ({ columns, rows }: PostDataProps) => {
  const fieldFor = (header: string) => columns.find((c) => c.headerName === header)?.field;
  const nameCol = fieldFor('Reference Name');
  const typeCol = fieldFor('Product');
  const requiredCols = REQUIRED.map(fieldFor);

  const cell = (row: DeviceRow, field: string | undefined) =>
    field ? String(row[field as keyof DeviceRow] ?? '') : '';

  const filteredRows = rows.filter((row) => {
    const type = cell(row, typeCol);
    return (type === 'Laptop' || type === 'Desktop') && requiredCols.some((c) => !cell(row, c));
  });

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Devices missing required fields
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Device Name</TableCell>
              {REQUIRED.map((h) => (
                <TableCell key={h} sx={{ fontWeight: 'bold' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{cell(row, nameCol)}</TableCell>
                {requiredCols.map((c, i) => (
                  <TableCell key={REQUIRED[i]}>{cell(row, c)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default PostData;
