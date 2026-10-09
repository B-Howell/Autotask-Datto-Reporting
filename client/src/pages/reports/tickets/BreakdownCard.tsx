import type { ReactNode } from 'react';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { TICKET_CARD_SX } from './cardStyles';

const VALUE_CELL_SX = {
  fontFamily: 'monospace',
  fontSize: '1.1rem',
  fontWeight: 'bold',
  bgcolor: 'action.hover',
};

export interface BreakdownRow {
  key: string;
  value: ReactNode;
}

interface BreakdownCardProps {
  title: string;
  columnLabel: string;
  valueLabel?: string;
  rows: BreakdownRow[];
}

/** Two-column card: a category label beside a highlighted monospace figure. */
const BreakdownCard = ({ title, columnLabel, valueLabel = 'Count', rows }: BreakdownCardProps) => (
  <Card sx={TICKET_CARD_SX}>
    <CardContent>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: '70%' }}>{columnLabel}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: '30%' }}>
                {valueLabel}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(({ key, value }) => (
              <TableRow key={key}>
                <TableCell sx={{ py: 1 }}>{key}</TableCell>
                <TableCell align="right" sx={VALUE_CELL_SX}>
                  {value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent>
  </Card>
);

export default BreakdownCard;
