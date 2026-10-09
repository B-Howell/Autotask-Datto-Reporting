import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { SlaPivotRow } from '@/api';
import { fmtPct, grandTotalRowSx, pctColor } from './formatters';
import { GRAND_TOTAL } from './pivots';

interface PivotTableProps {
  pivot: SlaPivotRow[];
  rowLabel?: string;
}

const PivotTable = ({ pivot, rowLabel = 'Resource' }: PivotTableProps) => (
  <TableContainer component={Paper}>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 700 }}>{rowLabel}</TableCell>
          <TableCell align="center" sx={{ fontWeight: 700 }}>
            Average of First Response Met
          </TableCell>
          <TableCell align="center" sx={{ fontWeight: 700 }}>
            Average of Resolved Met
          </TableCell>
          <TableCell align="center" sx={{ fontWeight: 700 }}>
            Tickets
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {pivot.map((row, idx) => {
          const isGrand = row.resource === GRAND_TOTAL;
          return (
            <TableRow key={idx} sx={isGrand ? grandTotalRowSx : {}}>
              <TableCell sx={{ fontWeight: isGrand ? 800 : 400 }}>{row.resource}</TableCell>
              <TableCell align="center" sx={{ color: pctColor(row.avgFirstResponseMet) }}>
                {fmtPct(row.avgFirstResponseMet)}
              </TableCell>
              <TableCell align="center" sx={{ color: pctColor(row.avgResolvedMet) }}>
                {fmtPct(row.avgResolvedMet)}
              </TableCell>
              <TableCell align="center">{row.ticketCount}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </TableContainer>
);

export default PivotTable;
