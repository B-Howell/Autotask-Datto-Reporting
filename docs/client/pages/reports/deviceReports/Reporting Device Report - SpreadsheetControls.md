# SpreadsheetControls

> The toolbar controls that only apply to the device spreadsheet view: the Columns button and the missing-field filter.

## Purpose

The column chooser and the missing-field filter belong to the spreadsheet view, not to the
Post Data view, and the page shows them together or not at all. This component keeps that
pair as one unit so the page states the condition once.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `onChooseColumns` | `() => void` | yes | Opens the column chooser. |
| `missingFilter` | `string` | yes | The filter value: `''`, `'all'` or an editable column label. |
| `fieldLabels` | `string[]` | yes | The editable column labels the filter offers. |
| `onFilterChange` | `(value: string) => void` | yes | Called with the new filter value. |

Default export: `SpreadsheetControls`.

## Uses

- `@mui/material` (`Button`) and the `ViewColumn` icon
- [MissingFieldFilter](<Reporting Device Report - MissingFieldFilter.md>)

## Used By

- [DeviceReports page](<../Reporting Page - DeviceReports.md>), rendered inside the toolbar while `hasData` and the spreadsheet tab is active

## Key Behavior

- Renders a fragment, so both controls sit in the toolbar's own flex row.
- Holds no state; the chooser's open flag stays on the page and the filter value in the device data hook.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/deviceReports/SpreadsheetControls.tsx](../../../../../client/src/pages/reports/deviceReports/SpreadsheetControls.tsx)
