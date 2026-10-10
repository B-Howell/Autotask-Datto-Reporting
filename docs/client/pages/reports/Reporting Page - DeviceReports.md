# DeviceReports page

> The `/reports/device` page: the merged Autotask and Datto device inventory for one agency, editable and exportable to xlsx.

## Purpose

`DeviceReports` is rendered at `/reports/device` (the "Device Reports" sidebar entry). It is the
composition root for the device inventory: it reads everything from `useReportingData` (backed
by the device data store), applies the user's saved column choice through `useVisibleColumns`
(backed by the device report store), and switches between the editable spreadsheet view and
the read-only "Post Data" view. The page owns only transient UI state: the active tab, the
dropdown value and whether the column chooser is open.

Exports offered: "Download XLSX" and "Save to app", both producing
`<Agency> Computer Inventory <M-D-YY>.xlsx` from `buildDeviceWorkbook`.

## Interface

`DeviceReports` takes no props and is the module's default export.

Local state: `activeTab: DeviceView` (`'spreadsheet'` or `'postdata'`), `agencyValue:
AgencyValue | ''`, `chooserOpen: boolean`.

## Uses

- [useReportingData](<../../hooks/Reporting Hook - useReportingData.md>) and
  [useEffectiveAgencies](<../../hooks/Reporting Hook - useEffectiveAgencies.md>)
- [agencyStore](<../../store/Reporting Store - agencyStore.md>),
  [themeStore](<../../store/Reporting Store - themeStore.md>)
- [useVisibleColumns](<deviceReports/Reporting Device Report - useVisibleColumns.md>),
  [ViewTabs](<deviceReports/Reporting Device Report - ViewTabs.md>),
  [SpreadsheetControls](<deviceReports/Reporting Device Report - SpreadsheetControls.md>),
  [useDeviceExport](<deviceReports/Reporting Device Report - useDeviceExport.md>),
  [presetDraft](<deviceReports/Reporting Device Report - presetDraft.md>)
- [DeviceSpreadsheet](<../../components/Reporting Component - DeviceSpreadsheet.md>),
  [PostData](<../../components/Reporting Component - PostData.md>),
  [ColumnChooser](<../../components/Reporting Component - ColumnChooser.md>)
- Report components [ReportPage](<../../components/report/Reporting Report Component - ReportPage.md>),
  [ReportToolbar](<../../components/report/Reporting Report Component - ReportToolbar.md>),
  [ReportActions](<../../components/report/Reporting Report Component - ReportActions.md>),
  [ReportScheduleDialog](<../../components/report/Reporting Report Component - ReportScheduleDialog.md>),
  [useScheduleDialog](<../../components/report/Reporting Report Component - useScheduleDialog.md>),
  [AgencySelect](<../../components/report/Reporting Report Component - AgencySelect.md>)
- [agencyGroups](<../../utils/Reporting Util - agencyGroups.md>)

## Used By

- [App](<../../Reporting Client - App.md>) mounts it as the `device` child of `/reports`.

## Key Behavior

- Generate resolves the dropdown value (a single agency or a group) with
  `resolveAgencyValue`, resets the tab to the spreadsheet, and calls `fetchDevices(agency)`.
  The button is disabled until a value is chosen.
- `hasData` requires a selected company, at least one row in `allRows` (unfiltered) and not
  loading. The view tabs and `SpreadsheetControls` (the Columns button and missing-field
  filter) render only then, and the controls only on the spreadsheet tab.
- Download XLSX and Save to app both call the function from `useDeviceExport`, which is
  given `exportColumns` (the visible columns minus the row-number column) and `rows` (the
  filtered set), so the workbook matches what the grid shows. Export buttons are hidden on
  the Post Data tab.
- A "Post N change(s) to Autotask" button appears in the toolbar whenever `editedCells` has
  entries; it calls `postChanges` from the hook.
- `DeviceSpreadsheet` receives the last log line as its loading caption, the theme mode as
  `isDark`, and the hook's `page`, `setPage` and `processRowUpdate`.
- The Post Data view always receives the full `columns`, not the user's visible subset.
- Schedule opens the dialog through `useScheduleDialog` and `ReportScheduleDialog`. The draft comes from
  `devicePresetDraft` once `hasData`: report type `devices`, the generated agency's dropdown
  value as the key (`'1000'` or `'group:Name'`), its name, and `options.columns` as the
  `exportColumns` header names (a column without a header is left out), so the columns
  hidden in the chooser and the order chosen there travel with the preset. Before a report exists the factory returns null and the
  button stays disabled with the exports. The missing-field filter is not stored: a
  scheduled run mails every row, so a schedule made while the filter is on sends the full
  inventory rather than the filtered list on screen.

## Cleanup Notes

- `agencyId: ''` for a group selection means a saved group export has no agency id; the
  server treats it as unknown.

## Source

[client/src/pages/reports/DeviceReports.tsx](../../../../client/src/pages/reports/DeviceReports.tsx)
