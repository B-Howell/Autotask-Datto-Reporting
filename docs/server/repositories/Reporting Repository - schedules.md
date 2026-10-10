# Schedules repository

> Rows for `report_schedules` (a day of month, an hour and recipients attached to a preset) and `schedule_runs` (one row per attempt to render and deliver it).

## Purpose

A schedule says when a preset should be rendered and who should receive the file; a run records what happened each time it was tried, manually or by the scheduler loop. This module owns both tables: the JSON encoding of the recipient lists, the integer encoding of the `enabled` flag, the `due()` query the scheduler polls, and the run bookkeeping. It computes nothing about calendars; `next_run_at` is written by the schedules service and only compared here.

Like presets, these are user data and history with no upstream copy, so they are kept out of the cache-version purge in the [sqlite repository](<Reporting Repository - sqlite.md>).

## Interface

| Name | Description |
|---|---|
| `TRIGGER_SCHEDULE`, `TRIGGER_MANUAL` | `schedule` and `manual`, the two values the server writes to `schedule_runs.trigger`: the loop's tick and the page's run-now button. Defined once here and read by the scheduled_runs and schedule_runner services. |
| `STATUS_RUNNING`, `STATUS_OK`, `STATUS_ERROR` | `running`, `ok` and `error`: a run's `status` while open and after it finishes, and a schedule's `last_status`. |
| `COLUMNS` | The writable schedule columns: `preset_id`, `day_of_month`, `hour`, `recipients_to`, `recipients_cc`, `subject`, `body`, `enabled`, `next_run_at`, `last_run_at`, `last_status`, `last_error`. `insert` and `update` filter their input to these. |
| `JSON_COLUMNS` | `recipients_to` and `recipients_cc`, stored as JSON arrays. |
| `insert(schedule)` | Inserts a row from a dict and stamps `created_at` and `updated_at`. The three `last_*` columns are not part of the insert; they start `NULL`. Returns the new id. |
| `update(schedule_id, changes)` | Encodes the lists and the flag and hands the changes to `sqlite.update_row` with `COLUMNS` as the allow-list, so only real columns are written and `updated_at` is bumped; no usable keys is a no-op. |
| `get(schedule_id)` | One decoded row or None. |
| `list_schedules()` | Every row ordered by id. |
| `list_for_preset(preset_id)` | The schedules referencing one preset, ordered by id; the presets service uses it to refuse deleting a preset that is still scheduled. |
| `due(now_iso)` | Enabled rows with a non-null `next_run_at` at or before `now_iso`, soonest first. |
| `delete(schedule_id)` | Deletes the schedule's runs and then the schedule. |
| `insert_run(schedule_id, trigger)` | Opens a run with status `STATUS_RUNNING` (written explicitly, not left to the column default) and `started_at` now; `trigger` is stored as given, normally `TRIGGER_SCHEDULE` or `TRIGGER_MANUAL`. Returns the run id. |
| `finish_run(run_id, status, error=None, saved_report_id=None)` | Closes a run: stamps `finished_at`, sets the status (`STATUS_OK` or `STATUS_ERROR`), the error text and the id of the saved report that was produced. |
| `list_running()` | Every run still in status `STATUS_RUNNING`, oldest first. After a restart these are the rows nobody is left to close. |
| `close_running(error)` | Finishes every run `list_running` returns as `STATUS_ERROR` with the given message, keeping each row's `saved_report_id`; returns the count closed. |
| `list_runs(schedule_id=None, limit=50)` | Runs for one schedule, or across all schedules when no id is given, newest first (ties broken by id), capped at `limit`. Run rows are returned as stored; they have no JSON columns. |

A decoded schedule row carries the table columns with the two recipient lists parsed into Python lists and `enabled` as a bool.

## Uses

- Standard library `json`.
- [sqlite repository](<Reporting Repository - sqlite.md>) for `query`, `execute`, `update_row` and `iso_now`.

## Used By

- [server/tests/test_schedule_repositories.py](../../../server/tests/test_schedule_repositories.py).
- [presets service](<../services/Reporting Service - presets.md>) (`list_for_preset`, to refuse deleting a scheduled preset).
- [schedules service](<../services/Reporting Service - schedules.md>), imported as `repo`: the only writer of `next_run_at` (through `insert` and `update`) and of the `last_*` columns.
- [scheduled_runs service](<../services/Reporting Service - scheduled_runs.md>) (`insert_run`, `finish_run`, `list_runs`, and the `TRIGGER_SCHEDULE`, `STATUS_OK` and `STATUS_ERROR` constants).
- [schedule_runner service](<../services/Reporting Service - schedule_runner.md>) (`due()` on every tick, `close_running` from its startup sweep, and the two `TRIGGER_*` constants).
- The [schedules router](<../routers/Reporting Router - schedules.md>) reads run history through the schedules service's `recent_runs` and `runs_for`, never this module directly.

## Key Behavior

- `next_run_at`, `last_run_at`, `started_at` and `finished_at` are ISO-8601 UTC strings with an explicit offset, the format `sqlite.iso_now()` produces. `due()` compares `next_run_at <= ?` as text, which is correct only because every writer uses that one format. A writer that stored a naive timestamp or a different zone would silently break the ordering and the due check; the schedules service is the only code that should compute `next_run_at`. Writers must emit the offset as `+00:00`, never `Z`: `Z` sorts after every digit, so a `Z` row would compare as later than any `+00:00` instant with the same clock time. Mixing second and microsecond precision is safe, because at the first differing position a second-precision value has `+` where a fractional one has `.`, and `+` sorts before `.`; so a `12:00:00+00:00` row is due at `12:00:00.000001+00:00` and a `12:00:00.000001+00:00` row is not yet due at `12:00:00+00:00`.
- `due()` skips disabled schedules and schedules whose `next_run_at` is `NULL`, so pausing a schedule or clearing its next run both take it out of the poll without deleting anything.
- Recipient lists default to `[]` at both ends: `None` is written as `[]`, and an empty or null column decodes to `[]`.
- `enabled` is stored as `1` or `0` and decoded to a bool, so a caller can compare with `is True` rather than against an integer.
- The `UPDATE` statement is built by the [sqlite repository](<Reporting Repository - sqlite.md>)'s `update_row`, which interpolates column names only from the `COLUMNS` allow-list this module passes it and binds every value; `_encode` runs first so the lists and the flag reach it in their stored form.
- The trigger and status strings are defined once at the top of this module and nowhere else: the scheduled_runs service compares a run's trigger with `TRIGGER_SCHEDULE` and closes runs with `STATUS_OK` or `STATUS_ERROR`, the schedule_runner service starts batches with `TRIGGER_SCHEDULE` and `TRIGGER_MANUAL`, and `list_running` and `close_running` read `STATUS_RUNNING` and `STATUS_ERROR`. The schema's `DEFAULT 'running'` on `schedule_runs.status` mirrors `STATUS_RUNNING` and carries a comment saying so.
- `delete` issues two statements rather than one transaction; a failure between them could leave a schedule with no runs, which is harmless, but never runs with no schedule.
- `list_runs` orders by `started_at` and then `id` descending so two runs opened within the same timestamp still list newest first.

## Cleanup Notes

- Neither `schedule_runs.schedule_id` nor `report_schedules.preset_id` has a foreign key or an index; at the expected volume (a handful of schedules, a run a month each) a table scan is fine, but a busy deployment would want an index on `schedule_runs(schedule_id, started_at)`.
- `trigger` and `status` are `TEXT` columns with no `CHECK` constraint, so a direct write can still store a value outside the constants above; nothing in the server does.

## Source

[server/repositories/schedules.py](../../../server/repositories/schedules.py)
