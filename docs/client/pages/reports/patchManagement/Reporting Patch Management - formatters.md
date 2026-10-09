# Patch report formatters

> The one date formatter the patch report shares between its table and its PDF.

## Purpose

Datto reports a device's last reboot as an ISO timestamp, or nothing when the agent has never recorded one. Both the on-screen table and the PDF print it the same way, so the rule lives here once. Pure function, no React.

## Interface

- `formatReboot(iso: string or null or undefined): string`.

## Uses

- `dayjs`.

## Used By

- [WorkstationTable](<Reporting Patch Management - WorkstationTable.md>) (Last Reboot column).
- [pdfExport](<Reporting Patch Management - pdfExport.md>) (Last Reboot column of the device table).

## Key Behavior

- Returns the date as `YYYY.MM.DD` (dot-separated, matching the vendor's own report), in the browser's local time zone.
- Returns a single dash character (U+2014) for a missing value or a string dayjs cannot parse, so the cell is never empty and never shows "Invalid Date".
- The time of day is discarded.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/patchManagement/formatters.ts](../../../../../client/src/pages/reports/patchManagement/formatters.ts)
