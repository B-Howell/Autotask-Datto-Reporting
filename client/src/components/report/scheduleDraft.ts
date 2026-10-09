import type { PresetReportType } from '@/api';

/** What a report page knows about the report on screen, enough to store it as a preset. */
export interface PresetDraft {
  reportType: PresetReportType;
  /** The agency selection as a string (`'1000'` or `'group:Name'`), or null for agency-wide reports. */
  agencyKey: string | null;
  agencyName: string;
  options: Record<string, unknown>;
}

// Must match REPORT_LABELS in server/services/scheduled_runs.py: the server
// fills the {report} placeholder with these, so a preset name built here and
// the subject the message carries use the same words.
export const REPORT_LABELS: Record<PresetReportType, string> = {
  devices: 'Device inventory',
  office_windows: 'Office and Windows licensing',
  patch: 'Patch management',
  hdd_tickets: 'Disk-space tickets',
  sla: 'SLA performance',
  quarterly_utilization: 'Quarterly utilization',
  annual_utilization: 'Annual utilization',
};

const hasAgency = (draft: PresetDraft) => draft.agencyKey !== null;

export function defaultName(draft: PresetDraft): string {
  const label = REPORT_LABELS[draft.reportType];
  return hasAgency(draft) ? `${draft.agencyName} ${label}`.trim() : label;
}

export function defaultSubject(draft: PresetDraft): string {
  return hasAgency(draft) ? '{agency} {report} {period}' : '{report} {period}';
}

/** Splits a typed recipient list on commas or semicolons, dropping blanks. */
export function splitAddresses(text: string): string[] {
  return text
    .split(/[,;]/)
    .map((address) => address.trim())
    .filter(Boolean);
}
