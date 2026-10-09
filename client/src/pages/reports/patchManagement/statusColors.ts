import type { PatchStatus } from '@/api';

/** Donut and legend colours per Datto patch status, matched to the vendor's sample report. */
export const STATUS_COLORS: Record<PatchStatus, string> = {
  FullyPatched: '#2e7d32',
  ApprovedPending: '#81c784',
  InstallError: '#f9a825',
  RebootRequired: '#e53935',
  NoData: '#8b1a1a',
  NoPolicy: '#bdbdbd',
};
