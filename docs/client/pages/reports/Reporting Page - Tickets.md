# Tickets page

> The `/reports/tickets` page: a month of tickets for one agency, summarised in five cards.

## Purpose

`Tickets` is rendered at `/reports/tickets` ("Ticket Reports"). It takes an agency and a
month/year, calls `fetchTicketDetails` from `useTicketData` (backed by the ticket data store),
and lays the response out as breakdown cards for source, priority and issue type, plus the
average-time-to-repair and first-call-resolution cards. It has no export; the report is read
on screen.

One behaviour sets it apart from the other pages: picking an agency runs the report at once,
and the Generate button only re-runs it for a changed month or year.

## Interface

`Tickets` takes no props and is the module's default export.

Local state: `month: MonthName` (defaults to the current month), `year: number` (current
year), `agencyValue: AgencyValue | ''`.

## Uses

- [useTicketData](<../../hooks/Reporting Hook - useTicketData.md>),
  [useEffectiveAgencies](<../../hooks/Reporting Hook - useEffectiveAgencies.md>)
- [agencyStore](<../../store/Reporting Store - agencyStore.md>) for `agencyNameFor`
- [BreakdownCard](<tickets/Reporting Tickets - BreakdownCard.md>),
  [RepairTimeCard](<tickets/Reporting Tickets - RepairTimeCard.md>),
  [FirstCallResolutionCard](<tickets/Reporting Tickets - FirstCallResolutionCard.md>)
- Report components [ReportPage](<../../components/report/Reporting Report Component - ReportPage.md>),
  [ReportToolbar](<../../components/report/Reporting Report Component - ReportToolbar.md>),
  [ReportActions](<../../components/report/Reporting Report Component - ReportActions.md>),
  [AgencySelect](<../../components/report/Reporting Report Component - AgencySelect.md>),
  [MonthYearSelect](<../../components/report/Reporting Report Component - MonthYearSelect.md>),
  [ErrorBanner](<../../components/report/Reporting Report Component - ErrorBanner.md>)
- [agencyGroups](<../../utils/Reporting Util - agencyGroups.md>), [dates](<../../utils/Reporting Util - dates.md>) (`MONTH_NAMES`)

## Used By

- [App](<../../Reporting Client - App.md>) mounts it as the `tickets` child of `/reports`.

## Key Behavior

- `fetchFor` resolves the dropdown value and calls `fetchTicketDetails(agency, year,
  monthIndex + 1)`; the month is sent as a 1-based number derived from `MONTH_NAMES`.
- `handleAgencyChange` sets the value and immediately fetches; Generate calls `fetchFor`
  with the current value and is disabled while no agency is chosen.
- `countRows` turns a `Record<string, number>` breakdown into `{ key, value }` rows in object
  insertion order; no sorting is applied on the client.
- `showResults` requires data, a selected company in the store, not loading and no error.
  The heading reads `<Company> Tickets for <Month> <Year>: <N> Tickets`.
- The repair-time card renders only when `avg_time_to_repair` is truthy; the first-call card
  always renders and handles a missing value itself.
- Card order is Source, Priority, Average Time to Repair, First Call Resolution, Issue Type,
  in a wrapping flex row.
- Loading shows an inline spinner and "Loading ticket data..." rather than `ReportProgress`,
  so there is no log tail for this report.

## Cleanup Notes

- `month` and `year` are local state while `ticketData` lives in the store. Navigating away
  and back resets the picker to the current month but keeps the old result, so the heading
  can name a month other than the one the cards describe until Generate is pressed again.

## Source

[client/src/pages/reports/Tickets.tsx](../../../../client/src/pages/reports/Tickets.tsx)
