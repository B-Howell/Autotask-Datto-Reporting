# Presets repository

> Rows for the `report_presets` table: one report, as a user had it configured on screen, kept so a schedule can run it again later.

## Purpose

Scheduled delivery needs a durable description of what to run: the report type, the agency (or group) it is for, and the report-specific choices such as which device columns to include or whether the Office/Windows file should be a document or a PDF. A preset is that description. This module owns the table and the JSON encoding of the `options` column; it does not know which option keys are valid for which report, that is the job of the [presets service](<../services/Reporting Service - presets.md>).

Unlike the per-report snapshot tables, presets are user data with no upstream copy. They are deliberately kept out of the cache-version purge in the [sqlite repository](<Reporting Repository - sqlite.md>).

## Interface

| Name | Description |
|---|---|
| `COLUMNS` | The five writable columns: `name`, `report_type`, `agency_key`, `agency_name`, `options`. Both `insert` and `update` filter their input to these, so stray keys such as `id` or `created_at` are ignored rather than written. |
| `insert(preset)` | Inserts a row from a dict; missing columns become `NULL` (the schema rejects a missing `name` or `report_type`). `created_at` and `updated_at` are stamped here. Returns the new id. |
| `update(preset_id, changes)` | Updates only the keys in `changes` that are real columns and bumps `updated_at`; a dict with no usable keys is a no-op. |
| `get(preset_id)` | One decoded row or None. |
| `list_presets()` | Every row ordered by name. |
| `delete(preset_id)` | Deletes the row; a missing id is harmless. |

A decoded row carries the table columns with `options` already parsed from JSON into a dict.

## Uses

- Standard library `json`.
- [sqlite repository](<Reporting Repository - sqlite.md>) for `query`, `execute` and `iso_now`.

## Used By

- [presets service](<../services/Reporting Service - presets.md>), imported as `repo`.
- [server/tests/test_schedule_repositories.py](../../../server/tests/test_schedule_repositories.py).

## Key Behavior

- `options` is stored as a JSON object string and defaults to `{}`; `None` or a missing value is written as `{}`, and an empty or null column decodes to `{}` so callers never see `None` there.
- Column names in the `UPDATE` statement are interpolated into the SQL, but only from the `COLUMNS` allow-list; every value is a bound parameter. Bandit reports the f-string as B608 at medium severity and medium confidence; CI gates bandit at high for both, and the server carries no suppression comments, so the comment above the statement is the record of why it is safe.
- `agency_key` is `TEXT` for the same reason as `manual_inputs.agency_key`: it holds either a single agency id (`"1000"`) or a group key (`group:<name>`), and it is `NULL` for reports that are not scoped to an agency.
- Ordering by `name` is SQLite's default binary collation, so upper-case names sort before lower-case ones.
- Deleting a preset does not touch schedules that reference it; the service layer is expected to refuse or cascade that, and the schema has no foreign key enforcing it.

## Cleanup Notes

- `report_schedules.preset_id` has no `FOREIGN KEY` constraint even though `PRAGMA foreign_keys=ON` is set on the connection, so an orphaned schedule is possible if a preset is deleted directly through this module.

## Source

[server/repositories/presets.py](../../../server/repositories/presets.py)
