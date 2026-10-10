# useAnnualExport

> Hook returning the annual page's export action: the workbook from the report's input, with the raw entries refetched if their load failed inside the job.

## Purpose

"Export to Excel" and "Save to app" on the annual page build the same workbook from
`useAnnualReport`'s `workbookInput`. The one wrinkle is the raw sheet: the entries are loaded
by the report job, and if that load failed the export must try once more so the file always
has its raw sheet. This hook keeps that rule out of the page.

## Interface

`useAnnualExport(report)` takes the `useAnnualReport` result (only `utilData`, `workbookInput`
and `entriesFor` are read) and returns `(save: boolean) => Promise<void>`.

## Uses

- `react` (`useCallback`)
- [utilization API](<../../../api/Reporting API - utilization.md>) for `fetchUtilizationEntries`
- [excelExport](<Reporting Annual Utilization - excelExport.md>) for `annualWorkbookFilename` and `buildAnnualWorkbook`
- [useAnnualReport](<Reporting Annual Utilization - useAnnualReport.md>) as a type only
- [saveReport](<../../../utils/Reporting Util - saveReport.md>) for `deliverBlob`

## Used By

- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>) for both export buttons

## Key Behavior

- Does nothing without `utilData` or `workbookInput`.
- A null `entriesFor` means the job's entries load failed, so the entries are fetched with
  `fetchUtilizationEntries(start, end)` and substituted into the input. A period with
  genuinely zero entries has a range key and is not refetched.
- Metadata: `agencyName: 'All Agencies'`, `reportType: 'annual_utilization'`, `format: 'xlsx'`
  and the filename without extension as the title.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/annualUtilization/useAnnualExport.ts](../../../../../client/src/pages/reports/annualUtilization/useAnnualExport.ts)
