# Saved reports router

> Upload, list, download and delete the report files the browser generates (xlsx, docx, pdf).

## Purpose

Exports are built in the browser, so the server's job is only to keep the bytes and a metadata row. "Export" downloads and uploads; "Save to app" uploads only. This router accepts the multipart upload, lists what is stored, hands a file back with its original name, and deletes. De-duplication by filename and the on-disk layout belong to the service.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| POST | `/api/saved-reports` | multipart form: `file` (required), `agency_name`, `agency_id`, `report_type`, `format`, `title` (all optional strings, default empty) | `{id, deduped: bool}` | 422 if `file` is missing |
| GET | `/api/saved-reports` | `agency_name: str | null`, `report_type: str | null` | list of metadata rows (`id, agency_id, agency_name, report_type, format, title, filename, filepath, size_bytes, created_at`), newest first | none |
| GET | `/api/saved-reports/{report_id}/download` | path `report_id: int` | `FileResponse` with `Content-Disposition` set to the stored filename | 404 `Report not found` when the row or the file is gone |
| DELETE | `/api/saved-reports/{report_id}` | path `report_id: int` | `{deleted: bool}` | none; a missing id answers `deleted: false` |

No SSE, no `run_report`. The upload route is `async def` so it can `await file.read()`.

## Uses

- `fastapi` (`APIRouter`, `File`, `Form`, `HTTPException`, `Query`, `UploadFile`), `fastapi.responses.FileResponse`
- [saved_reports service](<../services/Reporting Service - saved_reports.md>) (`save`, `list_reports`, `get_file`, `delete`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [client savedReports API](<../../client/api/Reporting API - savedReports.md>)

## Key Behavior

- The whole upload is read into memory before saving; the annual utilization workbook with its raw entries sheet is the largest and passes nginx's 100 MB `client_max_body_size`.
- A missing client filename falls back to `"report"`; the stored extension comes from `format` when given, else the filename's suffix, else `bin`.
- Re-uploading the same `filename` overwrites the existing file in place and answers `deduped: true` with the original id; the filename encodes agency, report and date, so an export repeated the same day replaces its earlier copy.
- `agency_id` is accepted as a string and stored as an integer only when it is all digits; otherwise `NULL`.
- The listing returns `filepath`, which is the server's internal path under the data volume; the client does not use it.
- Download answers 404 both when no row exists and when the row's file has been removed from disk, so a stale row cannot produce a 500.
- Delete removes the row first and then the file; an `OSError` removing the file is swallowed and the response is still `deleted: true`.

## Cleanup Notes

- Exposing `filepath` in the list response leaks server layout for no client benefit.

## Source

[server/routers/saved_reports.py](../../../server/routers/saved_reports.py)
