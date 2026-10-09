import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import type { CellValue } from 'exceljs';
import { savedReportsApi } from '@/api';
import type { SavedReport } from '@/api';
import { errorMessage } from '@/utils/reportJob';
import { loadExcel } from '@/utils/excel';

const ROWS_PER_PAGE = 100;

interface ParsedSheet {
  name: string;
  header: (string | number)[];
  rows: (string | number)[][];
  width: number;
}

// exceljs hands back strings, numbers, Dates, or objects for formulas, rich
// text and hyperlinks; all of them have to come out printable.
const cellText = (v: CellValue): string | number => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if ('richText' in v && Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
    if ('result' in v && v.result !== undefined) return cellText(v.result as CellValue);
    if ('text' in v && v.text !== undefined) return cellText(v.text as CellValue);
    if ('hyperlink' in v && typeof v.hyperlink === 'string') return v.hyperlink;
    return '';
  }
  if (typeof v === 'number') return Math.round(v * 100) / 100;
  return String(v);
};

interface SavedReportViewerProps {
  report: SavedReport | null;
  onClose: () => void;
}

/**
 * Shows a saved report in the app. Workbooks render as a paged grid, PDFs go to
 * the browser's own viewer, and anything else (docx) offers the download.
 */
const SavedReportViewer = ({ report, onClose }: SavedReportViewerProps) => {
  const [sheets, setSheets] = useState<ParsedSheet[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [page, setPage] = useState(0);

  const format = (report?.format ?? '').toLowerCase();
  const downloadUrl = report ? savedReportsApi.savedReportDownloadUrl(report.id) : undefined;

  useEffect(() => {
    setSheets(null);
    setError(null);
    setSheetIndex(0);
    setPage(0);
    if (!report || format !== 'xlsx') return undefined;

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const buffer = await savedReportsApi.fetchSavedReportBytes(report.id);
        const ExcelJS = await loadExcel();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);

        const parsed = wb.worksheets.map((ws): ParsedSheet => {
          const rows: (string | number)[][] = [];
          ws.eachRow({ includeEmpty: false }, (row) => {
            // row.values is 1-based, with a leading hole.
            const values = Array.isArray(row.values) ? row.values.slice(1) : [];
            rows.push(values.map(cellText));
          });
          return {
            name: ws.name,
            header: rows[0] ?? [],
            rows: rows.slice(1),
            width: rows.reduce((w, r) => Math.max(w, r.length), 0),
          };
        });
        if (!cancelled) setSheets(parsed);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [report, format]);

  const sheet = sheets?.[sheetIndex] ?? null;
  const visibleRows = useMemo(
    () => (sheet ? sheet.rows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE) : []),
    [sheet, page]
  );

  const body = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      );
    }
    if (error) return <Alert severity="error">{error}</Alert>;

    if (format === 'pdf') {
      return (
        <Box
          component="object"
          data={downloadUrl}
          type="application/pdf"
          sx={{ width: '100%', height: '70vh', border: 0 }}
        />
      );
    }

    if (format !== 'xlsx') {
      return (
        <Alert
          severity="info"
          action={
            <Button component="a" href={downloadUrl} size="small">
              Download
            </Button>
          }
        >
          {(format || 'This format').toUpperCase()} files cannot be shown in the app. Download it to
          open in Word.
        </Alert>
      );
    }

    if (!sheet || !sheets) return null;

    return (
      <>
        {sheets.length > 1 && (
          <Tabs
            value={sheetIndex}
            onChange={(_e, v: number) => {
              setSheetIndex(v);
              setPage(0);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}
          >
            {sheets.map((s, i) => (
              <Tab key={s.name} value={i} label={s.name} />
            ))}
          </Tabs>
        )}
        <TableContainer sx={{ maxHeight: '60vh' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {sheet.header.map((h, i) => (
                  <TableCell key={i} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((row, i) => (
                <TableRow key={page * ROWS_PER_PAGE + i} hover>
                  {Array.from({ length: sheet.width }, (_, c) => (
                    <TableCell key={c} sx={{ whiteSpace: 'nowrap' }}>
                      {row[c]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={sheet.rows.length}
          page={page}
          onPageChange={(_e, p) => setPage(p)}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[ROWS_PER_PAGE]}
        />
      </>
    );
  };

  return (
    <Dialog open={Boolean(report)} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" component="div" noWrap>
          {report?.title || report?.filename}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {report?.agency_name}
          {report?.agency_name ? ' · ' : ''}
          {(report?.format ?? '').toUpperCase()}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>{body()}</DialogContent>
      <DialogActions>
        <Button component="a" href={downloadUrl}>
          Download
        </Button>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SavedReportViewer;
