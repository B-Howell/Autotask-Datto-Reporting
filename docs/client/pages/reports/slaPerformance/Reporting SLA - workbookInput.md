# SLA workbookInput

> Assembles the SLA workbook's input, the ticket list and its three pivots, from a report or a filtered ticket set, with no React or store dependency.

## Purpose

The SLA workbook prints the tickets plus the pivots by resource, by priority and by issue type. The page used to build those pivots inline before handing them to the exporter; a headless renderer needs the same assembly from the API response. This module is the single place that decides which pivots the workbook carries and how each is built, so the on-screen tables and the file always agree. It is a pure util in the SLA Performance folder.

## Interface

- `slaWorkbookInput({ tickets }): SlaWorkbookInput`, taking `Pick<SlaReport, 'tickets'>` so either the whole API response or `{ tickets: filteredTickets }` is accepted.

The result is `{ tickets, pivot, pivotByPriority, pivotByIssueType }`: the tickets as given, `buildPivot` by `resource`, `sortByPriority(buildPivot by priority)`, and `buildIssueTypePivot`.

## Uses

- [pivots](<Reporting SLA - pivots.md>) for `buildPivot`, `sortByPriority`, `buildIssueTypePivot`.
- `SlaWorkbookInput` type from [excelExport](<Reporting SLA - excelExport.md>); `SlaReport` type from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [SlaPerformance page](<../Reporting Page - SlaPerformance.md>), which memoises the result on `filteredTickets`, renders the pivot tables from it and passes it unchanged to `buildSlaWorkbook`.
- [client/src/pages/reports/slaPerformance/workbookInput.test.ts](../../../../../client/src/pages/reports/slaPerformance/workbookInput.test.ts).

## Key Behavior

- The function does not filter: the page passes its filtered tickets, a renderer passes every ticket of the month. Which tickets appear is the caller's decision; which pivots appear is this module's.
- The ticket array is returned by reference, not copied, so the `Report` sheet is exactly the input in input order.
- With no tickets every pivot is empty (no Grand Total row), matching the on-screen tables.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/slaPerformance/workbookInput.ts](../../../../../client/src/pages/reports/slaPerformance/workbookInput.ts)
