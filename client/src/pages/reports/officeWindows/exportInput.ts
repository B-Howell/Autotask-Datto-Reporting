import type { ManualInputs, OfficeWindowsBreakdown } from '@/api';
import { buildReportRows, installedOnly } from './reportRows';
import type { ReportRows } from './reportRows';
import { availableValuesOf, groupOfficeInstalls, visibleSkusOf } from './skus';

/** The two install lists, as the API returns them or as a group's merged counts. */
export type InstallBreakdowns = Pick<
  OfficeWindowsBreakdown,
  'windows_installs' | 'office_installs'
>;

/** What the Word and PDF builders print, apart from the images they embed. */
export interface OfficeWindowsExportInput extends ReportRows {
  agencyName: string;
  showLicenses: boolean;
}

/**
 * The export tables from the breakdown and the agency's saved figures. The
 * saved map is the one the server holds: licence counts under the product
 * name, Available counts under `available::<product>`, and the visible plan
 * list under `VISIBLE_SKUS_KEY`.
 */
export function officeWindowsExportInput(
  breakdown: InstallBreakdowns,
  manualInputs: ManualInputs,
  agencyName: string,
  showLicenses: boolean
): OfficeWindowsExportInput {
  const rows = buildReportRows({
    officeRows: groupOfficeInstalls(breakdown.office_installs, visibleSkusOf(manualInputs)),
    osRows: installedOnly(breakdown.windows_installs),
    officeLicenses: manualInputs,
    officeAvailable: availableValuesOf(manualInputs),
    osLicenses: manualInputs,
  });
  return { agencyName, showLicenses, ...rows };
}
