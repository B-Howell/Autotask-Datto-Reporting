import { deleteJson, getJson, postJson, putJson } from './client';
import type { PresetInput, ReportPreset } from './types';

const BASE = '/api/presets';

export function fetchPresets(): Promise<ReportPreset[]> {
  return getJson<ReportPreset[]>(BASE);
}

export function createPreset(body: PresetInput): Promise<ReportPreset> {
  return postJson<ReportPreset>(BASE, body);
}

export function updatePreset(id: number, body: Partial<PresetInput>): Promise<ReportPreset> {
  return putJson<ReportPreset>(`${BASE}/${id}`, body);
}

/** Rejects with a 409 `ApiError` while a schedule still renders the preset. */
export function deletePreset(id: number): Promise<{ deleted: boolean }> {
  return deleteJson<{ deleted: boolean }>(`${BASE}/${id}`);
}
