# Demo seed

> Command-line entry point that fills the SQLite cache, the agency list and a set of licence counts with demo data by running the normal sync against the demo generators.

## Purpose

A fresh demo container has an empty database and no agencies. Running `python -m demo.seed` from `server/` with `DEMO_MODE=1` leaves every snapshot table exactly as a real sync would, so the first page load is instant and the screenshots are reproducible. It is safe to run repeatedly: every write is a snapshot replace or an upsert.

## Interface

| Name | Description |
|---|---|
| `DEMO_LICENCES` | The manual-input field keys and values written for the first demo agency's licensing report. |
| `seed_manual_inputs()` | Writes `DEMO_LICENCES` under report type `office_windows` for `DEMO_AGENCIES[0]`. |
| `main()` | Initialises the database, replaces the agency list, seeds the licence counts, runs the sync, prints `Demo data ready`. |

Flags: `--verbose` prints every log line; otherwise only `[DONE]`, `[WARN]` and `[ERROR]` lines are printed and a one-line progress counter is redrawn in place.

## Uses

- Standard library `os`, `sys`.
- [demo data](<Reporting Demo - data.md>) (`DEMO_AGENCIES`)
- [manual_inputs repository](<../repositories/Reporting Repository - manual_inputs.md>) and [sqlite repository](<../repositories/Reporting Repository - sqlite.md>) (`init_db`)
- [agencies service](<../services/Reporting Service - agencies.md>) (`replace_agencies`)
- [sync service](<../services/Reporting Service - sync.md>) (`run_sync`)

## Used By

- Nothing imports this; it is an entry point. The demo compose override runs it before the server starts, and the README lists it as the optional development step.

## Key Behavior

- `DEMO_MODE` is forced to `1` in the environment before any project import, because `config.settings` is evaluated at import time and the snapshot repository checks `settings.demo_mode` to route fetches to the generators.
- What it writes: `agencies.json` (the 25 demo agencies, sorted by name by `replace_agencies`), the `manual_inputs` rows for agency 1000, and then, through `run_sync`, every snapshot the sync covers: per agency `patch_rows`, `office_windows_counts`, `device_rows`, `hdd_ticket_rows` and the current month's `ticket_rows`; the current month's `sla_ticket_rows`; and `util_time_rows` plus `util_entry_rows` for the current quarter and the current fiscal year. `sync_state` gets one `ok` row per scope.
- Months other than the current one are not seeded; they are produced on first view, which takes about a second each in demo mode.
- The licence keys show the client's manual-input convention: a bare product name holds the owned count, `available::<product>` the spare count, and `officeLicense::visibleSkus` a JSON array naming which SKUs the licensing page displays.
- The quiet-mode progress line truncates the step label to 60 characters and uses a carriage return, so it renders as a single updating line in a terminal and as many lines in a captured log.

## Cleanup Notes

- Nothing exercises `--verbose` automatically; it is a manual aid only.

## Source

[server/demo/seed.py](../../../server/demo/seed.py)
