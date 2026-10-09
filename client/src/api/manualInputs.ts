import { getJson, putJson, query } from './client';
import type { ManualInputs } from './types';

const BASE = '/api/manual-inputs';

export function fetchManualInputs(agencyKey: string, reportType: string): Promise<ManualInputs> {
  return getJson<ManualInputs>(
    `${BASE}${query({ agency_key: agencyKey, report_type: reportType })}`
  );
}

export function saveManualInput(
  agencyKey: string,
  reportType: string,
  fieldKey: string,
  value: string
): Promise<{ ok: boolean }> {
  return putJson<{ ok: boolean }>(BASE, {
    agency_key: agencyKey,
    report_type: reportType,
    field_key: fieldKey,
    value,
  });
}
