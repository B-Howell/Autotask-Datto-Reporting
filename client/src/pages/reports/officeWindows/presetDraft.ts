import type { EffectiveAgency } from '@/api';
import { agencyPresetDraft } from '@/components/report';
import type { PresetDraft } from '@/components/report';

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
  agency && agencyPresetDraft('office_windows', agency, { format: 'docx', showLicenses });
