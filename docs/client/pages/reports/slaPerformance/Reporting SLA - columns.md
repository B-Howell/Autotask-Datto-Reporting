# SLA columns

> The single column definition for the SLA ticket list, shared by the on-screen grid and the Excel "Report" sheet.

## Purpose

The raw ticket list appears twice, in the DataGrid and in the first worksheet of the export, and the two must show the same fields in the same order with the same labels. This module is that definition: an ordered array of `SlaColumn` entries keyed by `SlaTicket` field, with flags that tell each consumer how to type the column. Constants only.

## Interface

- `SlaColumn`: `{ key: keyof SlaTicket; label: string; width: number; numeric?: boolean; met?: boolean }`.
- `COLUMNS: SlaColumn[]`, 21 entries in display order.
- `DATE_KEYS: Set<keyof SlaTicket>`: `createDate`, `slaStartDate`, `completeDate`.

## Uses

- `SlaTicket` type from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [RawDataGrid](<Reporting SLA - RawDataGrid.md>) (`COLUMNS`, `SlaColumn`).
- [excelExport](<Reporting SLA - excelExport.md>) (`COLUMNS`, `DATE_KEYS`, `SlaColumn`).

## Key Behavior

- Order: Ticket Number, Title, Company, Create Date, SLA Start Date, Complete Date, Resource, Queue, Status, Priority, Ticket Type, Ticket Category, Issue Type, Sub-Issue Type, First Response (Hours), First Response Met, Resolution Plan (Hours), Resolution Plan Met, Resolved (Hours), Resolved Met, Total Waiting Customer Hours.
- `numeric` marks the four hour columns; `met` marks the three boolean SLA flags. The grid uses these to pick the column type and centre alignment; the export uses them for number formats and the Yes/No text.
- `width` is in pixels and applies to the grid only; the export derives worksheet widths from the label length instead.
- `DATE_KEYS` exists because the server sends dates as `MM/DD/YYYY` strings; the grid shows them as text, while the export parses them to real dates so Excel can sort and filter by date.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/slaPerformance/columns.ts](../../../../../client/src/pages/reports/slaPerformance/columns.ts)
