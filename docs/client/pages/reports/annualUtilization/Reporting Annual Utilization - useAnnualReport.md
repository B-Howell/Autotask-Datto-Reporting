# Annual Utilization useAnnualReport

> The hook that runs the annual utilization job, loads the raw entries as part of it, and derives every figure the page renders from the store.

## Purpose

The annual page needs the report, the raw time entries for the same range, the user's rate overrides and agency selection, and the summary and detail computed from all of them. This hook assembles that from the annual store and the shared utilization fetcher so the page is composition only. It sits in the hook layer of the Annual Utilization folder.

The design decision is that the raw entries load inside the report job (through `useUtilizationData`'s `afterFetch`), so the status bar does not show the report as finished while its raw sheet is still arriving.

## Interface

Returns an object:

| Field | Description |
|---|---|
| `utilData`, `loading`, `error` | The report state from the store. |
| `generate(start, end, refresh)` | Runs the job for an inclusive range; `refresh` re-pulls from Autotask instead of the snapshot. |
| `rates` | Standard rates with the saved overrides applied. |
| `tab`, `setTab` | `''` for Summary, `RAW_TAB` for the raw sheet, otherwise the open agency's name. |
| `entries`, `entriesFor` | Raw entries (never null; an empty array stands in) and the `"<start>:<end>"` key they were loaded for. |
| `allCompanies`, `companies` | Every company in the report, and the selected subset (all when no selection is saved). |
| `departments` | The rated tiers present in the data. |
| `summary`, `detail`, `summaryRows` | Outputs of `buildSummary`, `buildDetail(tab)` and `summaryRowsOf`. |

## Uses

- `react` `useCallback`, `useEffect`, `useMemo`.
- `utilizationApi.fetchUtilizationEntries` from [utilization API](<../../../api/Reporting API - utilization.md>).
- [useUtilizationData](<../../../hooks/Reporting Hook - useUtilizationData.md>) with label `Annual Utilization` and route `/reports/annual-utilization`.
- [annualUtilizationStore](<../../../store/Reporting Store - annualUtilizationStore.md>).
- [tenantStore](<../../../store/Reporting Store - tenantStore.md>) for `tenant.ratedDepartments`.
- [departments](<Reporting Annual Utilization - departments.md>), [fiscalYear](<Reporting Annual Utilization - fiscalYear.md>), [summary](<Reporting Annual Utilization - summary.md>).

## Used By

- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>)

## Key Behavior

- `loadEntries` clears `entries` and `entriesFor`, fetches entries for `report.start` to `report.end` with the job's `AbortSignal`, then stores them with the range key. On failure it logs to the console and stores an empty array while leaving `entriesFor` null, so the totals still render and the page's export falls back to fetching entries itself.
- Cancelling the job aborts the entries request too, because the same signal is passed through.
- If the open tab is an agency that is no longer in `companies` (the user deselected it), an effect resets the tab to Summary. `RAW_TAB` is exempt.
- `companies` preserves the server's order and filters by the saved `Set`; an empty saved set yields no companies and therefore an empty summary.
- `summary`, `detail` and `summaryRows` are memoised on their inputs; changing a rate in the settings dialog recomputes the summary without a refetch.
- `rates` and `departments` take the tenant's rated departments from a store subscription and pass them into `withDefaultRates` and `departmentsIn`, so both memos recompute when the settings arrive after mount instead of keeping the defaults captured at first render.
- A constant `NO_ENTRIES` array is returned when the store holds `null` so consumers get a stable reference.

## Cleanup Notes

- `console.error` is the only reporting of a failed entries fetch; nothing surfaces it in the UI.
- No tests cover the tab reset effect or the entries fallback.

## Source

[client/src/pages/reports/annualUtilization/useAnnualReport.ts](../../../../../client/src/pages/reports/annualUtilization/useAnnualReport.ts)
