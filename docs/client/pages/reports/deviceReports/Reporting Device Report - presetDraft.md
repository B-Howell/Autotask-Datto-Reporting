# Device Report presetDraft

> Builds the `PresetDraft` the device page hands to the Schedule dialog: the agency on screen and the visible columns by header name.

## Purpose

A scheduled device inventory should look like the one the user was looking at when they
pressed Schedule. The renderer selects workbook columns by header name, so this module turns
the page's `exportColumns` (the chooser's visible set, in its order, without the row-number
column) into that list. Keeping the factory out of the page leaves `DeviceReports` to
composition and lets the mapping be tested without rendering.

## Interface

`devicePresetDraft({ selectedCompany, agencyName, exportColumns }): PresetDraft | null`

| Input | Type | Description |
|---|---|---|
| `selectedCompany` | `AgencyValue \| null` | The generated agency's dropdown value from the device data store; null before a run. |
| `agencyName` | `string` | Display name for the preset's default name and subject. |
| `exportColumns` | `GridColDef<DeviceRow>[]` | The visible columns in display order, as the workbook export receives them. |

Returns null when `selectedCompany` is null; otherwise `{ reportType: 'devices', agencyKey:
String(selectedCompany), agencyName, options: { columns } }` where `columns` is each column's
`headerName` (an empty string when a column has none).

## Uses

- `PresetDraft` from [the report component barrel](<../../../components/report/Reporting Report Component - index.md>)
- `AgencyValue` from the API types and `GridColDef` from `@mui/x-data-grid`
- [sheetRows](<Reporting Device Report - sheetRows.md>) for the `DeviceRow` type

## Used By

- [DeviceReports page](<../Reporting Page - DeviceReports.md>) inside its `useScheduleDialog` factory

## Key Behavior

- The agency key is the dropdown value as a string, `'1000'` for a company or `'group:Name'`
  for a group, which is what the server's preset validation and the scheduled run expect.
- Column order is the chooser's order, not the schema's, so a reordered sheet is mailed
  reordered.
- A column without a `headerName` contributes `''`; the renderer then finds no such header and
  drops it, which matches what the on-screen export does with it.
- Only columns are stored. The page's missing-field filter has no preset option, so a
  scheduled run always covers every row.

## Cleanup Notes

- Covered by `presetDrafts.test.ts` in the parent folder.

## Source

[client/src/pages/reports/deviceReports/presetDraft.ts](../../../../../client/src/pages/reports/deviceReports/presetDraft.ts)
