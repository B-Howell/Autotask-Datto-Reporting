# HDD tickets excelExport

> Builds the HDD storage tickets workbook: one "HDD Tickets" sheet, one row per device, blue filterable header.

## Purpose

This module writes the HDD tickets device list to an `.xlsx` blob. It is the simplest export
in the client and a good reference for the shared Excel helpers: fixed columns, a styled
header and an auto-filter, nothing else.

## Interface

```ts
export async function buildHddTicketsWorkbook(devices: HddTicketDevice[]): Promise<Blob>
```

Returns a Blob with the xlsx MIME type. `COLUMNS` is a private constant.

## Uses

- `exceljs`, loaded lazily through `loadExcel`.
- [excel util](<../../../utils/Reporting Util - excel.md>) for `loadExcel`, `XLSX_HEADER_FILL`
  and `workbookToBlob`.
- [API types](<../../../api/Reporting API - types.md>) for `HddTicketDevice`.

## Used By

- [HddTickets page](<../Reporting Page - HddTickets.md>) from `handleExport`, which names the
  file `<Label> HDD Storage Tickets <M-D-YY>.xlsx`.

## Key Behavior

Sheet layout:

| Column | Header | Key | Width |
|---|---|---|---|
| A | Device Name | `device_name` | 26 |
| B | HDD Tickets | `ticket_count` | 14 |
| C | Last User | `last_user` | 22 |
| D | C: Drive Size (GB) | `c_drive_gb` | 18 |

- Worksheet name `HDD Tickets`. Rows are added in the order of `devices`.
- A null `c_drive_gb` is written as an empty string, so the cell is blank rather than `null`.
  The header carries the unit, so the value is a plain number.
- Row 1 is styled inline rather than with `styleHeaderRow`: solid `XLSX_HEADER_FILL`, bold
  white font, horizontally centred. No border, no row height, no wrapping.
- An auto-filter spans row 1 across the four columns. The header row is not frozen.
- Body rows are unstyled; there are no bands, borders or totals.

## Cleanup Notes

- The header styling duplicates part of `styleHeaderRow` with slightly different alignment;
  using the shared helper would make this sheet match the other workbooks.

## Source

[client/src/pages/reports/hddTickets/excelExport.ts](../../../../../client/src/pages/reports/hddTickets/excelExport.ts)
