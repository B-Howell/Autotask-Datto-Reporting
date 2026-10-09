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
- [utilization service](<../services/Reporting Service - utilization.md>) (writes `util_entry_rows` with `replace_scope`)
- [sync service](<../services/Reporting Service - sync.md>) (`iso_now`)
- [main](<../Reporting Server - main.md>) (`init_db` on startup)
- [demo seed](<../demo/Reporting Demo - seed.md>) and [demo data](<../demo/Reporting Demo - data.md>)
- `server/tests/conftest.py` points `DB_FILE` at a temporary file.

## Key Behavior

- Single locked connection: uvicorn serves on a threadpool, so one connection is shared and a module-level `Lock` serialises `query`, `execute` and `replace_scope`. WAL mode lets readers keep reading the previous snapshot while a swap is in progress. `get_conn()` itself is not under the lock; `main.py` calls `init_db()` during startup so the first open is single-threaded in practice.
- Tables and their scope columns: `device_rows` (company_id, site_id), `patch_rows` (site_id), `office_windows_counts` (company_id, site_id, with `kind` of `os` or `office`), `ticket_rows` (company_id, year, month), `sla_ticket_rows` (year, month, plus `data_json` holding the full processed ticket), `util_time_rows` and `util_entry_rows` (period_start, period_end as inclusive ISO dates), `hdd_ticket_rows` (company_id). Each has an index on its scope columns and a `synced_at` column.
- Non-snapshot tables: `sync_state` (primary key report_type, params_key; last_synced_at, status, error), `manual_inputs` (primary key agency_key, report_type, field_key), `saved_reports` (autoincrement id plus file metadata), and `cache_meta` (key, value) created lazily by the version purge.
- `replace_scope` builds the INSERT column list from each merged row's keys, so every row of a call should carry the same keys as the table; an unknown key raises and the transaction rolls back.
- `_MIGRATIONS` adds columns to existing tables with idempotent `ALTER TABLE ... ADD COLUMN` (`patch_rows.last_user`, `device_rows.autotask_id`). `_REPLACED_TABLES` drops a table outright when it still has a column from an old scope shape (`util_time_rows.quarter`, `util_entry_rows.notes`) and recreates it from the schema; the data is a cache, so refetching is cheaper than backfilling NOT NULL columns.
- `CACHE_VERSION` purge: `cache_meta.version` is compared with `CACHE_VERSION` on every startup. When behind, every table in `_STALE_ON_UPGRADE` (`util_time_rows`, `util_entry_rows`, `device_rows`, `sync_state`) is emptied and the version recorded. The comment block above the constant is the changelog of why each bump happened (company id 0 handling, internal-time labelling, the configuration item id on device rows).
- Emptying `sync_state` on a version bump also forgets that legitimately empty scopes were fetched, so those refetch once on next view.

## Cleanup Notes

- `_STALE_ON_UPGRADE` is a single list applied to every bump, so a bump that only invalidates device rows also clears utilization rows; a per-version map would be more precise.
- `replace_scope` executes one INSERT per row; `executemany` would be faster for the larger tables, but at a few hundred thousand rows the current cost is acceptable.

## Source

[server/repositories/sqlite.py](../../../server/repositories/sqlite.py)
