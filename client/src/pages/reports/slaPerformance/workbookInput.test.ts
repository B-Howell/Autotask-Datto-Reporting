import { describe, expect, it } from 'vitest';
import type { SlaTicket } from '@/api';
import { GRAND_TOTAL } from './pivots';
import { slaWorkbookInput } from './workbookInput';

const ticket = (overrides: Partial<SlaTicket>): SlaTicket => ({
  ticketNumber: 'T20260901.0001',
  title: 'Printer offline',
  companyName: 'Harbor Point Health',
  createDate: '09/01/2026',
  slaStartDate: '09/01/2026',
  completeDate: '09/02/2026',
  resource: 'Dana',
  queue: 'Help Desk',
  status: 'Complete',
  priority: 'P3 Moderate',
  ticketType: 'Incident',
  ticketCategory: 'Standard',
  issueType: 'Hardware',
  subIssueType: 'Printer',
  firstResponseHours: 1,
  firstResponseMet: true,
  resolutionPlanHours: 2,
  resolutionPlanMet: true,
  resolvedHours: 8,
  resolvedMet: false,
  waitingCustomerHours: 0,
  ...overrides,
});

describe('slaWorkbookInput', () => {
  it('keeps the tickets and builds the three pivots, each closed by a Grand Total row', () => {
    const tickets = [
      ticket({}),
      ticket({ resource: 'Sam', priority: 'P1 Critical', firstResponseMet: false }),
    ];
    const input = slaWorkbookInput({ tickets });
    expect(input.tickets).toBe(tickets);
    expect(input.pivot.map((r) => r.resource)).toEqual(['Dana', 'Sam', GRAND_TOTAL]);
    expect(input.pivot.at(-1)).toEqual({
      resource: GRAND_TOTAL,
      avgFirstResponseMet: 0.5,
      avgResolvedMet: 0,
      ticketCount: 2,
    });
    expect(input.pivotByPriority.map((r) => r.resource)).toEqual([
      'P1 Critical',
      'P3 Moderate',
      GRAND_TOTAL,
    ]);
    expect(input.pivotByIssueType.map((r) => r.issueType)).toEqual(['Hardware', GRAND_TOTAL]);
  });
});
