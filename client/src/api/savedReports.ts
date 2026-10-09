import { deleteJson, getJson, postForm } from './client';
import type { SavedReport, SaveReportResponse } from './types';

const BASE = '/api/saved-reports';

export interface SavedReportMeta {
  agencyName?: string;
  agencyId?: number | string;
  reportType?: string;
  format?: string;
  title?: string;
}

export function fetchSavedReports(): Promise<SavedReport[]> {
  return getJson<SavedReport[]>(BASE);
}

export function uploadSavedReport(
  blob: Blob,
  filename: string,
  meta: SavedReportMeta
): Promise<SaveReportResponse> {
  const form = new FormData();
  form.append('file', blob, filename);
  form.append('agency_name', meta.agencyName ?? '');
  form.append('agency_id', String(meta.agencyId ?? ''));
  form.append('report_type', meta.reportType ?? '');
  form.append('format', meta.format ?? '');
  form.append('title', meta.title ?? filename);
  return postForm<SaveReportResponse>(BASE, form);
}

export function deleteSavedReport(id: number): Promise<{ deleted: boolean }> {
  return deleteJson<{ deleted: boolean }>(`${BASE}/${id}`);
}

export function savedReportDownloadUrl(id: number): string {
  return `${BASE}/${id}/download`;
}

export async function fetchSavedReportBytes(id: number): Promise<ArrayBuffer> {
  const res = await fetch(savedReportDownloadUrl(id), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load the file (HTTP ${res.status})`);
  return res.arrayBuffer();
}
