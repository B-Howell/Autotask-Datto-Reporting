import { Fragment } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { MONTHS_IN_YEAR } from './fiscalYear';
import { detailTotal, hrs } from './summary';
import type { DepartmentDetail } from './summary';

const NUM_STRONG = { fontWeight: 700, fontVariantNumeric: 'tabular-nums' } as const;

interface AgencyDetailTableProps {
  company: string;
  periodLabel: string;
  detail: DepartmentDetail[];
}

/** Each billed department with the people in it, their hours for the year and the monthly average. */
const AgencyDetailTable = ({ company, periodLabel, detail }: AgencyDetailTableProps) => {
  const total = detailTotal(detail);
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {company} &mdash; {periodLabel}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: '60%' }}>Resource</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                1 Year
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Avg Monthly
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {detail.map((d) => (
              <Fragment key={d.department}>
                <TableRow sx={{ '& td': { borderBottom: 'none' } }}>
                  <TableCell sx={{ fontWeight: 600 }}>{d.department}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {hrs(d.total)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {hrs(d.total / MONTHS_IN_YEAR)}
                  </TableCell>
                </TableRow>
                {d.workers.map((w) => (
                  <TableRow key={w.worker} hover>
                    <TableCell sx={{ pl: 4, color: 'text.secondary' }}>{w.worker}</TableCell>
                    <TableCell align="right">{hrs(w.hours)}</TableCell>
                    <TableCell align="right">{hrs(w.hours / MONTHS_IN_YEAR)}</TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
            <TableRow sx={{ '& td': { borderTop: 2, borderColor: 'divider' } }}>
              <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
              <TableCell align="right" sx={NUM_STRONG}>
                {hrs(total)}
              </TableCell>
              <TableCell align="right" sx={NUM_STRONG}>
                {hrs(total / MONTHS_IN_YEAR)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default AgencyDetailTable;
