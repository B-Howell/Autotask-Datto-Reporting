# PostData

> Table of end-user devices whose editable Autotask fields are still blank, shown under the device grid.

## Purpose

The point of the editable device grid is to fill in Primary User or Role, Purchase Date, Department and Location before posting back to Autotask. This component gives a quick list of which laptops and desktops still have one of those blank, so the user can see what remains without scrolling the grid. It is in the component layer and is purely derived from the props it is given.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `columns` | `GridColDef<DeviceRow>[]` | yes | Grid columns; used to find fields by header name. |
| `rows` | `DeviceRow[]` | yes | Rows to scan. |

## Uses

- `@mui/material` table components
- `@mui/x-data-grid` types
- [sheetRows](<../pages/reports/deviceReports/Reporting Device Report - sheetRows.md>) for the `DeviceRow` type

## Used By

- [DeviceReports page](<../pages/reports/Reporting Page - DeviceReports.md>)

## Key Behavior

- Resolves fields by header name at render: `Reference Name` for the device name, `Product` for the type, and the four `REQUIRED` headers for the checked columns. A header the schema lacks yields an undefined field, which reads as an empty cell.
- A row is listed when its `Product` is exactly `Laptop` or `Desktop` and any required cell is empty after `String(...)` coercion.
- Renders the device name plus the four required columns, one row per qualifying device; renders an empty table (with heading) when nothing qualifies.
- Not memoised; the filter runs on every render of the page.

## Cleanup Notes

- `REQUIRED` duplicates `EDITABLE_HEADERS` in [sheetRows](<../pages/reports/deviceReports/Reporting Device Report - sheetRows.md>), and the type test differs from `useReportingData`'s (`Product` by header versus `col0` by position; no `Tablet`), so the two "missing" views can disagree.

## Source

[client/src/components/PostData.tsx](../../../client/src/components/PostData.tsx)
