# SQLite repository

> Owns the one database connection, the schema and migrations, the cache-version purge, and the `replace_scope` snapshot swap that every report cache is built on.

## Purpose

Every report's rows live in a per-report snapshot table in one SQLite file (`reports.db` under the data directory, which is volume-mounted in Docker). This module is the only place that opens the file or knows the DDL. It sits at the bottom of the repository layer; services never write SQL against it directly except through the thin helpers here.

The design decision is "snapshots, not upserts": the vendor APIs are the source of truth, so a refresh deletes every row for a scope and inserts the new set in one transaction. Nothing is merged and no stale row can outlive a refresh.

## Interface

| Name | Description |
|---|---|
| `get_conn()` | Returns the shared connection, opening it on first use with `check_same_thread=False`, `row_factory = sqlite3.Row`, `PRAGMA journal_mode=WAL`, `PRAGMA foreign_keys=ON`, then creating and migrating the schema. |
| `init_db()` | Public startup entry point; just calls `get_conn()`. |
| `query(sql, params=())` | Runs a SELECT under the lock and returns a list of plain dicts. |
| `execute(sql, params=())` | Runs one write statement under the lock, commits, returns `lastrowid`. |
| `replace_scope(table, scope, rows)` | The snapshot swap. `scope` is `{column: value}`; deletes every matching row then inserts `rows` with the scope columns merged in, all in one transaction, rolling back on any exception. |
| `transaction()` | Context manager for one write transaction: takes the lock, issues `BEGIN`, yields the connection, commits on a clean exit and rolls back on any exception. Statements inside must use the yielded connection; `execute` and `query` take the same lock and would deadlock. `replace_scope` and the credentials repository's `upsert_many` are built on it. |
| `update_row(table, row_id, fields, allowed)` | Sets the keys of `fields` that appear in the `allowed` column list on the row whose `id` is `row_id` and stamps `updated_at`; nothing allowed to set is a no-op. The presets and schedules repositories call it for their `update`. |
| `iso_now()` | UTC timestamp in ISO 8601, used for `synced_at`, `updated_at` and `created_at`. |
| `CACHE_VERSION` | Integer bumped when a code fix makes previously cached rows wrong (currently 5). |
| `DATA_DIR`, `DB_FILE` | Resolved from `settings.data_dir`. |

## Uses

- Standard library `sqlite3`, `os`, `threading.Lock`, `datetime`.
- [config](<../Reporting Server - config.md>) for `settings.data_dir`.

## Used By

- [snapshots repository](<Reporting Repository - snapshots.md>) (`query`, `execute`, `replace_scope`, `iso_now`)
- [manual_inputs repository](<Reporting Repository - manual_inputs.md>)
- [saved_reports repository](<Reporting Repository - saved_reports.md>)
- [presets repository](<Reporting Repository - presets.md>) and [schedules repository](<Reporting Repository - schedules.md>) (`query`, `execute`, `update_row`, `iso_now`); [credentials repository](<Reporting Repository - credentials.md>) (`query`, `execute`, `transaction`, `iso_now`)
- [schedule_runner service](<../services/Reporting Service - schedule_runner.md>) (`iso_now`, for the instant its tick compares against `next_run_at`)
- [utilization service](<../services/Reporting Service - utilization.md>) (writes `util_entry_rows` with `replace_scope`)
- [sync service](<../services/Reporting Service - sync.md>) (`iso_now`)
- [main](<../Reporting Server - main.md>) (`init_db` on startup)
- [demo seed](<../demo/Reporting Demo - seed.md>) and [demo data](<../demo/Reporting Demo - data.md>)
- `server/tests/conftest.py` points `DB_FILE` at a temporary file.

## Key Behavior

- Single locked connection: uvicorn serves on a threadpool, so one connection is shared and a module-level `Lock` serialises `query`, `execute` and every `transaction()` block (`replace_scope` is one). The lock is not re-entrant, which is why a transaction's statements go to the yielded connection rather than back through `execute`. WAL mode lets readers keep reading the previous snapshot while a swap is in progress. `get_conn()` itself is not under the lock; `main.py` calls `init_db()` during startup so the first open is single-threaded in practice.
- Tables and their scope columns: `device_rows` (company_id, site_id), `patch_rows` (site_id), `office_windows_counts` (company_id, site_id, with `kind` of `os` or `office`), `ticket_rows` (company_id, year, month), `sla_ticket_rows` (year, month, plus `data_json` holding the full processed ticket), `util_time_rows` and `util_entry_rows` (period_start, period_end as inclusive ISO dates), `hdd_ticket_rows` (company_id). Each has an index on its scope columns and a `synced_at` column.
- Non-snapshot tables: `sync_state` (primary key report_type, params_key; last_synced_at, status, error), `manual_inputs` (primary key agency_key, report_type, field_key), `saved_reports` (autoincrement id plus file metadata), and `cache_meta` (key, value) created lazily by the version purge.
- Scheduled-delivery tables, also non-snapshot: `report_presets` (autoincrement id; name, report_type, agency_key, agency_name, options as a JSON object, created_at, updated_at), `report_schedules` (autoincrement id; preset_id, day_of_month, hour defaulting to 7, recipients_to and recipients_cc as JSON arrays, subject, body, enabled as 0 or 1, next_run_at, last_run_at, last_status, last_error, created_at, updated_at) and `schedule_runs` (autoincrement id; schedule_id, trigger, started_at, finished_at, status defaulting to `running`, error, saved_report_id). They hold user data and history with no upstream copy, so the comment above them in the schema says they must never be added to `_STALE_ON_UPGRADE`; a `CACHE_VERSION` bump leaves them alone. The [presets](<Reporting Repository - presets.md>) and [schedules](<Reporting Repository - schedules.md>) repositories own the encoding of their JSON and flag columns.
- `credentials` (primary key `name`; `ciphertext` as a `BLOB NOT NULL`, `updated_at`, `last_tested_at`, `last_test_ok` as 0, 1 or `NULL`) holds the vendor credentials entered on the Settings page, one row per field, encrypted by [secrets](<../core/Reporting Core - secrets.md>). It is user data too and carries the same never-purge comment; the [credentials repository](<Reporting Repository - credentials.md>) owns its rows.
- `replace_scope` builds the INSERT column list from each merged row's keys, so every row of a call should carry the same keys as the table; an unknown key raises and the transaction rolls back.
- `update_row` interpolates column names into its `UPDATE` only after filtering the caller's keys through the repository's `allowed` list, and the table name comes from repository code, never a request; every value is a bound parameter. Bandit reports the f-string as B608 at medium severity and medium confidence; CI gates bandit at high for both, and the docstring is the record of why it is safe. Keeping the one statement here means the presets and schedules repositories carry no SQL assembly of their own.
- Two column defaults in the schema mirror constants that live elsewhere, and the inline comments say so: `report_schedules.hour DEFAULT 7` is the schedules service's `DEFAULT_HOUR` (the service fills a missing hour itself, so the column default is a safety net), and `schedule_runs.status DEFAULT 'running'` is the schedules repository's `STATUS_RUNNING` (which `insert_run` writes explicitly).
- `_MIGRATIONS` adds columns to existing tables with idempotent `ALTER TABLE ... ADD COLUMN` (`patch_rows.last_user`, `device_rows.autotask_id`). `_REPLACED_TABLES` drops a table outright when it still has a column from an old scope shape (`util_time_rows.quarter`, `util_entry_rows.notes`) and recreates it from the schema; the data is a cache, so refetching is cheaper than backfilling NOT NULL columns.
- `CACHE_VERSION` purge: `cache_meta.version` is compared with `CACHE_VERSION` on every startup. When behind, every table in `_STALE_ON_UPGRADE` (`util_time_rows`, `util_entry_rows`, `device_rows`, `sync_state`) is emptied and the version recorded. The comment block above the constant is the changelog of why each bump happened (company id 0 handling, internal-time labelling, the configuration item id on device rows).
- Emptying `sync_state` on a version bump also forgets that legitimately empty scopes were fetched, so those refetch once on next view.

## Cleanup Notes

- `_STALE_ON_UPGRADE` is a single list applied to every bump, so a bump that only invalidates device rows also clears utilization rows; a per-version map would be more precise.
- `replace_scope` executes one INSERT per row; `executemany` would be faster for the larger tables, but at a few hundred thousand rows the current cost is acceptable.

## Source

[server/repositories/sqlite.py](../../../server/repositories/sqlite.py)
