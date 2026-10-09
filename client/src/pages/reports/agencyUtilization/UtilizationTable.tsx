import { Fragment, useMemo, useState } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import type { UtilizationReport, UtilizationRow } from '@/api';
import { groupRowsByCategory, sumHours } from './grouping';
import { fmtHours } from './quarters';

const headerSx = { fontWeight: 700, whiteSpace: 'nowrap' };

interface HoursCellsProps {
  companies: string[];
  byCompany: Record<string, number>;
  total: number;
  weight?: number;
}

const HoursCells = ({ companies, byCompany, total, weight }: HoursCellsProps) => {
  const sx = weight ? { fontWeight: weight } : undefined;
  return (
    <>
      {companies.map((c) => (
        <TableCell key={c} align="right" sx={sx}>
          {fmtHours(byCompany[c])}
        </TableCell>
      ))}
      <TableCell align="right" sx={sx}>
        {fmtHours(total)}
      </TableCell>
    </>
  );
};

interface CategoryRowsProps {
  category: string;
  companies: string[];
  totals: Record<string, number>;
  workers: UtilizationRow[];
  collapsed: boolean;
  onToggle: () => void;
}

const CategoryRows = ({
  category,
  companies,
  totals,
  workers,
  collapsed,
  onToggle,
}: CategoryRowsProps) => (
  <Fragment>
    <TableRow
      sx={{
        backgroundColor: (t) =>
          t.palette.mode === 'dark' ? 'rgba(59,130,246,0.12)' : 'rgba(29,78,216,0.08)',
      }}
    >
      <TableCell sx={headerSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
          <IconButton size="small" onClick={onToggle}>
            {collapsed ? (
              <KeyboardArrowRightIcon fontSize="small" />
            ) : (
              <KeyboardArrowDownIcon fontSize="small" />
            )}
          </IconButton>
          {category}
        </Box>
      </TableCell>
      <TableCell />
      <HoursCells companies={companies} byCompany={totals} total={sumHours(totals)} weight={700} />
    </TableRow>
    {!collapsed &&
      workers.map((wr) => (
        <TableRow key={`${category}::${wr.worker}`} hover>
          <TableCell />
          <TableCell sx={{ pl: 4, whiteSpace: 'nowrap' }}>{wr.worker}</TableCell>
          <HoursCells
            companies={companies}
            byCompany={wr.byCompany}
            total={sumHours(wr.byCompany)}
          />
        </TableRow>
      ))}
  </Fragment>
);

interface UtilizationTableProps {
  report: UtilizationReport;
}

/** Hours by resource and company, grouped under collapsible departments with totals. */
const UtilizationTable = ({ report }: UtilizationTableProps) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const rowsByCategory = useMemo(() => groupRowsByCategory(report.rows), [report.rows]);
  const { companies } = report;

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 280px)' }}>
      <Table size="small" stickyHeader sx={{ tableLayout: 'auto' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...headerSx, minWidth: 200 }}>Department</TableCell>
            <TableCell sx={{ ...headerSx, minWidth: 180 }}>Resource</TableCell>
            {companies.map((c) => (
              <TableCell key={c} align="right" sx={headerSx}>
                {c}
              </TableCell>
            ))}
            <TableCell align="right" sx={headerSx}>
              Grand Total
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {report.categories.map((category) => (
            <CategoryRows
              key={category}
              category={category}
              companies={companies}
              totals={report.categoryTotals[category] || {}}
              workers={rowsByCategory[category] || []}
              collapsed={!!collapsed[category]}
              onToggle={() => setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }))}
            />
          ))}
          <TableRow
            sx={{
              backgroundColor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(59,130,246,0.20)' : 'rgba(29,78,216,0.14)',
            }}
          >
            <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Grand Total</TableCell>
            <TableCell />
            <HoursCells
              companies={companies}
              byCompany={report.companyTotals}
              total={report.grandTotal}
              weight={800}
            />
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default UtilizationTable;
