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

## Vendor client

- [server/tests/test_autotask_client.py](../../../server/tests/test_autotask_client.py) drives [the Autotask client](<../integrations/Reporting Integration - autotask.md>) with a stubbed session: `query_all` walks results with an anchored id cursor, `query_by_ids` chunks the `IN` filter, and picklists are fetched once per entity and field and skip inactive values. Active.

## Aggregation

- [server/tests/test_aggregates.py](../../../server/tests/test_aggregates.py) checks the arithmetic in the report services: ticket breakdowns sum to the ticket count, first-call resolution counts only phone tickets closed the same day by the taker, business-hours calculations skip nights and weekends, the SLA pivot grand total matches the ticket list, utilization totals reconcile, and period labels name the presets. Active.

## Core primitives

- [server/tests/test_core.py](../../../server/tests/test_core.py) covers the log buffer cursor surviving eviction and clear, cooperative cancellation raising at the next log line (see [jobs](<../core/Reporting Core - jobs.md>)), Office product name classification, primary-Office selection preferring a specific plan and then the newest edition, and storage sizes rounding up to the marketing size. Active.

## Write-back

- [server/tests/test_devices_writeback.py](../../../server/tests/test_devices_writeback.py) proves the device update path in [the devices service](<../services/Reporting Service - devices.md>): changes are grouped per device and unknown fields are refused, a failed PATCH is reported per device rather than raised, and the generated device sheet carries an Autotask id for every body row so the client can post edits back. Active.

## HTTP surface

- [server/tests/test_routes.py](../../../server/tests/test_routes.py) uses FastAPI's `TestClient` against the real app: a reversed date range is a 400 carrying the reason, a malformed device update body is a 422, and every response carries `no-store` so a browser never caches report data. Active.
