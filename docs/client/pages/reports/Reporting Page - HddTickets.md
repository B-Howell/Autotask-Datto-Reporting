# HddTickets page

> The `/reports/hdd-tickets` page: devices the RMM keeps raising drive-space tickets for, per agency or across all agencies.

## Purpose

`HddTickets` is rendered at `/reports/hdd-tickets` ("HDD Storage Tickets"). It composes the
shared report chrome around `useHddTicketsData`, which is backed by the HDD tickets store, and
a single results table. The page's only logic is turning the dropdown value into a list of
Autotask company ids: a single agency, every member of a group, or an empty list meaning all
agencies.

Exports: "Export Excel" and "Save to app", both producing
`<Label> HDD Storage Tickets <M-D-YY>.xlsx` from `buildHddTicketsWorkbook`, where the label is
the agency or group name or `All Agencies`.

## Interface

`HddTickets` takes no props and is the module's default export. It keeps no local state; the
dropdown value and the generated label live in the store so they survive navigation.

## Uses

- [useHddTicketsData](<../../hooks/Reporting Hook - useHddTicketsData.md>),
  [useEffectiveAgencies](<../../hooks/Reporting Hook - useEffectiveAgencies.md>)
- [HddDeviceTable](<hddTickets/Reporting HDD Tickets - HddDeviceTable.md>),
  [excelExport](<hddTickets/Reporting HDD Tickets - excelExport.md>)
- Report components [ReportPage](<../../components/report/Reporting Report Component - ReportPage.md>),
  [ReportToolbar](<../../components/report/Reporting Report Component - ReportToolbar.md>),
  [ReportActions](<../../components/report/Reporting Report Component - ReportActions.md>),
  [AgencySelect](<../../components/report/Reporting Report Component - AgencySelect.md>) (with `ALL_AGENCIES`),
  [ReportProgress](<../../components/report/Reporting Report Component - ReportProgress.md>),
  [EmptyState](<../../components/report/Reporting Report Component - EmptyState.md>)
- [agencyGroups](<../../utils/Reporting Util - agencyGroups.md>) (`membersOf`, `resolveAgencyValue`),
  [dates](<../../utils/Reporting Util - dates.md>), [saveReport](<../../utils/Reporting Util - saveReport.md>)

## Used By

- [App](<../../Reporting Client - App.md>) mounts it as the `hdd-tickets` child of `/reports`.

## Key Behavior

- The agency dropdown has `includeAll`. Choosing the all-agencies sentinel calls
  `fetchHddTickets([], 'All Agencies')`; otherwise the value is resolved and the ids of
  `membersOf(agency)` are sent with the agency's name as the label.
- `hasResults` and `noResults` both require a finished run (`generatedLabel` set, not
  loading) and differ on `deviceCount`. The empty state names the label in its message.
- While loading, `ReportProgress` shows the hook's log lines under "Loading HDD ticket data".
- The export passes the current `devices` array straight to the workbook builder; saved-report
  metadata uses `reportType: 'hdd_tickets'`, `format: 'xlsx'` and the agency label as
  `agencyName`. No `agencyId` is recorded.
- The table heading uses `deviceCount` from the server rather than `devices.length`.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/HddTickets.tsx](../../../../client/src/pages/reports/HddTickets.tsx)
