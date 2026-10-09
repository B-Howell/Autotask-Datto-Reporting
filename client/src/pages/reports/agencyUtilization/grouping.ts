import type { UtilizationRow } from '@/api';

export const groupRowsByCategory = (
  rows: UtilizationRow[] | undefined
): Record<string, UtilizationRow[]> => {
  const out: Record<string, UtilizationRow[]> = {};
  for (const r of rows ?? []) {
    (out[r.category] ??= []).push(r);
  }
  return out;
};

export const sumHours = (byCompany: Record<string, number>): number =>
  Object.values(byCompany).reduce((a, b) => a + b, 0);
