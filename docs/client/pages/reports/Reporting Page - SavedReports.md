# SavedReports page

> The `/reports/saved-reports` page: every report saved to the app, filterable by agency and type, viewable in place.

## Purpose

`SavedReports` is rendered at `/reports/saved-reports` ("Saved Reports"). It lists the files
the server stores when a report is exported or saved, lets the user narrow them by agency
name and report type, opens one in `SavedReportViewer`, and deletes or downloads through the
table's action buttons. Data comes from the local `useSavedReports` hook rather than a store,
because the list is cheap to refetch and nothing else reads it.

## Interface

`SavedReports` takes no props and is the module's default export.

Local state: `typeFilter: string` (a `REPORT_TYPE_LABELS` key or `''`), `agencyFilter:
string` (an agency name or `''`), `viewing: SavedReport | null`.

## Uses

- [useSavedReports](<savedReports/Reporting Saved Reports - useSavedReports.md>),
  [reportTypes](<savedReports/Reporting Saved Reports - reportTypes.md>),
  [SavedReportsTable](<savedReports/Reporting Saved Reports - SavedReportsTable.md>)
- [SavedReportViewer](<../../components/Reporting Component - SavedReportViewer.md>)
- Report components [ReportPage](<../../components/report/Reporting Report Component - ReportPage.md>),
  [ReportToolbar](<../../components/report/Reporting Report Component - ReportToolbar.md>),
  [EmptyState](<../../components/report/Reporting Report Component - EmptyState.md>)
- [API types](<../../api/Reporting API - types.md>) for `SavedReport`.

## Used By

- [App](<../../Reporting Client - App.md>) mounts it as the `saved-reports` child of `/reports`.

## Key Behavior

- The agency filter's options are the distinct, truthy `agency_name` values of the loaded
  reports, sorted with default string ordering; the list changes as reports are added or
  removed.
- The type filter's options come from `REPORT_TYPE_LABELS`, so a report whose type is not in
  that map can only be seen under "All types".
- Both filters are AND-ed; an empty string means no filter on that axis.
- The toolbar's only action is "Refresh", which calls the hook's `reload`; there is no
  Generate button because nothing is computed.
- Three body states: a spinner with "Loading", an `EmptyState` when the filtered list is
  empty (the copy says to use "Save to app" on a report), or the table.
- Clicking a row sets `viewing`; the viewer closes by setting it back to `null`. Delete goes
  straight to the hook's `remove` with no confirmation.
- The empty state does not distinguish "no reports at all" from "filters exclude everything".

## Cleanup Notes

- Delete has no confirmation.
- The empty-state copy is misleading when filters hide existing reports.

## Source

[client/src/pages/reports/SavedReports.tsx](../../../../client/src/pages/reports/SavedReports.tsx)
