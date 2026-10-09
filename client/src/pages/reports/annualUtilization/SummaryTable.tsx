import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { hrs, money } from './summary';
import type { CompanyTotals, Summary, SummaryRow } from './summary';

const NUM_STRONG = { fontWeight: 700, fontVariantNumeric: 'tabular-nums' } as const;
const HEAD = { fontWeight: 700, whiteSpace: 'nowrap' } as const;

const TOTAL_COLUMNS: { key: keyof CompanyTotals; label: string; format: typeof hrs }[] = [
  { key: 'annualHours', label: 'Hours per year', format: hrs },
  { key: 'annualCost', label: 'Cost per year', format: money },
  { key: 'hours', label: 'Hours per month', format: hrs },
  { key: 'cost', label: 'Cost per month', format: money },
];

interface SummaryTableProps {
  summary: Summary;
  rows: SummaryRow[];
  onSelectCompany: (company: string) => void;
}

/** One line per agency: annual hours by department, then the yearly and monthly totals. */
const SummaryTable = ({ summary, rows, onSelectCompany }: SummaryTableProps) => (
  <TableContainer>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 700 }}>Agency</TableCell>
          {summary.perDept.map((d) => (
            <TableCell key={d.department} align="right" sx={{ ...HEAD, px: 1 }}>
              {d.department}
            </TableCell>
          ))}
          {TOTAL_COLUMNS.map((col) => (
            <TableCell key={col.key} align="right" sx={HEAD}>
              {col.label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.company} hover>
            <TableCell
              sx={{
                color: 'primary.main',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                '&:hover': { textDecoration: 'underline' },
              }}
              onClick={() => onSelectCompany(row.company)}
            >
              {row.company}
            </TableCell>
            {summary.perDept.map((d) => {
              const { annualHours } = d.byCompany[row.company];
              return (
                <TableCell
                  key={d.department}
                  align="right"
                  sx={{
                    fontVariantNumeric: 'tabular-nums',
                    px: 1,
                    color: annualHours ? 'text.primary' : 'text.disabled',
                  }}
                >
                  {annualHours ? hrs(annualHours) : '—'}
                </TableCell>
              );
            })}
            {TOTAL_COLUMNS.map((col) => (
              <TableCell key={col.key} align="right" sx={NUM_STRONG}>
                {col.format(row[col.key])}
              </TableCell>
            ))}
          </TableRow>
        ))}
        <TableRow sx={{ '& td': { borderTop: 2, borderColor: 'divider' } }}>
          <TableCell sx={{ fontWeight: 700 }}>All agencies</TableCell>
          {summary.perDept.map((d) => (
            <TableCell key={d.department} align="right" sx={{ ...NUM_STRONG, px: 1 }}>
              {hrs(rows.reduce((t, r) => t + d.byCompany[r.company].annualHours, 0))}
            </TableCell>
          ))}
          {TOTAL_COLUMNS.map((col) => (
            <TableCell key={col.key} align="right" sx={NUM_STRONG}>
              {col.format(rows.reduce((t, r) => t + r[col.key], 0))}
            </TableCell>
          ))}
        </TableRow>
      </TableBody>
    </Table>
  </TableContainer>
);

export default SummaryTable;
