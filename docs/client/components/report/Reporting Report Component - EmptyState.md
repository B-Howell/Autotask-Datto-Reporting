# EmptyState

> A padded card with muted text, for "nothing to show yet" messages on report pages.

## Purpose

Before a report has been run, or when a saved-reports list is empty, pages need a consistent placeholder rather than blank space. This component is that placeholder. It is in the report component layer and holds no logic.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | yes | The message. |

## Uses

- `@mui/material` (`Paper`, `Typography`)

## Used By

- Re-exported by [the report component barrel](<Reporting Report Component - index.md>)
- [HddTickets page](<../../pages/reports/Reporting Page - HddTickets.md>)
- [PatchManagement page](<../../pages/reports/Reporting Page - PatchManagement.md>)
- [SavedReports page](<../../pages/reports/Reporting Page - SavedReports.md>)

## Key Behavior

- `Paper` with padding 3 and bottom margin 3, matching `ReportProgress` and `ReportToolbar` spacing so the page does not shift when one replaces another.
- Text uses `text.secondary`.

## Cleanup Notes

- None noted.

## Source

[client/src/components/report/EmptyState.tsx](../../../../client/src/components/report/EmptyState.tsx)
