import type { InstallBreakdownItem, ManualInputs, OfficeWindowsFormat } from '@/api';
import { fileDateStamp } from '@/utils/dates';
import type { BundledOfficeRow } from './skus';

export const REPORT_TYPE = 'office_windows';

export const reportTitle = (agencyName: string): string =>
  `${agencyName} Office and Windows Installs`;

export const reportFilename = (agencyName: string, extension: OfficeWindowsFormat): string =>
  `${reportTitle(agencyName)} ${fileDateStamp()}.${extension}`;

export interface OfficeReportRow {
  name: string;
  installs: string;
  isGroup?: boolean;
  isChild?: boolean;
  license: string;
  available: string;
}

export interface OsReportRow {
  name: string;
  installs: number;
  license: string;
}

/** What the Word and PDF table builders need from either kind of row. */
export interface ReportRow {
  name: string;
  installs: string | number;
  isGroup?: boolean;
  isChild?: boolean;
  license: string;
  available?: string;
}

/** OS lines with no installs are omitted (e.g. "Windows 10" when it's 0). */
export const installedOnly = (items: InstallBreakdownItem[]): InstallBreakdownItem[] =>
  items.filter((item) => (item.installs || 0) > 0);

export interface ReportRowSources {
  officeRows: BundledOfficeRow[];
  osRows: InstallBreakdownItem[];
  officeLicenses: ManualInputs;
  officeAvailable: ManualInputs;
  osLicenses: ManualInputs;
}

export interface ReportRows {
  officeRows: OfficeReportRow[];
  osRows: OsReportRow[];
}

/**
 * The rows both exports print: the on-screen tables with the licence figures
 * folded in, minus the subscription lines nobody has put a figure against, so
 * a customer never sees a plan they do not hold.
 */
export const buildReportRows = (sources: ReportRowSources): ReportRows => {
  const officeRows = sources.officeRows
    .map((item): OfficeReportRow => ({
      name: item.name,
      // Installs belong to the family row, not to its licence variants.
      installs: item.isChild ? '' : String(item.installs),
      isGroup: item.isGroup,
      isChild: item.isChild,
      license: item.isGroup ? '' : sources.officeLicenses[item.key] || '',
      available: item.isChild ? sources.officeAvailable[item.key] || '' : '',
    }))
    .filter((row) => !row.isChild || row.license.trim() || row.available.trim());
  const osRows = sources.osRows.map((item): OsReportRow => ({
    name: item.name,
    installs: item.installs,
    license: sources.osLicenses[item.name] || '',
  }));
  return { officeRows, osRows };
};
