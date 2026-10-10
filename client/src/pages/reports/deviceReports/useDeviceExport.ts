import { useCallback } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import type { AgencyValue } from '@/api';
import { fileDateStamp } from '@/utils/dates';
import { deliverBlob } from '@/utils/saveReport';
import { buildDeviceWorkbook } from './excelExport';
import type { DeviceRow } from './sheetRows';

interface DeviceExportInput {
  /** The visible columns in display order, as the chooser left them. */
  exportColumns: GridColDef<DeviceRow>[];
  /** The rows on screen, after the missing-field filter. */
  rows: DeviceRow[];
  agencyName: string;
  selectedCompany: AgencyValue | null;
}

/**
 * The device page's "Download XLSX" and "Save to app" action: one workbook from
 * the columns and rows on screen, delivered as a download or kept in the app.
 */
const useDeviceExport = ({ exportColumns, rows, agencyName, selectedCompany }: DeviceExportInput) =>
  useCallback(
    async (save: boolean) => {
      const blob = await buildDeviceWorkbook(exportColumns, rows);
      const label = agencyName || 'Device';
      const filename = `${label} Computer Inventory ${fileDateStamp()}.xlsx`;
      await deliverBlob({
        blob,
        filename,
        save,
        meta: {
          agencyName: label,
          agencyId: typeof selectedCompany === 'number' ? selectedCompany : '',
          reportType: 'devices',
          format: 'xlsx',
          title: filename.replace(/\.xlsx$/, ''),
        },
      });
    },
    [exportColumns, rows, agencyName, selectedCompany]
  );

export default useDeviceExport;
