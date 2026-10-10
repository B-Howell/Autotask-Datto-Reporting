// One entry point that turns a report request into file bytes by running the
// same export builders the browser uses. Each report type has a handler that
// reads its own data and options shapes from the request; the builders
// themselves are untouched, so a scheduled file and a downloaded one come from
// identical code.
import type { jsPDF } from 'jspdf';
import type {
  Agency,
  HddTicketsReport,
  ManualInputs,
  OfficeWindowsBreakdown,
  PatchReport,
  RatedDepartment,
  SlaReport,
  UtilizationEntry,
  UtilizationReport,
} from '@/api';
import { buildQuarterlyWorkbook } from '@/pages/reports/agencyUtilization/excelExport';
import { buildAnnualWorkbook } from '@/pages/reports/annualUtilization/excelExport';
import type { Rates } from '@/pages/reports/annualUtilization/departments';
import { annualWorkbookInput } from '@/pages/reports/annualUtilization/workbookInput';
import { buildDeviceWorkbook } from '@/pages/reports/deviceReports/excelExport';
import { mergeSheets, selectColumns } from '@/pages/reports/deviceReports/sheetRows';
import type { MemberSheet } from '@/pages/reports/deviceReports/sheetRows';
import { buildHddTicketsWorkbook } from '@/pages/reports/hddTickets/excelExport';
import { officeWindowsExportInput } from '@/pages/reports/officeWindows/exportInput';
import { buildOfficeWindowsPdf } from '@/pages/reports/officeWindows/pdfExport';
import { buildOfficeWindowsDocx } from '@/pages/reports/officeWindows/wordExport';
import { buildPatchPdf } from '@/pages/reports/patchManagement/pdfExport';
import { buildSlaWorkbook } from '@/pages/reports/slaPerformance/excelExport';
import { slaWorkbookInput } from '@/pages/reports/slaPerformance/workbookInput';
import { XLSX_MIME } from '@/utils/excel';
import { loadRendererAssets } from './assets';

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const PDF_MIME = 'application/pdf';

export interface RenderRequest {
  reportType: string;
  /** The report payload; its shape depends on `reportType`. */
  data: unknown;
  /** Per-report settings such as the device columns or the PDF/Word choice. */
  options: Record<string, unknown>;
  /** The file name the caller will store the bytes under; echoed, not derived. */
  filename: string;
  /** The agency logo as a base64 PNG, when the tenant has one. */
  logoBase64?: string | null;
}

export interface RenderResult {
  bytes: Buffer;
  contentType: string;
}

type Handler = (req: RenderRequest) => Promise<RenderResult>;

// The one place a request's untyped `data` and `options` take on their
// per-report shapes. The server sends JSON it produced itself, so this is a
// contract, not a validation: the HTTP layer checks only that `data` is an
// object, and a payload of the wrong shape fails inside the builder and is
// reported as a 500.
const handler =
  <D, O>(build: (data: D, options: O, req: RenderRequest) => Promise<RenderResult>): Handler =>
  (req) =>
    build(req.data as D, req.options as O, req);

const fromBlob = async (blob: Blob, contentType: string): Promise<RenderResult> => ({
  bytes: Buffer.from(await blob.arrayBuffer()),
  contentType,
});

const fromPdf = (doc: jsPDF): RenderResult => ({
  bytes: Buffer.from(doc.output('arraybuffer')),
  contentType: PDF_MIME,
});

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string');

interface DevicesData {
  sheets: MemberSheet[];
}
interface DevicesOptions {
  /** Header names to export, in order; absent means every column of the sheet. */
  columns?: string[];
}

interface AnnualData {
  utilData: UtilizationReport;
  entries: UtilizationEntry[];
}
interface AnnualOptions {
  /** The tenant's rated departments, which the browser reads from its settings store. */
  departments?: RatedDepartment[];
  companies?: string[] | null;
  rates?: Rates;
}

interface OfficeWindowsData {
  breakdown: OfficeWindowsBreakdown;
  manualInputs: ManualInputs;
  agencyName: string;
}
interface OfficeWindowsOptions {
  showLicenses?: boolean;
  format?: 'docx' | 'pdf';
}

interface PatchData {
  report: PatchReport;
  agency: Agency;
}

const handlers: Record<string, Handler> = {
  devices: handler<DevicesData, DevicesOptions>(async ({ sheets }, { columns }) => {
    const { header, rows } = mergeSheets(sheets);
    const wanted = isStringArray(columns)
      ? columns
      : header.filter((name): name is string => typeof name === 'string');
    return fromBlob(await buildDeviceWorkbook(selectColumns(header, wanted), rows), XLSX_MIME);
  }),

  sla: handler<Pick<SlaReport, 'tickets'>, object>(async (report) =>
    fromBlob(await buildSlaWorkbook(slaWorkbookInput(report)), XLSX_MIME)
  ),

  quarterly_utilization: handler<UtilizationReport, object>(async (report) =>
    fromBlob(await buildQuarterlyWorkbook(report), XLSX_MIME)
  ),

  annual_utilization: handler<AnnualData, AnnualOptions>(
    async ({ utilData, entries }, { departments = [], companies, rates }) =>
      fromBlob(
        await buildAnnualWorkbook(
          annualWorkbookInput(utilData, entries, departments, { companies, rates })
        ),
        XLSX_MIME
      )
  ),

  hdd_tickets: handler<Pick<HddTicketsReport, 'devices'>, object>(async ({ devices }) =>
    fromBlob(await buildHddTicketsWorkbook(devices), XLSX_MIME)
  ),

  office_windows: handler<OfficeWindowsData, OfficeWindowsOptions>(
    async ({ breakdown, manualInputs, agencyName }, { showLicenses = false, format }, req) => {
      const input = officeWindowsExportInput(breakdown, manualInputs, agencyName, showLicenses);
      const assets = await loadRendererAssets(req.logoBase64);
      if (format === 'pdf') return fromPdf((await buildOfficeWindowsPdf({ ...input, assets })).doc);
      return fromBlob(await buildOfficeWindowsDocx({ ...input, assets }), DOCX_MIME);
    }
  ),

  patch: handler<PatchData, object>(async ({ report, agency }, _options, req) => {
    const assets = await loadRendererAssets(req.logoBase64);
    const built = await buildPatchPdf({
      agency,
      summary: report.summary,
      devices: report.devices,
      // The donut's centre figure, summed the way the page sums it.
      total: report.summary.reduce((n, s) => n + s.count, 0),
      // There is no on-screen chart to capture here; the legend stands alone.
      chart: null,
      assets,
    });
    return fromPdf(built.doc);
  }),
};

export const REPORT_TYPES = Object.keys(handlers);

/** The request named a report type no handler builds; the caller's mistake, not the renderer's. */
export class UnknownReportTypeError extends Error {
  constructor(reportType: string) {
    super(`Unknown report type: ${reportType}`);
    this.name = 'UnknownReportTypeError';
  }
}

/** The file for a request, or a rejection naming the unknown report type. */
export async function render(req: RenderRequest): Promise<RenderResult> {
  const run = Object.hasOwn(handlers, req.reportType) ? handlers[req.reportType] : undefined;
  if (!run) throw new UnknownReportTypeError(req.reportType);
  return run(req);
}
