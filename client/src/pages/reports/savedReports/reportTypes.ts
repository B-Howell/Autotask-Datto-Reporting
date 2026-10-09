import type { ChipProps } from '@mui/material';

export const REPORT_TYPE_LABELS: Record<string, string> = {
  devices: 'Device Report',
  office_windows: 'Office / Windows',
  patch: 'Patch Management',
  sla: 'SLA Performance',
  utilization: 'Quarterly Utilization',
  annual_utilization: 'Annual Utilization',
  tickets: 'Ticket Report',
  hdd_tickets: 'HDD Storage Tickets',
};

export const FORMAT_COLORS: Record<string, ChipProps['color']> = {
  pdf: 'error',
  docx: 'info',
  xlsx: 'success',
};
