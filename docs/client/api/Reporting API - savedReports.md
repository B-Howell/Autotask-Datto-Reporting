# Saved Reports API

> Lists, uploads, downloads and deletes the report files kept on the server under Saved Reports.

## Purpose

`client/src/api/savedReports.ts` wraps the `/api/saved-reports` routes. Exports are built in the browser, so "saving" a report means uploading the finished blob with a small metadata form (agency, report type, format, title). The server stores the bytes on its data volume with a metadata row and de-duplicates by filename, so an export repeated the same day replaces its earlier copy.

This module also owns the one raw `fetch` outside `client.ts`: the download endpoint returns a file, not JSON, and the viewer needs an `ArrayBuffer` to render a workbook in place.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchSavedReports` | `GET /api/saved-reports` | none | `Promise<SavedReport[]>` |
| `uploadSavedReport` | `POST /api/saved-reports` (multipart) | `blob`, `filename`, `meta: SavedReportMeta` | `Promise<SaveReportResponse>` (`id`, `deduped`) |
| `deleteSavedReport` | `DELETE /api/saved-reports/{id}` | `id: number` | `Promise<{ deleted: boolean }>` |
| `savedReportDownloadUrl` | `GET /api/saved-reports/{id}/download` | `id` | The URL string, for links and the PDF viewer |
| `fetchSavedReportBytes` | `GET /api/saved-reports/{id}/download` | `id` | `Promise<ArrayBuffer>` |

`SavedReportMeta` (`agencyName?`, `agencyId?`, `reportType?`, `format?`, `title?`) is declared here, not in `types.ts`.

## Uses

- [client](<Reporting API - client.md>): `getJson`, `postForm`, `deleteJson`.
- [types](<Reporting API - types.md>): `SavedReport`, `SaveReportResponse`.

## Used By

- [saveReport util](<../utils/Reporting Util - saveReport.md>) calls `uploadSavedReport` for every export and save.
- [useSavedReports](<../pages/reports/savedReports/Reporting Saved Reports - useSavedReports.md>) lists and deletes.
- [SavedReportsTable](<../pages/reports/savedReports/Reporting Saved Reports - SavedReportsTable.md>) builds download links.
- [SavedReportViewer](<../components/Reporting Component - SavedReportViewer.md>) uses the download URL for PDFs and `fetchSavedReportBytes` for workbooks.

## Key Behavior

- Form fields are always appended, with `''` for a missing value; `agency_id` is stringified and the server stores it as an integer only when the string is all digits (a group key such as `group:Name` becomes `null`).
- `title` defaults to the filename when `meta.title` is absent.
- De-duplication is by exact `filename`. Export filenames carry the date stamp from the dates util, so the same report exported on different days produces separate rows.
- `fetchSavedReportBytes` throws a plain `Error` with `Could not load the file (HTTP <status>)`, not an `ApiError`, because the body is a file and has no `detail`.
- Uploads are not abortable and are not tracked as jobs; a large annual utilization workbook can take a few seconds.

## Cleanup Notes

- None noted.

## Source

[client/src/api/savedReports.ts](../../../client/src/api/savedReports.ts)
