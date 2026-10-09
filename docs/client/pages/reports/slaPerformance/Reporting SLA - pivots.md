# SLA pivots

> The pure functions that aggregate SLA tickets into the three pivots: by resource, by priority (P1 to P4 order) and by issue type with sub-issue children, each with a Grand Total row.

## Purpose

The server already returns a pivot by resource, but the page lets the user filter tickets, and the pivots must follow the filter. So the pivots are recomputed in the browser from `filteredTickets`, and this module is where the grouping and the averaging rules are defined once for the tables and the Excel export. No React, no I/O.

## Interface

| Export | Description |
|---|---|
| `GRAND_TOTAL` | `'Grand Total'`, the label of the summary row that every builder appends last. |
| `PRIORITY_ORDER` | `['P1 Critical', 'P2 Important', 'P3 Moderate', 'P4 Minor']`. |
| `buildPivot(tickets, keyOf, totalLabel = GRAND_TOTAL)` | Generic one-level pivot returning `SlaPivotRow[]`; `workbookInput` calls it with `t => t.resource` and `t => t.priority`. |
| `sortByPriority(rows)` | Reorders a pivot's rows into `PRIORITY_ORDER`, unknown priorities after them alphabetically, Grand Total last. |
| `buildIssueTypePivot(tickets)` | Two-level pivot returning `IssueTypePivotRow[]` with `children: SubIssuePivotRow[]`. |
| `IssueTypePivotRow`, `SubIssuePivotRow` | `{ issueType or subIssueType, avgFirstResponseMet, avgResolvedMet, ticketCount }`, the parent additionally carrying `children`. |

## Uses

- `SlaTicket`, `SlaPivotRow` types from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [workbookInput](<Reporting SLA - workbookInput.md>) (all three builders), which the [SlaPerformance page](<../Reporting Page - SlaPerformance.md>) memoises on `filteredTickets`.
- [PivotTable](<Reporting SLA - PivotTable.md>) and [IssueTypePivotTable](<Reporting SLA - IssueTypePivotTable.md>) (`GRAND_TOTAL`, row types).
- [excelExport](<Reporting SLA - excelExport.md>) (`GRAND_TOTAL`, `IssueTypePivotRow`).

## Key Behavior

- Metrics, identical for every pivot level: each bucket keeps two arrays of 1/0 flags, `fr` from `firstResponseMet` and `res` from `resolvedMet`. A ticket contributes to an array only when that flag is not null or undefined, so tickets without an SLA measurement do not drag the average down. `avgFirstResponseMet` and `avgResolvedMet` are the means of those arrays (0 when empty), expressed as fractions 0 to 1. `ticketCount` is `max(fr.length, res.length)`: the number of tickets with at least one measurable flag, not the number of tickets in the group. `resolutionPlanMet` is not aggregated anywhere.
- Grouping keys: `buildPivot` uses `keyOf(t)`, substituting `'(blank)'` for an empty string; `workbookInput` supplies `resource` and `priority`. `buildIssueTypePivot` groups by `issueType` then `subIssueType`, with the same `'(blank)'` substitution at both levels, and every ticket is counted in its parent, its child and the total.
- Ordering: group rows are sorted by `localeCompare` on the key; children are sorted the same way within their parent. The Grand Total row is pushed last. `sortByPriority` is applied afterwards for the priority pivot only.
- Empty input returns `[]` with no Grand Total row, which is why the tables render nothing rather than a lone total when the filters exclude everything.
- The resulting row shape for one-level pivots reuses the server's `SlaPivotRow`, so the label is always in the `resource` field even when grouping by priority.

## Cleanup Notes

- The builders are exercised through [the workbookInput test](<Reporting SLA - workbookInput.md>) (Grand Total averages and ordering) but have no tests of their own for the `'(blank)'` key and the `ticketCount` rule.

## Source

[client/src/pages/reports/slaPerformance/pivots.ts](../../../../../client/src/pages/reports/slaPerformance/pivots.ts)
