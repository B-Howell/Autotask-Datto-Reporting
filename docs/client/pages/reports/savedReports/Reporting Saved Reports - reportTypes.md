# Saved report reportTypes

> The display labels for each saved `report_type` and the chip colour for each file format.

## Purpose

The server stores a short machine key for a saved report's type (`devices`, `sla`, and so on)
and its format (`xlsx`, `docx`, `pdf`). This module maps those keys to the labels and colours
the Saved Reports page shows. It is the one place to update when a new report type starts
saving files, and it doubles as the option list for the page's type filter.

## Interface

| Export | Type | Content |
|---|---|---|
| `REPORT_TYPE_LABELS` | `Record<string, string>` | `devices`, `office_windows`, `patch`, `sla`, `utilization`, `annual_utilization`, `tickets`, `hdd_tickets` to their human labels. |
| `FORMAT_COLORS` | `Record<string, ChipProps['color']>` | `pdf` to `error`, `docx` to `info`, `xlsx` to `success`. |

## Uses

- The `ChipProps` type from Material UI.

## Used By

- [SavedReports page](<../Reporting Page - SavedReports.md>) builds the type filter from
  `REPORT_TYPE_LABELS`.
- [SavedReportsTable](<Reporting Saved Reports - SavedReportsTable.md>) uses both maps.

## Key Behavior

- Labels: Device Report, Office / Windows, Patch Management, SLA Performance, Quarterly
  Utilization, Annual Utilization, Ticket Report, HDD Storage Tickets.
- The keys must match the `reportType` strings the pages pass to `deliverBlob` metadata
  (`devices`, `office_windows`, `patch`, `sla`, `utilization`, `annual_utilization`,
  `hdd_tickets`). A mismatch shows the raw key in the table and hides the report from the
  type filter.
- `tickets` has a label although the Ticket Reports page has no export; it is harmless and
  ready if one is added.
- An unmapped format gets the chip's `default` colour in the table.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/savedReports/reportTypes.ts](../../../../../client/src/pages/reports/savedReports/reportTypes.ts)
