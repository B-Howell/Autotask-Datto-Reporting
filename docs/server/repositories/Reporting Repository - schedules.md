# Schedules repository

> Rows for `report_schedules` (a day of month, an hour and recipients attached to a preset) and `schedule_runs` (one row per attempt to render and deliver it).

## Purpose

A schedule says when a preset should be rendered and who should receive the file; a run records what happened each time it was tried, manually or by the scheduler loop. This module owns both tables: the JSON encoding of the recipient lists, the integer encoding of the `enabled` flag, the `due()` query the scheduler polls, and the run bookkeeping. It computes nothing about calendars; `next_run_at` is written by the schedules service and only compared here.

Like presets, these are user data and history with no upstream copy, so they are kept out of the cache-version purge in the [sqlite repository](<Reporting Repository - sqlite.md>).

## Interface

| Name | Description |
|---|---|
| `COLUMNS` | The writable schedule columns: `preset_id`, `day_of_month`, `hour`, `recipients_to`, `recipients_cc`, `subject`, `body`, `enabled`, `next_run_at`, `last_run_at`, `last_status`, `last_error`. `insert` and `update` filter their input to these. |
| `JSON_COLUMNS` | `recipients_to` and `recipients_cc`, stored as JSON arrays. |
| `insert(schedule)` | Inserts a row from a dict and stamps `created_at` and `updated_at`. The three `last_*` columns are not part of the insert; they start `NULL`. Returns the new id. |
| `update(schedule_id, changes)` | Updates only the real columns present in `changes`, encoding lists and the flag, and bumps `updated_at`; no usable keys is a no-op. |
| `get(schedule_id)` | One decoded row or None. |
| `list_schedules()` | Every row ordered by id. |
| `due(now_iso)` | Enabled rows with a non-null `next_run_at` at or before `now_iso`, soonest first. |
| `delete(schedule_id)` | Deletes the schedule's runs and then the schedule. |
| `insert_run(schedule_id, trigger)` | Opens a run with status `running` and `started_at` now; `trigger` is free text such as `manual` or `scheduled`. Returns the run id. |
| `finish_run(run_id, status, error=None, saved_report_id=None)` | Closes a run: stamps `finished_at`, sets the status, the error text and the id of the saved report that was produced. |
| `list_runs(schedule_id=None, limit=50)` | Runs for one schedule, or across all schedules when no id is given, newest first (ties broken by id), capped at `limit`. Run rows are returned as stored; they have no JSON columns. |

A decoded schedule row carries the table columns with the two recipient lists parsed into Python lists and `enabled` as a bool.

## Uses

- Standard library `json`.
- [sqlite repository](<Reporting Repository - sqlite.md>) for `query`, `execute` and `iso_now`.

## Used By

- [server/tests/test_schedule_repositories.py](../../../server/tests/test_schedule_repositories.py).
- The schedules service and the scheduler loop that the scheduled-delivery branch adds next; they are the intended writers of `next_run_at` and the `last_*` columns.

## Key Behavior

- `next_run_at`, `last_run_at`, `started_at` and `finished_at` are ISO-8601 UTC strings with an explicit offset, the format `sqlite.iso_now()` produces. `due()` compares `next_run_at <= ?` as text, which is correct only because every writer uses that one format. A writer that stored a naive timestamp or a different zone would silently break the ordering and the due check; the schedules service is the only code that should compute `next_run_at`.
- `due()` skips disabled schedules and schedules whose `next_run_at` is `NULL`, so pausing a schedule or clearing its next run both take it out of the poll without deleting anything.
- Recipient lists default to `[]` at both ends: `None` is written as `[]`, and an empty or null column decodes to `[]`.
- `enabled` is stored as `1` or `0` and decoded to a bool, so a caller can compare with `is True` rather than against an integer.
- Column names in the `UPDATE` statement are interpolated only from the `COLUMNS` allow-list; values are bound parameters.
- `delete` issues two statements rather than one transaction; a failure between them could leave a schedule with no runs, which is harmless, but never runs with no schedule.
- `list_runs` orders by `started_at` and then `id` descending so two runs opened within the same timestamp still list newest first.

## Cleanup Notes

- Neither `schedule_runs.schedule_id` nor `report_schedules.preset_id` has a foreign key or an index; at the expected volume (a handful of schedules, a run a month each) a table scan is fine, but a busy deployment would want an index on `schedule_runs(schedule_id, started_at)`.
- `trigger` and `status` are free text; the values the scheduler uses should be documented on the service page once it exists.

## Source

[server/repositories/schedules.py](../../../server/repositories/schedules.py)
