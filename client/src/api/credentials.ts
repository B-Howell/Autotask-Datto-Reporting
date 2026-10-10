import { ApiError, deleteJson, getJson, postJson, putJson } from './client';
import type {
  ConnectionTestResult,
  CredentialValues,
  CredentialsStatus,
  ForgottenCredentials,
} from './types';

const BASE = '/api/credentials';

/** Rejects with a 503 `ApiError` when the stored values cannot be decrypted. */
export function fetchCredentials(): Promise<CredentialsStatus> {
  return getJson<CredentialsStatus>(BASE);
}

/** True for the rejection `fetchCredentials` raises when the stored values cannot be read. */
export function isUnreadable(err: unknown): boolean {
  return err instanceof ApiError && err.status === 503;
}

/** Probes both vendors with `values` laid over the stored ones; nothing is saved. */
export function testCredentials(values: CredentialValues): Promise<ConnectionTestResult> {
  return postJson<ConnectionTestResult>(`${BASE}/test`, { values });
}

/** Stores the non-blank values once every vendor they change accepts them; resolves with the new status. */
export function saveCredentials(values: CredentialValues): Promise<CredentialsStatus> {
  return putJson<CredentialsStatus>(BASE, { values });
}

/** Removes every stored value, readable or not; environment values stay. Resolves with the new status. */
export function forgetCredentials(): Promise<ForgottenCredentials> {
  return deleteJson<ForgottenCredentials>(BASE);
}
