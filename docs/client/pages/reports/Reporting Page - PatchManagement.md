# PatchManagement page

> The `/reports/patch-management` page: patch status across one agency's workstations, with a donut summary and per-device table, exportable to PDF.

## Purpose

`PatchManagement` is rendered at `/reports/patch-management` ("Patch Management"). It reads
the summary, device list and selection from `usePatchManagementData` (backed by the patch
management store), turns the status summary into donut slices coloured by `STATUS_COLORS`,
and renders the meta line, summary card and workstation table. The donut's SVG is captured
to PNG at export time so the PDF carries the same chart the user saw.

Export: "Export to PDF" and "Save to app", named
`<Agency> Patch Management Summary <M-D-YY>.pdf` by `buildPatchPdf`.

## Interface

`PatchManagement` takes no props and is the module's default export. The only local value is
`chartRef`, a `RefObject<HTMLDivElement>` handed to the summary card for chart capture.

## Uses

- [usePatchManagementData](<../../hooks/Reporting Hook - usePatchManagementData.md>),
  [useEffectiveAgencies](<../../hooks/Reporting Hook - useEffectiveAgencies.md>)
- Patch modules: [PatchSummaryCard](<patchManagement/Reporting Patch Management - PatchSummaryCard.md>),
  [ReportMeta](<patchManagement/Reporting Patch Management - ReportMeta.md>),
  [WorkstationTable](<patchManagement/Reporting Patch Management - WorkstationTable.md>),
  [chartCapture](<patchManagement/Reporting Patch Management - chartCapture.md>),
  [pdfExport](<patchManagement/Reporting Patch Management - pdfExport.md>),
  [statusColors](<patchManagement/Reporting Patch Management - statusColors.md>)
- Report components [ReportPage](<../../components/report/Reporting Report Component - ReportPage.md>),
  [ReportToolbar](<../../components/report/Reporting Report Component - ReportToolbar.md>),
  [ReportActions](<../../components/report/Reporting Report Component - ReportActions.md>),
  [ReportScheduleDialog](<../../components/report/Reporting Report Component - ReportScheduleDialog.md>),
  [useScheduleDialog](<../../components/report/Reporting Report Component - useScheduleDialog.md>),
  `agencyPresetDraft` (documented under [useScheduleForm](<../../components/report/Reporting Report Component - useScheduleForm.md>)),
  [AgencySelect](<../../components/report/Reporting Report Component - AgencySelect.md>),
  [ReportProgress](<../../components/report/Reporting Report Component - ReportProgress.md>),
  [EmptyState](<../../components/report/Reporting Report Component - EmptyState.md>),
  [DonutChart](<../../components/report/Reporting Report Component - DonutChart.md>) (the `DonutSlice` type)
- [agencyGroups](<../../utils/Reporting Util - agencyGroups.md>) (`resolveAgencyValue`)
- [reportImages](<../../utils/Reporting Util - reportImages.md>) (`loadBrowserAssets`)

## Used By

- [App](<../../Reporting Client - App.md>) mounts it as the `patch-management` child of `/reports`.

## Key Behavior

- `total` is the sum of `summary[].count`; `slices` map each summary entry to
  `{ id: status, label, value: count, color: STATUS_COLORS[status] }`. Both are memoised on
  `summary`.
- Generate resolves the dropdown value and calls `fetchPatchManagement(agency)` with the
  hook's default `refresh = false`; there is no Refresh button on this page.
- `hasResults` requires not loading, a `generatedAgency` and `deviceCount > 0`. A finished run
  with zero devices shows an `EmptyState` naming the agency.
- Export semantics differ from the xlsx pages: `exportPdf(true)` downloads with
  `doc.save(filename)` and then also saves to the app; `exportPdf(false)` (Save to app) only
  saves. Both first run `captureSvgAsPng(chartRef.current)` and
  `loadBrowserAssets(agency.name)` in parallel, then call `buildPatchPdf` with the agency,
  summary, devices, total, chart image and assets. Saving goes through `savePatchPdf`.
- `ReportProgress` shows a 20-line log tail with the caption "Loading patch data".
- Schedule opens the dialog through `useScheduleDialog` and `ReportScheduleDialog`. Once `hasResults` the draft is
  `agencyPresetDraft('patch', generatedAgency)`, built from the store's generated agency rather than the dropdown so a changed selection
  cannot be scheduled under the report on screen.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/PatchManagement.tsx](../../../../client/src/pages/reports/PatchManagement.tsx)
