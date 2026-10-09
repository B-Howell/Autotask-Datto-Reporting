# ReportProgress

> Spinner, indeterminate bar and a monospace tail of the server log, shown in the page while a report runs.

## Purpose

The status bar shows one line per job; the page itself can show more while the user waits. This card renders the message the page chooses and the last `tail` lines streamed from the server, so a long device or utilization fetch is visibly doing something. It is in the report component layer.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `message` | `string` | yes | Line beside the spinner. |
| `logs` | `string[]` | yes | Full log array from the report store. |
| `tail` | `number` | no | How many of the most recent lines to show. Default 25. |

## Uses

- `@mui/material` (`Paper`, `CircularProgress`, `LinearProgress`, `Typography`, `Box`)

## Used By

- Re-exported by [the report component barrel](<Reporting Report Component - index.md>)
- [AgencyUtilization page](<../../pages/reports/Reporting Page - AgencyUtilization.md>)
- [HddTickets page](<../../pages/reports/Reporting Page - HddTickets.md>)
- [OfficeWindowsReports page](<../../pages/reports/Reporting Page - OfficeWindowsReports.md>)
- [PatchManagement page](<../../pages/reports/Reporting Page - PatchManagement.md>)
- [SlaPerformance page](<../../pages/reports/Reporting Page - SlaPerformance.md>)

## Key Behavior

- Shows `logs.slice(-tail)`, so the page can pass the whole array and the component trims it; with no lines yet it shows a muted "Waiting for logs" placeholder.
- The log box is capped at 320 px and scrolls; it does not auto-scroll to the newest line, but since only the tail is rendered the newest line is always within the box.
- Structured `[PROGRESS]` lines never reach `logs` (they are split off in `runReportJob`), so only human-readable lines appear here.
- The bar is always indeterminate; phase-based percentages are drawn only in `RunningReportBar`.
- Lines are keyed by index, which is fine for an append-only tail.

## Cleanup Notes

- None noted.

## Source

[client/src/components/report/ReportProgress.tsx](../../../../client/src/components/report/ReportProgress.tsx)
