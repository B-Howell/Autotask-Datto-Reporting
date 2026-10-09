# useSlaFilters

> Client-side multi-select filter state over the fetched SLA tickets, with the filter definitions the bar renders from.

## Purpose

The server returns a month of tickets for every company; narrowing by company, queue, priority or resource is done in the browser so changing a filter is instant and needs no refetch. This hook owns the selections, derives the option lists from the tickets, and produces the filtered list that feeds the grid, all three pivots and the Excel export. Page-level hook with `useState` and `useMemo`.

## Interface

- `SLA_FILTERS`: `[{ key: 'company', label: 'Company', field: 'companyName' }, { key: 'queue', ... }, { key: 'priority', ... }, { key: 'resource', ... }]`.
- `SlaFilterKey`: `'company' or 'queue' or 'priority' or 'resource'`; `SlaFilterValues`: `Record<SlaFilterKey, string[]>`.
- `useSlaFilters(tickets: SlaTicket[] or undefined)` returns:

| Member | Description |
|---|---|
| `values` | Current selection per key; empty array means no filter. |
| `options` | Sorted distinct non-empty values per key, derived from `tickets`. |
| `filteredTickets` | Tickets passing every active filter; `[]` while `tickets` is undefined. |
| `hasActive` | True when any key has a selection. |
| `setFilter(key, selected)` | Replace one key's selection. |
| `clear()` | Reset all keys. |

## Uses

- `react` (`useState`, `useMemo`); `SlaTicket` type from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [SlaPerformance page](<../Reporting Page - SlaPerformance.md>), which passes `slaData?.tickets` and feeds `filteredTickets` to the grid, pivots and export.
- [SlaFilters](<Reporting SLA - SlaFilters.md>) imports `SLA_FILTERS` and the types.

## Key Behavior

- Options are computed with `String(value ?? '')`, blanks removed, de-duplicated through a `Set` and sorted with the default string sort; they are memoised on `tickets` only, so they never shrink as other filters are applied.
- Filtering is a conjunction across keys and a disjunction within a key: a ticket passes when, for every key, the selection is empty or contains `String(ticket[field])`.
- Selections are not reset when a new month is fetched. A company selected for one month that has no tickets in the next month leaves `filteredTickets` empty until Clear is pressed; `hasActive` keeps the Clear button visible in that case.
- The page's "n tickets across m companies" caption counts `filteredTickets`, so it reflects the filters, while the company count comes from the unfiltered response.

## Cleanup Notes

- Filter values do not reset on refetch (see above); a `useEffect` keyed on the response could clear them.

## Source

[client/src/pages/reports/slaPerformance/useSlaFilters.ts](../../../../../client/src/pages/reports/slaPerformance/useSlaFilters.ts)
