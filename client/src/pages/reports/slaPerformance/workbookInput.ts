import type { SlaReport } from '@/api';
import type { SlaWorkbookInput } from './excelExport';
import { buildIssueTypePivot, buildPivot, sortByPriority } from './pivots';

/**
 * The ticket list and the three pivots the workbook prints. Takes the report
 * (or any object carrying `tickets`) so the page can pass its filtered tickets
 * and a renderer can pass the API response as it is.
 */
export function slaWorkbookInput({ tickets }: Pick<SlaReport, 'tickets'>): SlaWorkbookInput {
  return {
    tickets,
    pivot: buildPivot(tickets, (t) => t.resource),
    pivotByPriority: sortByPriority(buildPivot(tickets, (t) => t.priority)),
    pivotByIssueType: buildIssueTypePivot(tickets),
  };
}
