import { deleteJson, postJson } from './client';
import type { PresetInput, ReportPreset } from './types';

const BASE = '/api/presets';

export function createPreset(body: PresetInput): Promise<ReportPreset> {
  return postJson<ReportPreset>(BASE, body);
}

/** Rejects with a 409 `ApiError` while a schedule still renders the preset. */
export function deletePreset(id: number): Promise<{ deleted: boolean }> {
  return deleteJson<{ deleted: boolean }>(`${BASE}/${id}`);
}
