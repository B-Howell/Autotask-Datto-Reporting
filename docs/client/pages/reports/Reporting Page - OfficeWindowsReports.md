# OfficeWindowsReports page

> The `/reports/office-windows` page: Office products and Windows versions installed per agency, with licence counts entered against them, exportable to Word and PDF.

## Purpose

`OfficeWindowsReports` is rendered at `/reports/office-windows` ("Office / Windows"). It
fetches the OS and Office breakdowns through `useOfficeWindowsData` (backed by the Office
Windows store), groups Office installs by SKU with the user's visible-SKU settings, and
renders two tables where licence counts can be typed in. Manual inputs (licences, available
counts, visible SKUs) are handled by `useManualInputs`, keyed per agency, so they persist
between runs; the device-list modal is handled by `useDeviceModal`.

Exports: "Export to Word", "Export to PDF" and "Save to app" (Word), named
`<Agency> Office and Windows Installs <M-D-YY>.docx` or `.pdf` by `reportFilename`.

## Interface

`OfficeWindowsReports` takes no props and is the module's default export.

Local state: `companyValue: AgencyValue | ''`, `showLicenses: boolean` (default true),
`settingsOpen: boolean`.

## Uses

- [useOfficeWindowsData](<../../hooks/Reporting Hook - useOfficeWindowsData.md>),
  [useEffectiveAgencies](<../../hooks/Reporting Hook - useEffectiveAgencies.md>),
  [agencyStore](<../../store/Reporting Store - agencyStore.md>)
- Office Windows modules: [useManualInputs](<officeWindows/Reporting Office Windows - useManualInputs.md>),
  [useDeviceModal](<officeWindows/Reporting Office Windows - useDeviceModal.md>),
  [useOfficeWindowsExports](<officeWindows/Reporting Office Windows - useOfficeWindowsExports.md>),
  [skus](<officeWindows/Reporting Office Windows - skus.md>),
  [reportRows](<officeWindows/Reporting Office Windows - reportRows.md>),
  [selectedAgency](<officeWindows/Reporting Office Windows - selectedAgency.md>),
  [OfficeTable](<officeWindows/Reporting Office Windows - OfficeTable.md>),
  [WindowsTable](<officeWindows/Reporting Office Windows - WindowsTable.md>),
  [ReportHeading](<officeWindows/Reporting Office Windows - ReportHeading.md>),
  [SkuSettingsButton](<officeWindows/Reporting Office Windows - SkuSettingsButton.md>),
  [SkuSettingsDialog](<officeWindows/Reporting Office Windows - SkuSettingsDialog.md>),
  [DeviceListDialog](<officeWindows/Reporting Office Windows - DeviceListDialog.md>)
- Report components [ReportPage](<../../components/report/Reporting Report Component - ReportPage.md>),
  [ReportToolbar](<../../components/report/Reporting Report Component - ReportToolbar.md>),
  [ReportActions](<../../components/report/Reporting Report Component - ReportActions.md>),
  [AgencySelect](<../../components/report/Reporting Report Component - AgencySelect.md>),
  [ReportProgress](<../../components/report/Reporting Report Component - ReportProgress.md>)
- [agencyGroups](<../../utils/Reporting Util - agencyGroups.md>) (`resolveAgencyValue`, `valueFor`)

## Used By

- [App](<../../Reporting Client - App.md>) mounts it as the `office-windows` child of `/reports`.

## Key Behavior

- Generate resolves the dropdown value, calls `manual.loadFor(String(valueFor(agency)))` so
  the manual inputs for that agency (or group key) are loaded before the fetch, then
  `fetchOfficeWindowsBreakdown(agency)`.
- `selectedCompany` is derived from the store's `selectedSite` through
  `reportedAgencyForSite`, so after navigation the heading names the agency the data belongs
  to rather than the dropdown's current value.
- `officeRows` is `groupOfficeInstalls(officeBreakdown, manual.visibleSkus)` memoised on both;
  `osRows` is `installedOnly(osBreakdown)` recomputed each render.
- `hasResults` needs not loading, a resolved company, and at least one row in either
  breakdown. The Office table renders only when `officeBreakdown` has rows and the Windows
  table only when `osRows` has rows.
- The SKU settings button is enabled only once `manual.agencyKey` is set, that is after the
  first Generate.
- The export hook receives the two breakdowns as `{ windows_installs, office_installs }` and
  `manual.values`, the agency's saved map, rather than the on-screen rows; both tables read
  their licence figures from that same map.
- `showLicenses` is passed to both tables and to the export hook, so hiding the licence
  columns on screen also hides them in the Word and PDF output.
- `ReportProgress` shows a 20-line log tail with the caption "Loading...".

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/OfficeWindowsReports.tsx](../../../../client/src/pages/reports/OfficeWindowsReports.tsx)
