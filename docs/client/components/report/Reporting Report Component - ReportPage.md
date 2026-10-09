# ReportPage

> Page frame shared by every report: a centred title above the content.

## Purpose

Every report page starts the same way, and the title style should not drift between them. This component is that frame. It is in the report component layer and is the outermost element of each report page.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | yes | Page heading. |
| `children` | `ReactNode` | yes | Page content. |

## Uses

- `@mui/material` (`Box`, `Typography`)

## Used By

- Re-exported by [the report component barrel](<Reporting Report Component - index.md>)
- All nine report pages: [AgencyUtilization](<../../pages/reports/Reporting Page - AgencyUtilization.md>), [AnnualUtilization](<../../pages/reports/Reporting Page - AnnualUtilization.md>), [DeviceReports](<../../pages/reports/Reporting Page - DeviceReports.md>), [HddTickets](<../../pages/reports/Reporting Page - HddTickets.md>), [OfficeWindowsReports](<../../pages/reports/Reporting Page - OfficeWindowsReports.md>), [PatchManagement](<../../pages/reports/Reporting Page - PatchManagement.md>), [SavedReports](<../../pages/reports/Reporting Page - SavedReports.md>), [SlaPerformance](<../../pages/reports/Reporting Page - SlaPerformance.md>), [Tickets](<../../pages/reports/Reporting Page - Tickets.md>)

## Key Behavior

- `h5` title, centred, with a bottom margin of 3; no other styling or layout, so the page's own toolbar and cards control the rest.
- The outer `Box` has no padding; page padding comes from the main content area in `App`.

## Cleanup Notes

- None noted.

## Source

[client/src/components/report/ReportPage.tsx](../../../../client/src/components/report/ReportPage.tsx)
