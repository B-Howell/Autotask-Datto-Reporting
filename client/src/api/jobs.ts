import { deleteJson, getJson, postJson } from './client';
import type { ServerJob } from './types';

const BASE = '/api/jobs/current';

/** The server answers `{}` when nothing is running. */
export async function fetchCurrentJob(): Promise<ServerJob | null> {
  const job = await getJson<Partial<ServerJob>>(BASE);
  return job.id ? (job as ServerJob) : null;
}

export function cancelCurrentJob(): Promise<{ cancelled: boolean }> {
  return postJson<{ cancelled: boolean }>(`${BASE}/cancel`);
}

export function dismissCurrentJob(): Promise<{ ok: boolean }> {
  return deleteJson<{ ok: boolean }>(BASE);
}
