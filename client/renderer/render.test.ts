// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import type {
  HddTicketDevice,
  OfficeWindowsBreakdown,
  PatchReport,
  SlaTicket,
  UtilizationEntry,
  UtilizationReport,
} from '@/api';
import { loadExcel } from '@/utils/excel';
import { render } from './render';
import type { RenderResult } from './render';

const PK = [0x50, 0x4b];
const PDF = Array.from('%PDF', (c) => c.charCodeAt(0));
const XLSX = 'spreadsheetml';
const DOCX = 'wordprocessingml';

const magic = (result: RenderResult, length: number) =>
  Array.from(result.bytes.subarray(0, length));

// exceljs types its input as an ArrayBuffer-shaped Buffer of its own; at
// runtime it reads a Node Buffer directly, so only the type needs the cast.
const readWorkbook = async (result: RenderResult) => {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(result.bytes as unknown as ArrayBuffer);
  return wb;
};

const deviceSheet = {
  sheet: [
    ['Product', 'Reference Name', 'Department'],
    ['Laptop', 'HPH-LT-0001', 'IT'],
  ],
  ids: [50001],
};

const ticket = (overrides: Partial<SlaTicket>): SlaTicket => ({
  ticketNumber: 'T20260901.0001',
  title: 'Printer offline',
  companyName: 'Harbor Point Health',
  createDate: '09/01/2026',
  slaStartDate: '09/01/2026',
  completeDate: '09/02/2026',
  resource: 'Dana',
  queue: 'Help Desk',
  status: 'Complete',
  priority: 'P3 Moderate',
  ticketType: 'Incident',
  ticketCategory: 'Standard',
  issueType: 'Hardware',
  subIssueType: 'Printer',
  firstResponseHours: 1,
  firstResponseMet: true,
  resolutionPlanHours: 2,
  resolutionPlanMet: true,
  resolvedHours: 8,
  resolvedMet: false,
  waitingCustomerHours: 0,
  ...overrides,
});

const utilData: UtilizationReport = {
  categories: ['Help Desk'],
  companies: ['Harbor Point Health'],
  rows: [{ category: 'Help Desk', worker: 'Dana', byCompany: { 'Harbor Point Health': 120 } }],
  categoryTotals: { 'Help Desk': { 'Harbor Point Health': 120 } },
  companyTotals: { 'Harbor Point Health': 120 },
  grandTotal: 120,
  start: '2025-09-01',
  end: '2026-08-31',
  periodLabel: 'FY 2025-26',
  synced_at: null,
};

const entries: UtilizationEntry[] = [
  {
    date: '2025-09-02',
    company: 'Harbor Point Health',
    ticket: 'T20250902.0001',
    title: 'Password reset',
    resource: 'Dana',
    hours: 0.5,
    role: 'Help Desk',
  },
];

const hddDevices: HddTicketDevice[] = [
  { device_name: 'HPH-LT-0001', ticket_count: 2, last_user: 'dana', c_drive_gb: 237 },
];

const breakdown: OfficeWindowsBreakdown = {
  office_installs: [{ name: 'Office LTSC Standard 2024', installs: 3, devices: ['HPH-LT-0001'] }],
  windows_installs: [{ name: 'Windows 11', installs: 5, devices: ['HPH-LT-0001'] }],
  synced_at: null,
};

const officeWindows = {
  breakdown,
  manualInputs: { 'Office LTSC Standard 2024': '4', 'Windows 11': '6' },
  agencyName: 'Harbor Point Health',
};

const patchReport: PatchReport = {
  summary: [{ status: 'FullyPatched', label: 'Fully Patched', count: 1 }],
  devices: [
    {
      hostname: 'HPH-LT-0001',
      description: 'Laptop',
      last_user: 'dana',
      last_reboot: '2026-09-30T08:00:00Z',
      installed: 12,
      approved_pending: 0,
      not_approved: 0,
      status: 'FullyPatched',
      status_label: 'Fully Patched',
    },
  ],
  device_count: 1,
  synced_at: null,
};

describe('render', () => {
  // The first exceljs import under Vitest takes several seconds; pay it once
  // here so no single case runs into the per-test timeout.
  beforeAll(async () => {
    await loadExcel();
  }, 30_000);

  it('renders a device workbook with only the requested columns', async () => {
    const result = await render({
      reportType: 'devices',
      data: { sheets: [{ ...deviceSheet, companyName: 'Harbor Point' }] },
      options: { columns: ['Reference Name', 'Product'] },
      filename: 'Harbor Point Computer Inventory 10-1-26.xlsx',
    });
    expect(result.contentType).toContain(XLSX);
    expect(magic(result, 2)).toEqual(PK);

    const wb = await readWorkbook(result);
    const ws = wb.getWorksheet('Devices');
    expect(ws).toBeDefined();
    const header = (ws!.getRow(1).values as unknown[]).slice(1);
    expect(header).toEqual(['Reference Name', 'Product']);
    expect((ws!.getRow(2).values as unknown[]).slice(1)).toEqual(['HPH-LT-0001', 'Laptop']);
  });

  it('renders every device column when none are requested', async () => {
    const result = await render({
      reportType: 'devices',
      data: { sheets: [{ ...deviceSheet, companyName: 'Harbor Point' }] },
      options: {},
      filename: 'inventory.xlsx',
    });
    const wb = await readWorkbook(result);
    const header = (wb.getWorksheet('Devices')!.getRow(1).values as unknown[]).slice(1);
    expect(header).toEqual(['Product', 'Reference Name', 'Department']);
  });

  it('renders the SLA workbook', async () => {
    const tickets = [ticket({}), ticket({ resource: 'Sam', priority: 'P1 Critical' })];
    const result = await render({
      reportType: 'sla',
      data: { tickets },
      options: {},
      filename: 'sla.xlsx',
    });
    expect(result.contentType).toContain(XLSX);
    expect(magic(result, 2)).toEqual(PK);
    const wb = await readWorkbook(result);
    expect(wb.getWorksheet('Report')?.rowCount).toBe(1 + tickets.length);
  });

  it('renders the quarterly utilization workbook', async () => {
    const result = await render({
      reportType: 'quarterly_utilization',
      data: utilData,
      options: {},
      filename: 'quarter.xlsx',
    });
    expect(result.contentType).toContain(XLSX);
    expect(magic(result, 2)).toEqual(PK);
  });

  it('renders the annual utilization workbook with the rated departments', async () => {
    const result = await render({
      reportType: 'annual_utilization',
      data: { utilData, entries },
      options: { departments: [{ department: 'Help Desk', rate: 75 }] },
      filename: 'annual.xlsx',
    });
    expect(result.contentType).toContain(XLSX);
    expect(magic(result, 2)).toEqual(PK);
    const wb = await readWorkbook(result);
    expect(wb.getWorksheet('Summary')).toBeDefined();
  });

  it('renders the HDD tickets workbook', async () => {
    const result = await render({
      reportType: 'hdd_tickets',
      data: { devices: hddDevices },
      options: {},
      filename: 'hdd.xlsx',
    });
    expect(result.contentType).toContain(XLSX);
    expect(magic(result, 2)).toEqual(PK);
  });

  it('renders the Office and Windows report as docx by default', async () => {
    const result = await render({
      reportType: 'office_windows',
      data: officeWindows,
      options: { showLicenses: true },
      filename: 'licensing.docx',
    });
    expect(result.contentType).toContain(DOCX);
    expect(magic(result, 2)).toEqual(PK);
  });

  it('renders the Office and Windows report as pdf when asked', async () => {
    const result = await render({
      reportType: 'office_windows',
      data: officeWindows,
      options: { showLicenses: false, format: 'pdf' },
      filename: 'licensing.pdf',
    });
    expect(result.contentType).toBe('application/pdf');
    expect(magic(result, 4)).toEqual(PDF);
  });

  it('renders the patch management pdf', async () => {
    const result = await render({
      reportType: 'patch',
      data: { report: patchReport, agency: { id: 7, site: 'HPH', name: 'Harbor Point Health' } },
      options: {},
      filename: 'patch.pdf',
    });
    expect(result.contentType).toBe('application/pdf');
    expect(magic(result, 4)).toEqual(PDF);
  });

  it('rejects an unknown report type', async () => {
    await expect(
      render({ reportType: 'nope', data: {}, options: {}, filename: 'x' })
    ).rejects.toThrow(/Unknown report type/);
  });
});
