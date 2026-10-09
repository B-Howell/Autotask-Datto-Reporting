import type { SlaTicket } from '@/api';

export interface SlaColumn {
  key: keyof SlaTicket;
  label: string;
  width: number;
  numeric?: boolean;
  met?: boolean;
}

export const COLUMNS: SlaColumn[] = [
  { key: 'ticketNumber', label: 'Ticket Number', width: 140 },
  { key: 'title', label: 'Title', width: 280 },
  { key: 'companyName', label: 'Company', width: 180 },
  { key: 'createDate', label: 'Create Date', width: 100 },
  { key: 'slaStartDate', label: 'SLA Start Date', width: 110 },
  { key: 'completeDate', label: 'Complete Date', width: 110 },
  { key: 'resource', label: 'Resource', width: 150 },
  { key: 'queue', label: 'Queue', width: 130 },
  { key: 'status', label: 'Status', width: 110 },
  { key: 'priority', label: 'Priority', width: 110 },
  { key: 'ticketType', label: 'Ticket Type', width: 120 },
  { key: 'ticketCategory', label: 'Ticket Category', width: 130 },
  { key: 'issueType', label: 'Issue Type', width: 120 },
  { key: 'subIssueType', label: 'Sub-Issue Type', width: 130 },
  { key: 'firstResponseHours', label: 'First Response (Hours)', width: 100, numeric: true },
  { key: 'firstResponseMet', label: 'First Response Met', width: 90, met: true },
  { key: 'resolutionPlanHours', label: 'Resolution Plan (Hours)', width: 100, numeric: true },
  { key: 'resolutionPlanMet', label: 'Resolution Plan Met', width: 90, met: true },
  { key: 'resolvedHours', label: 'Resolved (Hours)', width: 100, numeric: true },
  { key: 'resolvedMet', label: 'Resolved Met', width: 90, met: true },
  { key: 'waitingCustomerHours', label: 'Total Waiting Customer Hours', width: 100, numeric: true },
];

/** The server sends these as `MM/DD/YYYY`; exports parse them so Excel can sort by date. */
export const DATE_KEYS = new Set<keyof SlaTicket>(['createDate', 'slaStartDate', 'completeDate']);
