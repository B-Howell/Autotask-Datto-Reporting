import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

export interface DataColumn<Row> {
  key: string;
  label: ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: number | string;
  render: (row: Row, index: number) => ReactNode;
}

interface DataTableProps<Row> {
  columns: DataColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string | number;
  /** Rendered after the body, typically a totals line. */
  footer?: ReactNode;
  stickyHeader?: boolean;
  maxHeight?: number | string;
  sx?: SxProps<Theme>;
  /** Makes every row clickable; the row whose key equals `selectedKey` renders selected. */
  onRowClick?: (row: Row) => void;
  selectedKey?: string | number | null;
}

/** Plain MUI table with bold headers, the shape every simple report list uses. */
function DataTable<Row>({
  columns,
  rows,
  rowKey,
  footer,
  stickyHeader = false,
  maxHeight,
  sx,
  onRowClick,
  selectedKey = null,
}: DataTableProps<Row>) {
  return (
    <TableContainer sx={{ maxHeight, ...sx }}>
      <Table size="small" stickyHeader={stickyHeader}>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                align={col.align ?? 'left'}
                sx={{ fontWeight: 700, whiteSpace: 'nowrap', width: col.width }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const key = rowKey(row, index);
            return (
              <TableRow
                key={key}
                hover
                selected={selectedKey !== null && key === selectedKey}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                sx={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} align={col.align ?? 'left'}>
                    {col.render(row, index)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
          {footer}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default DataTable;
