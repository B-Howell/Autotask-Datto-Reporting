import type { EffectiveAgency } from '@/api';
import type { PresetDraft } from '@/components/report';
import { valueFor } from '@/utils/agencyGroups';

interface OfficeWindowsDraftInput {
  agency: EffectiveAgency | null;
  showLicenses: boolean;
}

/**
 * Describes the licensing report on screen for a schedule. The format starts
 * as Word; the dialog's Format choice replaces it before the preset is stored.
 */
export const officeWindowsPresetDraft = ({
  agency,
  showLicenses,
}: OfficeWindowsDraftInput): PresetDraft | null =>
  agency && {
    reportType: 'office_windows',
    agencyKey: String(valueFor(agency)),
    agencyName: agency.name,
    options: { format: 'docx', showLicenses },
  };
