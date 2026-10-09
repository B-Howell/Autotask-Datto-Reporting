# Saved reports repository

> Metadata rows for the report files the browser uploads; the bytes themselves live on disk and are managed by the service above this module.

## Purpose

When a user exports or saves a report, the client uploads the finished file and the server keeps it under the data volume. This repository owns the `saved_reports` table that describes each file (agency, report type, format, title, filename, path on disk, size, created time). It knows nothing about the filesystem; the [saved_reports service](<../services/Reporting Service - saved_reports.md>) pairs each row with its file.

## Interface

| Name | Description |
|---|---|
| `insert(meta)` | Inserts a row from a dict with keys `agency_id`, `agency_name`, `report_type`, `format`, `title`, `filename`, `filepath`, `size_bytes`; `created_at` is stamped here. Returns the new id. |
| `list_reports(agency_name=None, report_type=None)` | All rows, optionally filtered by exact agency name and report type, newest first. |
| `get(report_id)` | One row or None. |
| `find_by_filename(filename)` | The row with an exact filename match, or None; used for de-duplication. |
| `touch(report_id, size_bytes, filepath=None)` | After an in-place overwrite, updates `size_bytes` and resets `created_at`; also updates `filepath` when a new path was needed. |
| `delete(report_id)` | Deletes the row and returns it so the caller can remove the file. |

## Uses

- [sqlite repository](<Reporting Repository - sqlite.md>) for `query`, `execute` and `iso_now`.

## Used By

- [saved_reports service](<../services/Reporting Service - saved_reports.md>), imported as `repo`.

## Key Behavior

- `insert` uses named parameters, so `meta` must contain every column named in the statement; a missing key raises before anything is written.
- Filtering in `list_reports` is by `agency_name`, not `agency_id`, because grouped agencies have a display name but no single id.
- `created_at` doubles as "last written": `touch` resets it, so a re-saved report moves to the top of the newest-first listing.
- `find_by_filename` is a plain equality match on the whole filename; the service relies on the client encoding agency, report and date into that name.
- `delete` reads the row first and returns None when the id does not exist, so a double delete is harmless.

## Cleanup Notes

- `filename` has no unique index; de-duplication is enforced only by the service's `find_by_filename` check, so two concurrent uploads of the same name could create two rows.

## Source

[server/repositories/saved_reports.py](../../../server/repositories/saved_reports.py)
