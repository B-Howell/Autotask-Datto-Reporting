# Saved reports service

> Stores report files uploaded from the browser under the data directory, pairing each with a metadata row and de-duplicating by filename.

## Purpose

Exports are built in the browser, so the server's job is only to keep the finished files: write the bytes under `<data_dir>/saved_reports/`, record a row describing them, and serve or delete them later. This service owns the filesystem half of that; the repository owns the row.

## Interface

| Name | Description |
|---|---|
| `SAVED_REPORTS_DIR` | `<data_dir>/saved_reports`. |
| `save(data, filename, meta)` | Stores bytes; returns `{id, deduped}`. `meta` may carry `agency_id`, `agency_name`, `report_type`, `format`, `title`. |
| `list_reports(agency_name=None, report_type=None)` | Pass-through to the repository listing. |
| `get_file(report_id)` | `(path, download name)` or None when the row or file is gone. |
| `delete(report_id)` | Removes the row and the file; returns whether a row existed. |

## Uses

- Standard library `os`, `uuid`.
- [config](<../Reporting Server - config.md>) for `settings.data_dir`.
- [saved_reports repository](<../repositories/Reporting Repository - saved_reports.md>) as `repo`.

## Used By

- [saved_reports router](<../routers/Reporting Router - saved_reports.md>)
- [scheduled_runs service](<Reporting Service - scheduled_runs.md>) (`save`, under the browser's own filename so a scheduled copy replaces a manual export of the same day).

## Key Behavior

- Files on disk are named `<uuid4 hex>.<ext>`, never by the user-supplied filename, so a client-chosen name can never escape the directory or collide. The extension is `meta["format"]` lower-cased when given, else the part after the last dot of the filename, else `bin`.
- De-duplication: if a row with the same `filename` exists, the new bytes overwrite its file in place and `touch` refreshes size and timestamp; the response is `deduped: True`. The client encodes agency, report and date into the filename, so an export repeated the same day replaces its earlier copy instead of piling up. If the old path cannot be written (for example the file was removed outside the app) a fresh path is created and the row's `filepath` updated.
- `agency_id` is stored as an int only when the string is all digits; a group key or empty value becomes None, while `agency_name` is always stored for filtering.
- `get_file` checks that the file still exists so the router can answer 404 rather than fail mid-stream; the download name falls back to `report-<id>`.
- `delete` ignores `OSError` from `os.remove` so a row whose file has already vanished is still cleaned up.

## Cleanup Notes

- None noted.

## Source

[server/services/saved_reports.py](../../../server/services/saved_reports.py)
