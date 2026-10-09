# Annual Utilization ReportSettingsDialog

> The settings dialog for the annual report: table or spreadsheet view, the hourly rate per billing tier, and which agencies appear as tabs and in the export.

## Purpose

Three preferences shape the annual report without changing its data: how it is viewed, what each tier costs, and which agencies are included. This dialog edits all three through callbacks and holds no state of its own; the page wires it to the annual store, which persists the values in `localStorage`. It is composed of three small internal field components and the shared `SettingsDialog` shell. It lives in the component layer of the Annual Utilization folder.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `open` | `boolean` | yes | Whether the dialog is shown. |
| `onClose` | `() => void` | yes | Close handler passed to the shell. |
| `viewMode` | `ViewMode` | yes | `'table'` or `'spreadsheet'`. |
| `onViewModeChange` | `(mode: ViewMode) => void` | yes | Called on radio change. |
| `rates` | `Rates` | yes | Current rates, defaults already applied. |
| `onRatesChange` | `(rates: Rates) => void` | yes | Called with the full map on every keystroke. |
| `allCompanies` | `string[]` | yes | Every company in the report. |
| `selectedCompanies` | `Set<string> \| null` | yes | `null` means every company is shown. |
| `onSelectedCompaniesChange` | `(selected: Set<string>) => void` | yes | Called with the new set. |

Internal components: `ViewModeField` (radio group), `RateFields` (one text field per rated department in the tenant store), `CompanyChecklist` (checkbox list with Select all / Deselect all).

## Uses

- `@mui/material` form controls, `List`, `Checkbox`, `Radio`, `TextField`, `Button`.
- [SettingsDialog](<../../../components/report/Reporting Report Component - SettingsDialog.md>) as the dialog shell (title "Report Settings", `maxWidth="xs"`).
- [tenantStore](<../../../store/Reporting Store - tenantStore.md>) for `tenant.ratedDepartments`, subscribed inside `RateFields` so the list follows a tenant load that lands after the dialog's first render.
- `Rates`, `ViewMode` types from [annualUtilizationStore](<../../../store/Reporting Store - annualUtilizationStore.md>).

## Used By

- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>)

## Key Behavior

- Rate fields show `rates[department] ?? d.rate` with `$` and `/hr` adornments, right-aligned, `inputMode="numeric"`. The raw input string is stored as-is, which is why `Rates` allows string values; `buildSummary` coerces with `Number(...) || 0`, so a half-typed or blank value prices that tier at zero until corrected.
- Every keystroke calls `onRatesChange` with the whole map; the store writes it to `localStorage` each time.
- The checklist treats `null` as "all checked". Toggling one box materialises a `Set` from `selected ?? allCompanies` first, so the first deselection keeps every other company.
- "Deselect all" produces an empty set, which yields a report with no agency tabs, no summary rows and no agency sheets in the export.
- The dialog never calls `onSelectedCompaniesChange(null)`; once a selection exists it stays explicit until storage is cleared.
- The rate list always shows every department the tenant settings name (the five defaults until they load), including ones absent from the current report's data.

## Cleanup Notes

- There is no way from the dialog to return to the "no preference" (`null`) state; "Select all" saves an explicit full set instead.
- Non-numeric rate input is accepted silently.

## Source

[client/src/pages/reports/annualUtilization/ReportSettingsDialog.tsx](../../../../../client/src/pages/reports/annualUtilization/ReportSettingsDialog.tsx)
