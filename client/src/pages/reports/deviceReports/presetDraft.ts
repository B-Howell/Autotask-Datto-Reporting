import type { GridColDef } from '@mui/x-data-grid';
import type { AgencyValue } from '@/api';
import type { PresetDraft } from '@/components/report';
import type { DeviceRow } from './sheetRows';

interface DeviceDraftInput {
  selectedCompany: AgencyValue | null;
  agencyName: string;
  /** The visible columns in the user's order, as the workbook export receives them. */
  exportColumns: GridColDef<DeviceRow>[];
}

/**
 * Describes the device inventory on screen for a schedule. The columns are
 * stored by header name because that is what the renderer selects by, so a
 * scheduled run hides the same columns, in the same order, as the page did.
 */
export const devicePresetDraft = ({
  selectedCompany,
  agencyName,
  exportColumns,
}: DeviceDraftInput): PresetDraft | null =>
  selectedCompany === null
    ? null
    : {
        reportType: 'devices',
        agencyKey: String(selectedCompany),
        agencyName,
        options: { columns: exportColumns.map((c) => c.headerName ?? '') },
      };
