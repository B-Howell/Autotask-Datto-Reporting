import type { UtilizationEntry } from '@/api';

export interface RawColumn {
  key: keyof UtilizationEntry;
  label: string;
  wide?: boolean;
  align?: 'right';
}

export const RAW_COLUMNS: RawColumn[] = [
  { key: 'date', label: 'Date' },
  { key: 'company', label: 'Company Serviced' },
  { key: 'ticket', label: 'Ticket/Task #' },
  { key: 'title', label: 'Ticket/Task Title', wide: true },
  { key: 'resource', label: 'Resource' },
  { key: 'hours', label: 'Hours Worked', align: 'right' },
  { key: 'role', label: 'Role' },
];

export const ENTRY_ROWS_PER_PAGE = 100;

export const totalHours = (entries: UtilizationEntry[]): number =>
  entries.reduce((t, e) => t + (e.hours || 0), 0);
