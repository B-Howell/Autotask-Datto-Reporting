import {
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import { savedReportsApi } from '@/api';
import type { SavedReport } from '@/api';
import { formatDateTime } from '@/utils/dates';
import formatBytes from './formatBytes';
import { FORMAT_COLORS, REPORT_TYPE_LABELS } from './reportTypes';

const HEADERS: { label: string; align?: 'right' }[] = [
  { label: 'Title' },
  { label: 'Agency' },
  { label: 'Type' },
  { label: 'Format' },
  { label: 'Saved' },
  { label: 'Size', align: 'right' },
  { label: 'Actions', align: 'right' },
];

interface SavedReportsTableProps {
  reports: SavedReport[];
  onOpen: (report: SavedReport) => void;
  onDelete: (id: number) => void;
}

/** Clicking a row opens the viewer; the action buttons stop that click so they act alone. */
const SavedReportsTable = ({ reports, onOpen, onDelete }: SavedReportsTableProps) => (
  <Paper sx={{ p: 2 }}>
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {HEADERS.map((h) => (
              <TableCell key={h.label} align={h.align} sx={{ fontWeight: 'bold' }}>
                {h.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {reports.map((r) => (
            <TableRow key={r.id} hover onClick={() => onOpen(r)} sx={{ cursor: 'pointer' }}>
              <TableCell>{r.title || r.filename}</TableCell>
              <TableCell>{r.agency_name}</TableCell>
              <TableCell>{REPORT_TYPE_LABELS[r.report_type] || r.report_type}</TableCell>
              <TableCell>
                <Chip
                  label={(r.format || '').toUpperCase()}
                  size="small"
                  color={FORMAT_COLORS[r.format] || 'default'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(r.created_at)}</TableCell>
              <TableCell align="right">{formatBytes(r.size_bytes)}</TableCell>
              <TableCell
                align="right"
                sx={{ whiteSpace: 'nowrap' }}
                onClick={(e) => e.stopPropagation()}
              >
                <IconButton
                  size="small"
                  component="a"
                  href={savedReportsApi.savedReportDownloadUrl(r.id)}
                  title="Download"
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onDelete(r.id)}
                  title="Delete"
                  color="error"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

export default SavedReportsTable;
