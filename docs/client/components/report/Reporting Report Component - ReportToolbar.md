# ReportToolbar

> The card under a report title that holds its filters on the left and its action buttons pushed to the right.

## Purpose

Every report page has a row of selectors (agency, month, quarter) and a group of buttons (exports, refresh, generate). This component fixes the layout of that row so pages only supply the contents. It is in the report component layer and is the usual home for `AgencySelect`, `MonthYearSelect` and `ReportActions`.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | no | Filters and selectors, laid out left to right. |
| `actions` | `ReactNode` | no | Buttons, pushed to the right edge. |

## Uses

- `@mui/material` (`Paper`, `Box`)

## Used By

- Re-exported by [the report component barrel](<Reporting Report Component - index.md>)
- All nine report pages: [AgencyUtilization](<../../pages/reports/Reporting Page - AgencyUtilization.md>), [AnnualUtilization](<../../pages/reports/Reporting Page - AnnualUtilization.md>), [DeviceReports](<../../pages/reports/Reporting Page - DeviceReports.md>), [HddTickets](<../../pages/reports/Reporting Page - HddTickets.md>), [OfficeWindowsReports](<../../pages/reports/Reporting Page - OfficeWindowsReports.md>), [PatchManagement](<../../pages/reports/Reporting Page - PatchManagement.md>), [SavedReports](<../../pages/reports/Reporting Page - SavedReports.md>), [SlaPerformance](<../../pages/reports/Reporting Page - SlaPerformance.md>), [Tickets](<../../pages/reports/Reporting Page - Tickets.md>)

## Key Behavior

- A flex row with gap 2 and `flexWrap`, so on a narrow window the buttons wrap below the selectors instead of overflowing.
- The actions box uses `ml: 'auto'` to sit at the right edge, and is rendered only when `actions` is given.
- Padding 2 and bottom margin 3, matching the other report cards.

## Cleanup Notes

- None noted.

## Source

[client/src/components/report/ReportToolbar.tsx](../../../../client/src/components/report/ReportToolbar.tsx)
