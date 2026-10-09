---
project: "Autotask Datto Reporting"
coverage_inventory: true
coverage_kind: grouped
---

# Server test inventory

The pytest suite under `server/tests/`. Each file targets one layer and is named for the behavior it proves, so a failing test name reads as a sentence. The suite runs in CI after lint and needs no vendor accounts: the fixtures set `DEMO_MODE` before settings load and use a temporary SQLite file for anything that touches the cache.

## Fixtures

- [server/tests/conftest.py](../../../server/tests/conftest.py) sets `DEMO_MODE=1` before `config` is imported so the settings load without credentials, then provides `temp_db`: a fresh SQLite file under `tmp_path` with the repository's module-level connection reset, and demo mode switched off for the snapshot layer so the fetch callback a test passes is the one that actually runs. The connection is closed and reset after each test. Active.

## Cache and persistence

- [server/tests/test_snapshots.py](../../../server/tests/test_snapshots.py) proves the read-through cache in [snapshots](<../repositories/Reporting Repository - snapshots.md>): a miss fetches, stores and records sync state; a hit returns stored rows without calling fetch; refresh replaces the whole scope; scopes do not bleed into each other; an empty result is cached rather than refetched; and a fetch error keeps the old snapshot while recording the error. Active.

- [server/tests/test_schedule_repositories.py](../../../server/tests/test_schedule_repositories.py) round-trips the [presets](<../repositories/Reporting Repository - presets.md>) and [schedules](<../repositories/Reporting Repository - schedules.md>) repositories against a temporary database: a preset's `options` survive as a dict and stray keys such as `id` or `created_at` are ignored on insert and update; a schedule's recipient lists come back as lists and `enabled` as a bool; a run opens as `running` and closes with its status and saved report id; `due()` returns only enabled schedules with a non-null `next_run_at` at or before the given instant, soonest first, and compares correctly when the caller's instant carries microseconds and the stored value does not; `list_for_preset` returns only the schedules of one preset; deleting a schedule removes its runs; and a cache-version bump (`cache_meta.version` set back to 1, then the sqlite module's stale-cache discard) empties `device_rows` while leaving the preset, schedule and run rows in place. Active.

## Vendor client

- [server/tests/test_autotask_client.py](../../../server/tests/test_autotask_client.py) drives [the Autotask client](<../integrations/Reporting Integration - autotask.md>) with a stubbed session: `query_all` walks results with an anchored id cursor, `query_by_ids` chunks the `IN` filter, and picklists are fetched once per entity and field and skip inactive values. Active.

## Aggregation

- [server/tests/test_aggregates.py](../../../server/tests/test_aggregates.py) checks the arithmetic in the report services: ticket breakdowns sum to the ticket count, first-call resolution counts only phone tickets closed the same day by the taker, business-hours calculations skip nights and weekends, the SLA pivot grand total matches the ticket list, utilization totals reconcile, and period labels name the presets. Active.

## Configuration

- [server/tests/test_config.py](../../../server/tests/test_config.py) calls `load_settings()` in [config](<../Reporting Server - config.md>) directly, with the scheduled-delivery variables removed from the environment and then set, to prove the defaults (`http://localhost:3100`, an empty delivery URL, `UTC`, a 60 second poll) and that `RENDERER_URL` loses its trailing slash. Active.

## Core primitives

- [server/tests/test_core.py](../../../server/tests/test_core.py) covers the log buffer cursor surviving eviction and clear, cooperative cancellation raising at the next log line (see [jobs](<../core/Reporting Core - jobs.md>)), Office product name classification, primary-Office selection preferring a specific plan and then the newest edition, and storage sizes rounding up to the marketing size. Active.

## Presets

- [server/tests/test_presets.py](../../../server/tests/test_presets.py) covers validation in [the presets service](<../services/Reporting Service - presets.md>): an unknown report type is refused, a devices preset needs an agency while an SLA preset has its agency dropped, options are filtered to the keys the renderer reads and `format` must be `docx` or `pdf`, device `columns` must be a list of names and an integer agency id is stored as text, a blank name is refused, `showLicenses` must be a bool, annual `companies` must be a list of strings and `rates` a dict of string keys to numbers or strings (a list, a `None` value, a list value and an integer key are each refused), `update` re-validates the merged row (so switching an SLA preset to `patch` without an agency fails) and raises `LookupError` for a missing id, deleting a preset is refused while a schedule references it and succeeds once that schedule is gone, and the set of report types matches the renderer's handler table. Active.

## Write-back

- [server/tests/test_devices_writeback.py](../../../server/tests/test_devices_writeback.py) proves the device update path in [the devices service](<../services/Reporting Service - devices.md>): changes are grouped per device and unknown fields are refused, a failed PATCH is reported per device rather than raised, and the generated device sheet carries an Autotask id for every body row so the client can post edits back. Active.

## HTTP surface

- [server/tests/test_routes.py](../../../server/tests/test_routes.py) uses FastAPI's `TestClient` against the real app: a reversed date range is a 400 carrying the reason, a malformed device update body is a 422, and every response carries `no-store` so a browser never caches report data. Active.
- [server/tests/test_tenant.py](../../../server/tests/test_tenant.py) covers [the tenant service](<../services/Reporting Service - tenant.md>) and [its router](<../routers/Reporting Router - tenant.md>): the defaults answer when there is no file or when the file holds a list or `null` rather than an object, file values are laid over the defaults one key at a time, `safe_filename` refuses `../x`, `..\x`, `..`, `.` and an empty name while passing `logo.png` through, a `group:<name>` dropdown value resolves to the agencies sharing the group's name prefix while a plain id resolves to one agency, and the logo route refuses a name that is not its own base name and answers 404 for a missing file. The service tests point `TENANT_FILE` at a temporary path and replace `get_agencies` on the module, so no database is needed. Active.
