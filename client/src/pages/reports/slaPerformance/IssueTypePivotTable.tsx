import { Fragment, useState } from 'react';
import {
  Collapse,
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
import { fmtPct, grandTotalRowSx, pctColor } from './formatters';
import { GRAND_TOTAL } from './pivots';
import type { IssueTypePivotRow, SubIssuePivotRow } from './pivots';

interface MetCellsProps {
  row: Pick<SubIssuePivotRow, 'avgFirstResponseMet' | 'avgResolvedMet' | 'ticketCount'>;
  borderless?: boolean;
}

const MetCells = ({ row, borderless = false }: MetCellsProps) => {
  const border = borderless ? { border: 0 } : {};
  return (
    <>
      <TableCell align="center" sx={{ color: pctColor(row.avgFirstResponseMet), ...border }}>
        {fmtPct(row.avgFirstResponseMet)}
      </TableCell>
      <TableCell align="center" sx={{ color: pctColor(row.avgResolvedMet), ...border }}>
        {fmtPct(row.avgResolvedMet)}
      </TableCell>
      <TableCell align="center" sx={border}>
        {row.ticketCount}
      </TableCell>
    </>
  );
};

interface SubIssueRowsProps {
  rows: SubIssuePivotRow[];
  open: boolean;
}

const SubIssueRows = ({ rows, open }: SubIssueRowsProps) => (
  <TableRow>
    <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Table size="small">
          <TableBody>
            {rows.map((child) => (
              <TableRow key={child.subIssueType} hover>
                <TableCell sx={{ width: 40, border: 0 }} />
                <TableCell sx={{ pl: 6, border: 0 }}>{child.subIssueType}</TableCell>
                <MetCells row={child} borderless />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Collapse>
    </TableCell>
  </TableRow>
);

interface IssueTypePivotTableProps {
  pivot: IssueTypePivotRow[];
}

/** Issue types with their sub-issues folded underneath each one. */
const IssueTypePivotTable = ({ pivot }: IssueTypePivotTableProps) => {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const grandRow = pivot.find((g) => g.issueType === GRAND_TOTAL);
  const groups = pivot.filter((g) => g.issueType !== GRAND_TOTAL);

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, width: 40 }} />
            <TableCell sx={{ fontWeight: 700 }}>Issue Type / Sub-Issue Type</TableCell>
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
          {groups.map((group) => {
            const isOpen = !!open[group.issueType];
            const children = group.children ?? [];
            return (
              <Fragment key={group.issueType}>
                <TableRow hover sx={{ '& td': { fontWeight: 600 } }}>
                  <TableCell sx={{ p: 0, pl: 0.5 }}>
                    {children.length > 0 && (
                      <IconButton
                        size="small"
                        onClick={() => setOpen((s) => ({ ...s, [group.issueType]: !isOpen }))}
                        aria-label={isOpen ? 'Collapse' : 'Expand'}
                      >
                        {isOpen ? (
                          <KeyboardArrowDownIcon fontSize="small" />
                        ) : (
                          <KeyboardArrowRightIcon fontSize="small" />
                        )}
                      </IconButton>
                    )}
                  </TableCell>
                  <TableCell>{group.issueType}</TableCell>
                  <MetCells row={group} />
                </TableRow>
                {children.length > 0 && <SubIssueRows rows={children} open={isOpen} />}
              </Fragment>
            );
          })}
          {grandRow && (
            <TableRow sx={grandTotalRowSx}>
              <TableCell />
              <TableCell>{GRAND_TOTAL}</TableCell>
              <MetCells row={grandRow} />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default IssueTypePivotTable;
