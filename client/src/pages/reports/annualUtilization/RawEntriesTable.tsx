import { Box, TablePagination, Typography } from '@mui/material';
import type { UtilizationEntry } from '@/api';
import { DataTable } from '@/components/report';
import type { DataColumn } from '@/components/report';
import { ENTRY_ROWS_PER_PAGE, RAW_COLUMNS, totalHours } from './rawEntries';
import type { RawColumn } from './rawEntries';
import { hrs } from './summary';

const renderCell = (col: RawColumn, entry: UtilizationEntry) => {
  const value = entry[col.key];
  if (col.wide) {
    return (
      <Box
        sx={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={String(value)}
      >
        {value}
      </Box>
    );
  }
  if (col.align === 'right') {
    return (
      <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Box>
    );
  }
  return value;
};

const COLUMNS: DataColumn<UtilizationEntry>[] = RAW_COLUMNS.map((col) => ({
  key: col.key,
  label: col.label,
  align: col.align,
  render: (entry) => renderCell(col, entry),
}));

interface RawEntriesTableProps {
  entries: UtilizationEntry[];
  page: number;
  onPageChange: (page: number) => void;
}

/** Only the visible page is rendered: the full set runs to tens of thousands of rows. */
const RawEntriesTable = ({ entries, page, onPageChange }: RawEntriesTableProps) => {
  const first = page * ENTRY_ROWS_PER_PAGE;
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {entries.length.toLocaleString()} entries · {hrs(totalHours(entries))} hours
      </Typography>
      <DataTable<UtilizationEntry>
        columns={COLUMNS}
        rows={entries.slice(first, first + ENTRY_ROWS_PER_PAGE)}
        rowKey={(e, i) => `${e.date}-${e.ticket}-${e.resource}-${i}`}
        stickyHeader
        maxHeight="60vh"
      />
      <TablePagination
        component="div"
        count={entries.length}
        page={page}
        onPageChange={(_e, v) => onPageChange(v)}
        rowsPerPage={ENTRY_ROWS_PER_PAGE}
        rowsPerPageOptions={[ENTRY_ROWS_PER_PAGE]}
      />
    </>
  );
};

export default RawEntriesTable;
