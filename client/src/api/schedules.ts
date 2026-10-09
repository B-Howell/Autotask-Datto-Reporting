import { deleteJson, getJson, postJson, putJson } from './client';
import type {
  RendererHealth,
  ReportSchedule,
  RunnerStatus,
  ScheduleInput,
  ScheduleRun,
} from './types';

const BASE = '/api/schedules';

export function fetchSchedules(): Promise<ReportSchedule[]> {
  return getJson<ReportSchedule[]>(BASE);
}

export function createSchedule(body: ScheduleInput): Promise<ReportSchedule> {
  return postJson<ReportSchedule>(BASE, body);
}

export function updateSchedule(id: number, body: Partial<ScheduleInput>): Promise<ReportSchedule> {
  return putJson<ReportSchedule>(`${BASE}/${id}`, body);
}

export function deleteSchedule(id: number): Promise<{ deleted: boolean }> {
  return deleteJson<{ deleted: boolean }>(`${BASE}/${id}`);
}

/** One schedule's runs, or the newest runs across every schedule when no id is given. */
export function fetchRuns(scheduleId?: number): Promise<ScheduleRun[]> {
  const url = scheduleId === undefined ? `${BASE}/runs` : `${BASE}/${scheduleId}/runs`;
  return getJson<ScheduleRun[]>(url);
}

/** Rejects with a 409 `ApiError` while another run is in flight. */
export function runNow(id: number): Promise<{ started: boolean }> {
  return postJson<{ started: boolean }>(`${BASE}/${id}/run`);
}

export function fetchRunnerStatus(): Promise<RunnerStatus> {
  return getJson<RunnerStatus>(`${BASE}/status`);
}

/** The server-sent event stream of runner log lines, for an `EventSource`. */
export function scheduleLogsUrl(): string {
  return `${BASE}/logs`;
}

export function fetchRendererHealth(): Promise<RendererHealth> {
  return getJson<RendererHealth>(`${BASE}/renderer-health`);
}

/** Sends a one-line message with no attachment through the delivery flow. */
export function sendTestEmail(to: string[]): Promise<{ sent: boolean }> {
  return postJson<{ sent: boolean }>(`${BASE}/test-delivery`, { to });
}
