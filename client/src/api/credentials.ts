import { getJson, postJson, putJson } from './client';
import type { ConnectionTestResult, CredentialValues, CredentialsStatus } from './types';

const BASE = '/api/credentials';

/** Rejects with a 503 `ApiError` when the stored values cannot be decrypted. */
export function fetchCredentials(): Promise<CredentialsStatus> {
  return getJson<CredentialsStatus>(BASE);
}

/** Probes both vendors with `values` laid over the stored ones; nothing is saved. */
export function testCredentials(values: CredentialValues): Promise<ConnectionTestResult> {
  return postJson<ConnectionTestResult>(`${BASE}/test`, { values });
}

/** Stores the non-blank values once every vendor they change accepts them; resolves with the new status. */
export function saveCredentials(values: CredentialValues): Promise<CredentialsStatus> {
  return putJson<CredentialsStatus>(BASE, { values });
}
