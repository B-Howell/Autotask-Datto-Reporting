import type { HddTicketDevice } from '@/api';
import { XLSX_HEADER_FILL, loadExcel, workbookToBlob } from '@/utils/excel';

const COLUMNS = [
  { header: 'Device Name', key: 'device_name', width: 26 },
  { header: 'HDD Tickets', key: 'ticket_count', width: 14 },
  { header: 'Last User', key: 'last_user', width: 22 },
  { header: 'C: Drive Size (GB)', key: 'c_drive_gb', width: 18 },
];

/** One "HDD Tickets" sheet, one row per device, with a filterable blue header. */
export async function buildHddTicketsWorkbook(devices: HddTicketDevice[]): Promise<Blob> {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('HDD Tickets');
  ws.columns = COLUMNS;
  devices.forEach((d) =>
    ws.addRow({
      device_name: d.device_name,
      ticket_count: d.ticket_count,
      last_user: d.last_user,
      c_drive_gb: d.c_drive_gb ?? '',
    })
  );
  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_HEADER_FILL } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center' };
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
  return workbookToBlob(wb);
}
