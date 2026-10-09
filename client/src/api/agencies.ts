import { deleteJson, getJson, postJson } from './client';
import type { Agency } from './types';

const BASE = '/api/agencies';

export function fetchAgencies(): Promise<Agency[]> {
  return getJson<Agency[]>(BASE);
}

/** The server answers every mutation with the full updated list. */
export function createAgency(agency: Agency): Promise<Agency[]> {
  return postJson<Agency[]>(BASE, agency);
}

export function deleteAgency(id: number): Promise<Agency[]> {
  return deleteJson<Agency[]>(`${BASE}/${id}`);
}
