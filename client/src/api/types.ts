// Response shapes for every server endpoint the client calls. The server builds
// these from SQLite snapshot rows (see the aggregate functions in
// server/services), so the field names are the snake_case ones it emits.

export interface Agency {
  id: number;
  site: string;
  name: string;
}

/** Several Autotask companies presented as one dropdown entry. */
export interface AgencyGroup {
  name: string;
  members: Agency[];
}

export type EffectiveAgency = Agency | AgencyGroup;

export function isAgencyGroup(agency: EffectiveAgency): agency is AgencyGroup {
  return 'members' in agency;
}

/** Dropdown value: a numeric company id, or `group:<name>` for a group. */
export type AgencyValue = number | string;

export type SheetCell = string | number | null;

export interface DeviceSheetResponse {
  sheet: SheetCell[][];
  /** Autotask configuration item id per body row; null for rows cached before ids were stored. */
  ids: (number | null)[];
  synced_at: string | null;
}

export interface DeviceChange {
  deviceId: number;
  field: string;
  value: string;
}

export interface DeviceUpdateResult {
  status: string;
  results: { deviceId: number; status: 'ok' | 'error'; error?: string }[];
}

export interface InstallBreakdownItem {
  name: string;
  installs: number;
  devices: string[];
}

export interface OfficeWindowsBreakdown {
  windows_installs: InstallBreakdownItem[];
  office_installs: InstallBreakdownItem[];
  synced_at: string | null;
}

export interface RepairTime {
  average_days: number;
  completed_tickets: number;
}

export interface FirstCallResolution {
  percentage: number;
  phone_tickets_fcr: number;
  phone_tickets_total: number;
}

export interface TicketDetails {
  total_tickets: number;
  source_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
  issue_type_breakdown: Record<string, number>;
  avg_time_to_repair: Record<string, RepairTime>;
  first_call_resolution: FirstCallResolution;
  synced_at?: string | null;
}

export interface SlaTicket {
  ticketNumber: string;
  title: string;
  companyName: string;
  createDate: string;
  slaStartDate: string;
  completeDate: string;
  resource: string;
  queue: string;
  status: string;
  priority: string;
  ticketType: string;
  ticketCategory: string;
  issueType: string;
  subIssueType: string;
  firstResponseHours: number;
  firstResponseMet: boolean | null;
  resolutionPlanHours: number;
  resolutionPlanMet: boolean | null;
  resolvedHours: number;
  resolvedMet: boolean | null;
  waitingCustomerHours: number;
}

export interface SlaPivotRow {
  resource: string;
  avgFirstResponseMet: number;
  avgResolvedMet: number;
  ticketCount: number;
}

export interface SlaTarget {
  response: number;
  resolution: number;
}

export interface SlaReport {
  tickets: SlaTicket[];
  companies: Record<string, string>;
  grouped: Record<string, Record<string, SlaTicket[]>>;
  pivot: SlaPivotRow[];
  slaTargets: Record<string, SlaTarget>;
  month: number;
  year: number;
  synced_at: string | null;
}

export interface UtilizationRow {
  category: string;
  worker: string;
  byCompany: Record<string, number>;
}

export interface UtilizationReport {
  categories: string[];
  companies: string[];
  rows: UtilizationRow[];
  categoryTotals: Record<string, Record<string, number>>;
  companyTotals: Record<string, number>;
  grandTotal: number;
  start: string;
  end: string;
  periodLabel: string;
  synced_at: string | null;
}

export interface UtilizationEntry {
  date: string;
  company: string;
  ticket: string;
  title: string;
  resource: string;
  hours: number;
  role: string;
}

export interface UtilizationEntriesResponse {
  entries: UtilizationEntry[];
}

export type PatchStatus =
  'FullyPatched' | 'ApprovedPending' | 'InstallError' | 'RebootRequired' | 'NoData' | 'NoPolicy';

export interface PatchSummaryItem {
  status: PatchStatus;
  label: string;
  count: number;
}

export interface PatchDevice {
  hostname: string;
  description: string;
  last_user: string;
  last_reboot: string;
  installed: number;
  approved_pending: number;
  not_approved: number;
  status: PatchStatus;
  status_label: string;
}

export interface PatchReport {
  summary: PatchSummaryItem[];
  devices: PatchDevice[];
  device_count: number;
  synced_at: string | null;
}

export interface HddTicketDevice {
  device_name: string;
  ticket_count: number;
  last_user: string;
  c_drive_gb: number | null;
}

export interface HddTicketsReport {
  devices: HddTicketDevice[];
  device_count: number;
  synced_at: string | null;
}

/** A `[PROGRESS]` line from the server, see server/core/progress.py. */
export interface JobProgress {
  phase: string;
  done: number | null;
  total: number | null;
  step: number | null;
  steps: number | null;
}

export type JobStatus = 'running' | 'done' | 'error' | 'cancelled';

export interface ServerJob {
  id: string;
  label: string;
  status: JobStatus;
  progress: JobProgress | null;
  status_text: string | null;
  error: string | null;
  started_at: number;
  finished_at: number | null;
  cancelled: boolean;
}

export interface SyncStatus {
  running: boolean;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  done: number;
  total: number;
  current: string | null;
  last_synced_at: string | null;
}

export interface SyncTriggerResponse extends SyncStatus {
  started: boolean;
}

export type ReportFormat = 'xlsx' | 'docx' | 'pdf';

export interface SavedReport {
  id: number;
  agency_id: number | null;
  agency_name: string;
  report_type: string;
  format: ReportFormat | string;
  title: string;
  filename: string;
  size_bytes: number;
  created_at: string;
}

export interface SaveReportResponse {
  id: number;
  deduped: boolean;
}

export type ManualInputs = Record<string, string>;

export interface GroupRule {
  name: string;
  matchPrefix: string;
}

export interface RatedDepartment {
  department: string;
  rate: number;
}

/** Deployment presentation settings from `GET /api/tenant`; see server/data/tenant.example.json. */
export interface TenantSettings {
  groups: GroupRule[];
  logos: Record<string, string>;
  ratedDepartments: RatedDepartment[];
  firstReportYear: number;
  earliestQuarterYear: number;
}

export type PresetReportType =
  | 'devices'
  | 'office_windows'
  | 'patch'
  | 'hdd_tickets'
  | 'sla'
  | 'quarterly_utilization'
  | 'annual_utilization';

/** A stored report configuration that a schedule renders; see server/services/presets.py. */
export interface ReportPreset {
  id: number;
  name: string;
  report_type: PresetReportType;
  agency_key: string | null;
  agency_name: string;
  options: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PresetInput {
  name: string;
  report_type: PresetReportType;
  agency_key: string | null;
  agency_name: string;
  options: Record<string, unknown>;
}

/**
 * A schedule row as the list, create and update routes serve it: every stored
 * column plus the preset joined by id, null when that preset no longer exists.
 */
export interface ReportSchedule {
  id: number;
  preset_id: number;
  preset: ReportPreset | null;
  day_of_month: number;
  hour: number;
  recipients_to: string[];
  recipients_cc: string[];
  subject: string;
  body: string;
  enabled: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: 'ok' | 'error' | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleInput {
  preset_id: number;
  day_of_month: number;
  hour: number;
  recipients_to: string[];
  recipients_cc: string[];
  subject: string;
  body: string;
  enabled?: boolean;
}

export interface ScheduleRun {
  id: number;
  schedule_id: number;
  trigger: 'schedule' | 'manual';
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'ok' | 'error';
  error: string | null;
  saved_report_id: number | null;
}

export interface RunnerStatus {
  running: boolean;
  schedule_id: number | null;
}

export interface RendererHealth {
  ok: boolean;
  reportTypes: string[];
}
