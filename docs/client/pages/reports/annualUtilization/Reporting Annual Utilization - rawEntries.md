# Annual Utilization rawEntries

> The column definition for the raw time-entry sheet, the page size for its table, and a total-hours helper.

## Purpose

The annual workbook ships the individual time entries behind the totals so a client can audit them. The on-screen Datto tab, the spreadsheet grid and the Excel sheet all need the same seven columns in the same order with the same labels; this util is that single definition. It is a pure util in the Annual Utilization folder.

## Interface

| Export | Description |
|---|---|
| `RawColumn` | `{ key: keyof UtilizationEntry, label, wide?, align?: 'right' }`. |
| `RAW_COLUMNS` | In order: `date` "Date", `company` "Company Serviced", `ticket` "Ticket/Task #", `title` "Ticket/Task Title" (wide), `resource` "Resource", `hours` "Hours Worked" (right), `role` "Role". |
| `ENTRY_ROWS_PER_PAGE` | `100`. |
| `totalHours(entries)` | Sum of `hours` across entries, treating a missing value as 0. |

## Uses

- `UtilizationEntry` type from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [RawEntriesTable](<Reporting Annual Utilization - RawEntriesTable.md>)
- [gridModels](<Reporting Annual Utilization - gridModels.md>)
- [excelExport](<Reporting Annual Utilization - excelExport.md>)

## Key Behavior

- `wide` marks the title column: the table truncates it with an ellipsis, the grid gives it `flex: 2` and a 320px minimum, and the workbook gives it the widest column.
- `align: 'right'` marks the only numeric column; the grid types it `number` and the workbook applies the hours number format to it (column 6).
- `role` is the Autotask role the entry was booked under, the raw value the server maps to a billing tier; the raw sheet shows the role, not the tier.
- Column labels are the exact strings written to the Excel header row, so changing one here changes the delivered workbook.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/annualUtilization/rawEntries.ts](../../../../../client/src/pages/reports/annualUtilization/rawEntries.ts)
