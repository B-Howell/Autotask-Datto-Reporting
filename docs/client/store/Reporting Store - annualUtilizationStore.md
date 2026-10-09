# annualUtilizationStore

> The annual utilization report's result plus the persisted preferences (selected companies, billing rates, view mode) and the raw-entry tab state.

## Purpose

The annual utilization report has more state than the other reports: the report itself, the raw time entries fetched alongside it, which tab is open, and three user preferences that should survive a reload. This store holds all of it. It is in the store layer and extends the shared `ReportDataState` shape by hand instead of using the factory, because of the extra fields.

The decision recorded in the source is that the raw entries and the open tab belong to the report, not the page, so navigating away mid-read does not lose them.

## Interface

Not created by the factory. It implements `ReportDataState<UtilizationReport>` manually and adds:

| Field / action | Type | Persisted key | Description |
|---|---|---|---|
| `data`, `loading`, `error`, `logs` + setters | `ReportDataState` | none | Same as the factory shape. |
| `selectedCompanies` | `Set<string> \| null` | `annualUtil_selectedCompanies` | null means no preference saved: show every company. |
| `rates` | `Rates` (`Record<string, number \| string>`) | `annualUtil_rates` | Billing rate per department, keyed by department name. |
| `viewMode` | `'table' \| 'spreadsheet'` | `annualUtil_viewMode` | Which rendering the page shows. |
| `entries` | `UtilizationEntry[] \| null` | none | Raw time entries for the current report. |
| `entriesFor` | `string \| null` | none | `start:end` of the report the entries belong to. |
| `tab` | `string` | none | Empty string is the summary tab; otherwise an agency name or the raw tab key. |
| `setSelectedCompanies`, `setRates`, `setViewMode` | setters | yes | Write through to `localStorage`, then update state. |
| `setEntries`, `setEntriesFor`, `setTab` | setters | none | Plain replacements. |

Exports: the `ViewMode` type and the default store hook. The `Rates` type of the `rates` state is defined in [departments](<../pages/reports/annualUtilization/Reporting Annual Utilization - departments.md>) and imported from there by every consumer.

## Uses

- `zustand` (`create`)
- [reportDataStore](<Reporting Store - reportDataStore.md>) for `applyUpdater`, `ReportDataState`, `Updater`
- [API types](<../api/Reporting API - types.md>) for `UtilizationEntry`, `UtilizationReport`
- [departments](<../pages/reports/annualUtilization/Reporting Annual Utilization - departments.md>) for the `Rates` type
- `localStorage`

## Used By

- [AnnualUtilization page](<../pages/reports/Reporting Page - AnnualUtilization.md>)
- [useAnnualReport](<../pages/reports/annualUtilization/Reporting Annual Utilization - useAnnualReport.md>), which passes this store to `useUtilizationData` and writes `entries` from inside the job
- [ReportSettingsDialog](<../pages/reports/annualUtilization/Reporting Annual Utilization - ReportSettingsDialog.md>) for the `ViewMode` type

## Key Behavior

- Preferences are read once at module load: `selectedCompanies` from a JSON string array (turned into a `Set`), `rates` from JSON (defaulting to `{}`), `viewMode` from a raw string that is `'spreadsheet'` only if stored exactly so.
- `setSelectedCompanies(null)` removes the storage key rather than storing `null`, so "no preference" and "every company" stay the same state.
- `readJson` and `writeJson` wrap storage access in try/catch; a failure means the preference lasts for the session only.
- `setLogs` goes through `applyUpdater`, so callers can append with `prev => [...prev, ...lines]`.
- `entriesFor` lets the page tell whether the entries on hand match the report on hand, since both are set independently.

## Cleanup Notes

- `loadViewMode`, `setViewMode` and the `removeItem` branch of `setSelectedCompanies` touch `localStorage` directly without the try/catch that `readJson` and `writeJson` provide, so a blocked storage API would throw from those three paths but not the others.

## Source

[client/src/store/annualUtilizationStore.ts](../../../client/src/store/annualUtilizationStore.ts)
