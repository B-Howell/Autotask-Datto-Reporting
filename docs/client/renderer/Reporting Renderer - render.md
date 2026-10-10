# renderer render

> The dispatch from a report request to file bytes, running the browser's own export builders under Node so a scheduled file and a downloaded one are built by identical code.

## Purpose

`client/renderer/render.ts` is the heart of the renderer service. Scheduled deliveries need the same Excel, Word and PDF layouts the export buttons produce, and reimplementing those layouts on the Python side would mean two copies that drift. Instead, the server posts the report data it already has and this module runs the pure export builders (data and image bytes in, file out) that the pages call. Nothing in `src/` was changed to make that possible; the builders were already free of DOM and fetch calls, and the per-report input assembly already lived in pure modules such as the SLA and annual `workbookInput` and the Office/Windows `exportInput`.

The module keeps one handler per report type in a map, so adding a report means adding an entry and nothing else; the HTTP front in [server](<Reporting Renderer - server.md>) advertises `REPORT_TYPES` from the same map.

## Interface

| Export | Signature | Description |
|---|---|---|
| `RenderRequest` | `{ reportType, data, options, filename, logoBase64? }` | What the server posts. `data` is untyped at this boundary and takes its shape per handler; `options` is a plain object; `filename` is echoed back in the response header, never derived here. |
| `RenderResult` | `{ bytes: Buffer, contentType }` | The finished file and its media type. |
| `REPORT_TYPES` | `string[]` | The handler keys, in map order. |
| `DOCX_MIME`, `PDF_MIME` | strings | The Word and PDF media types; the xlsx one comes from the excel util. |
| `render` | `(req: RenderRequest) => Promise<RenderResult>` | Runs the handler for `req.reportType`; rejects with an `UnknownReportTypeError` for any other key. |
| `UnknownReportTypeError` | `class extends Error` | Thrown for a report type no handler builds; its message is `Unknown report type: <x>`. The HTTP front tests for this class to answer a 400. |

### Report types and their payloads

| `reportType` | `data` | `options` | Builder | Output |
|---|---|---|---|---|
| `devices` | `{ sheets: MemberSheet[] }` (each `{ sheet, ids, companyName }`) | `columns?: string[]`, header names in export order; absent means every column | `mergeSheets`, `selectColumns`, `buildDeviceWorkbook` | xlsx |
| `sla` | `{ tickets: SlaTicket[] }` (the `SlaReport` as returned by the API is fine) | none | `slaWorkbookInput`, `buildSlaWorkbook` | xlsx |
| `quarterly_utilization` | `UtilizationReport` | none | `buildQuarterlyWorkbook` | xlsx |
| `annual_utilization` | `{ utilData: UtilizationReport, entries: UtilizationEntry[] }` | `departments?: RatedDepartment[]` (the tenant's rated departments, which the browser reads from its settings store), `companies?`, `rates?` | `annualWorkbookInput`, `buildAnnualWorkbook` | xlsx |
| `hdd_tickets` | `{ devices: HddTicketDevice[] }` | none | `buildHddTicketsWorkbook` | xlsx |
| `office_windows` | `{ breakdown: OfficeWindowsBreakdown, manualInputs: ManualInputs, agencyName }` | `showLicenses?: boolean` (default false), `format?: OfficeWindowsFormat` (`docx` or `pdf`, default docx) | `officeWindowsExportInput`, then `buildOfficeWindowsDocx` or `buildOfficeWindowsPdf` | docx or pdf |
| `patch` | `{ report: PatchReport, agency: Agency }` | none | `buildPatchPdf` with `summary`, `devices`, `total` and `chart: null` | pdf |

## Uses

- [deviceReports sheetRows](<../pages/reports/deviceReports/Reporting Device Report - sheetRows.md>) and [excelExport](<../pages/reports/deviceReports/Reporting Device Report - excelExport.md>).
- [SLA workbookInput](<../pages/reports/slaPerformance/Reporting SLA - workbookInput.md>) and [excelExport](<../pages/reports/slaPerformance/Reporting SLA - excelExport.md>).
- [agencyUtilization excelExport](<../pages/reports/agencyUtilization/Reporting Agency Utilization - excelExport.md>).
- [annualUtilization workbookInput](<../pages/reports/annualUtilization/Reporting Annual Utilization - workbookInput.md>) and [excelExport](<../pages/reports/annualUtilization/Reporting Annual Utilization - excelExport.md>).
- [hddTickets excelExport](<../pages/reports/hddTickets/Reporting HDD Tickets - excelExport.md>).
- [officeWindows exportInput](<../pages/reports/officeWindows/Reporting Office Windows - exportInput.md>), [wordExport](<../pages/reports/officeWindows/Reporting Office Windows - wordExport.md>) and [pdfExport](<../pages/reports/officeWindows/Reporting Office Windows - pdfExport.md>).
- [patchManagement pdfExport](<../pages/reports/patchManagement/Reporting Patch Management - pdfExport.md>).
- [renderer assets](<Reporting Renderer - assets.md>) for the icons and logo the Word and PDF builders embed.
- [excel util](<../utils/Reporting Util - excel.md>) for `XLSX_MIME`; the [API types](<../api/Reporting API - types.md>) for the payload shapes and `OfficeWindowsFormat`.

## Used By

- [renderer server](<Reporting Renderer - server.md>), which calls `render` for `POST /render` and lists `REPORT_TYPES` on `/health`.
- [client/renderer/render.test.ts](../../../client/renderer/render.test.ts), which renders every report type from the smallest valid payload and reads the device workbook back.

## Key Behavior

- Typing at the boundary: `data` and `options` arrive as `unknown` and a plain object. The `handler` helper is the single place they take on their per-report shapes, by a cast rather than validation, because the server builds the JSON from its own database rows and the two sides share the API types. A payload that does not match fails inside the builder and surfaces as a 500 from the HTTP layer.
- Blobs under Node: every Excel and Word builder returns a `Blob`, which Node 20 and later provide as a global; `fromBlob` reads it with `blob.arrayBuffer()` and wraps the result in a `Buffer`. PDFs come out of jsPDF with `doc.output('arraybuffer')`. jsPDF resolves to its Node build through the package's own `node` export condition, so the pdf util's dynamic import needs no special casing.
- Device columns: when `options.columns` is a string array it is passed to `selectColumns`, which keeps the requested order and drops unknown names; otherwise every string header of the merged sheet is exported in sheet order.
- Patch total: the figure in the centre of the donut is the sum of the summary counts, computed here the same way the Patch Management page computes it, so the PDF matches a browser export.
- Assets: the Office and Windows report and the patch report load their images through `loadRendererAssets(req.logoBase64)`, reading the product icons from `client/public` and decoding the optional base64 logo; a missing or non-PNG image is simply left out, as in the browser.
- The dispatcher uses `Object.hasOwn`, so a request for `constructor` or `toString` is an unknown type rather than a prototype lookup.
- An unknown type is the one failure the caller caused, so it has its own error class rather than a bare `Error`; the server distinguishes it by `instanceof`, not by reading the message, and the message stays free to change.

## Cleanup Notes

- Grouped agencies for `office_windows`: in the browser, several companies presented as one client have their breakdowns merged by `mergeBreakdowns` inside `useOfficeWindowsData.ts` before export. The renderer takes a single breakdown, so a server scheduling a grouped Office/Windows report has to merge the member breakdowns itself, or that merge needs to move into a pure module both sides can call.
- The patch PDF has no donut here: the browser rasterises the on-screen chart, and there is no screen under Node, so the handler passes `chart: null` and the exporter draws the legend alone. Drawing the donut from the summary counts in jsPDF would close the gap.

## Source

[client/renderer/render.ts](../../../client/renderer/render.ts)
