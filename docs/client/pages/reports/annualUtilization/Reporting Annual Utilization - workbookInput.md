# Annual Utilization workbookInput

> Assembles the annual workbook's input from the report, its raw entries and the rated departments, choosing the agencies and pricing the summary, with no React or store dependency.

## Purpose

The annual workbook needs the report, the raw entries, the departments present, the agencies to print and a `Summary` priced at the tier rates. `useAnnualReport` used to compute the companies and summary for the screen and the page reassembled them for the export; a headless renderer needs the same assembly from the API responses alone. This module is that assembly, called by the hook for the screen and by the renderer for the file. It is a pure util in the Annual Utilization folder.

## Interface

| Export | Description |
|---|---|
| `AnnualWorkbookOptions` | `{ companies?, rates? }`. `companies` restricts the output to those names (null or absent means every agency); `rates` are overrides by department laid over each department's standard rate. |
| `annualWorkbookInput(utilData, entries, departments, options?)` | `AnnualWorkbookInput`: `{ utilData, summary, companies, departments, entries }`. |

`departments` is the list the caller already narrowed with `departmentsIn`, so only tiers present in the data get a summary row.

## Uses

- [summary](<Reporting Annual Utilization - summary.md>) for `buildSummary`.
- `RatedDepartment` and `Rates` types from [departments](<Reporting Annual Utilization - departments.md>); `AnnualWorkbookInput` type from [excelExport](<Reporting Annual Utilization - excelExport.md>).
- `UtilizationEntry`, `UtilizationReport` types from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [useAnnualReport](<Reporting Annual Utilization - useAnnualReport.md>), which passes the saved company selection and rate overrides and reads `companies` and `summary` back for the tables.
- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>), which hands the hook's result to `buildAnnualWorkbook`.
- [client/src/pages/reports/annualUtilization/workbookInput.test.ts](../../../../../client/src/pages/reports/annualUtilization/workbookInput.test.ts).

## Key Behavior

- Company order is the report's order, which the server sorts; a `companies` option filters that list rather than reordering it, and names the report does not have are ignored. An empty option list therefore yields no companies and an empty summary, the same as deselecting every agency on screen.
- With no `rates` option the summary uses each department's own `rate`; an override is applied by `buildSummary` as `Number(override) || 0`, so string input from the settings dialog is accepted.
- The report, entries and departments are passed through by reference; only `companies` (when filtered) and `summary` are new objects.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/annualUtilization/workbookInput.ts](../../../../../client/src/pages/reports/annualUtilization/workbookInput.ts)
