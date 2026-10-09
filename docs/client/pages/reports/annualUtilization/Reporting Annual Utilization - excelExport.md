# Annual Utilization excelExport

> Builds the multi-sheet annual utilization workbook: the raw entries, the per-month summary priced at the tier rates, and one detail sheet per selected agency.

## Purpose

The annual report is delivered as one Excel file that a client can audit from the top line down to each time entry. This util assembles that workbook from the report, the computed `Summary`, the selected companies and tiers, and the raw entries. It is a util in the Annual Utilization folder with no React; the page supplies the inputs and delivers the `Blob`.

## Interface

| Export | Description |
|---|---|
| `annualWorkbookFilename(utilData)` | `Annual Utilization <periodLabel>.xlsx`, for example `Annual Utilization FY 2024-25.xlsx`; falls back to `<start> to <end>`. |
| `AnnualWorkbookInput` | `{ utilData, summary, companies, departments, entries }`. |
| `buildAnnualWorkbook(input)` | `Promise<Blob>`: loads ExcelJS lazily and returns the xlsx blob. |

## Uses

- `exceljs` (loaded on demand through `loadExcel`).
- [excel util](<../../../utils/Reporting Util - excel.md>) for `XLSX_HEADER_FILL`, `XLSX_ROW_EVEN`, `loadExcel`, `workbookToBlob`.
- [departments](<Reporting Annual Utilization - departments.md>) (`RatedDepartment`), [fiscalYear](<Reporting Annual Utilization - fiscalYear.md>) (`MONTHS_IN_YEAR`), [rawEntries](<Reporting Annual Utilization - rawEntries.md>) (`RAW_COLUMNS`), [summary](<Reporting Annual Utilization - summary.md>) (`buildDetail`, `Summary`).
- `UtilizationEntry`, `UtilizationReport` from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>)
- [workbookInput](<Reporting Annual Utilization - workbookInput.md>), which imports the `AnnualWorkbookInput` type and builds it.

## Key Behavior

Sheets are added in this order so the raw data is the leftmost tab.

- **Datto** (raw entries): header row from `RAW_COLUMNS` labels, top row frozen, autofilter A1 to G1. One row per entry in `RAW_COLUMNS` order; every second row banded. Widths 12, 32, 18, 52, 22, 13, 26. Column 6 (Hours Worked) uses `#,##0.00` and right alignment.
- **Summary**: two header rows. Row 1 is `Department`, `Rate`, then each company name merged across two columns and centred; row 2 is blank, blank, then `Hours per month`, `Cost per month` for each company. A1:A2 and B1:B2 are merged. Frozen at one column and two rows. One row per tier in `summary.perDept`: tier name, the rate used, then monthly hours and monthly cost per company; alternate rows banded. A bold `Total` row with a double top border sums monthly hours and cost per company. Widths: 26, 8, then 16 (`#,##0.00`) and 15 (`$#,##0`) per company.
- **One sheet per selected agency**: row 1 is the agency name in bold 13pt; row 2 is the header `Resource`, `1 Year`, `Avg Monthly`; both frozen. For each tier from `buildDetail`: a bold banded tier row (name, year total, total / 12), then one indented row per worker (name, hours, hours / 12). A `Total` row with double top border closes the sheet. Widths 34, 12, 14; columns 2 and 3 use `#,##0.00`.
- The summary sheet shows monthly figures only; annual hours per tier and the annual totals shown on screen are not written.
- Sheet names come from `sheetNamer`: characters Excel rejects (`\ * ? : [ ] /`) become `-`, names are cut to 31 characters, and a name already used gets a ` (2)`, ` (3)` suffix fitted inside the limit. Two agencies sharing their first 31 characters previously threw and lost the whole export.
- Header styling here (`styleHeader`, `band`, `totalRow`) is local to this module rather than the shared `styleHeaderRow` / `styleBodyRow`, so the annual workbook has thin light borders and 18pt header rows where the quarterly one has the shared style.

## Cleanup Notes

- `sheetNamer` only tracks agency names; an agency literally named `Datto` or `Summary` would collide with the fixed sheets and throw. It also does not strip a leading or trailing apostrophe, which Excel rejects.
- The header, banding and total-row styling duplicates helpers that exist in the excel util.
- No tests cover the workbook layout or the sheet-name collision logic.

## Source

[client/src/pages/reports/annualUtilization/excelExport.ts](../../../../../client/src/pages/reports/annualUtilization/excelExport.ts)
