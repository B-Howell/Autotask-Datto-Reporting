import type { EffectiveAgency, PresetReportType } from '@/api';
import { valueFor } from '@/utils/agencyGroups';

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

/** The draft of a report run for one agency or group, keyed the way the dropdown keys it. */
export function agencyPresetDraft(
  reportType: PresetReportType,
  agency: EffectiveAgency,
  options: Record<string, unknown> = {}
): PresetDraft {
  return { reportType, agencyKey: String(valueFor(agency)), agencyName: agency.name, options };
}

/** The draft of a report that covers every agency, so it names none. */
export function agencyWidePresetDraft(
  reportType: PresetReportType,
  options: Record<string, unknown> = {}
): PresetDraft {
  return { reportType, agencyKey: null, agencyName: '', options };
}

export function defaultName(draft: PresetDraft): string {
  const label = REPORT_LABELS[draft.reportType];
  return hasAgency(draft) ? `${draft.agencyName} ${label}`.trim() : label;
}

export function defaultSubject(draft: PresetDraft): string {
  return hasAgency(draft) ? '{agency} {report} {period}' : '{report} {period}';
}

/**
 * Splits a typed recipient list on commas or semicolons, dropping blanks and
 * repeats (compared case-insensitively; the first spelling is kept).
 */
export function splitAddresses(text: string): string[] {
  const seen = new Set<string>();
  const addresses: string[] = [];
  for (const part of text.split(/[,;]/)) {
    const address = part.trim();
    const key = address.toLowerCase();
    if (!address || seen.has(key)) continue;
    seen.add(key);
    addresses.push(address);
  }
  return addresses;
}

/** The server's own test of an address: anything with an `@`; the rest is left to the mail host. */
export function isEmailAddress(text: string): boolean {
  return text.includes('@');
}

/** The entries that cannot be an email address, which the server would refuse. */
export function invalidAddresses(text: string): string[] {
  return splitAddresses(text).filter((address) => !isEmailAddress(address));
}
