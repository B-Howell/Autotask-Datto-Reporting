# Agencies service

> The list of clients this deployment reports on, stored as a JSON file under the data directory and edited through a lock.

## Purpose

Each agency pairs an Autotask company id with the Datto RMM site that holds its agents, plus a display name. The list is kept in `agencies.json` rather than SQLite because it is edited by hand as often as by the app, and a small readable file is easier to inspect or restore than a table. This module is the only reader and writer of that file; the router, the sync and the disk-space report all go through it.

## Interface

| Name | Description |
|---|---|
| `AGENCIES_FILE` | `<data_dir>/agencies.json`. |
| `get_agencies()` | The stored list, or `[]` when the file is missing, unreadable or not a JSON list. |
| `replace_agencies(agencies)` | Overwrites the file with the given list sorted by lower-cased name. |
| `add_agency(agency)` | Appends unless an entry with the same `id` exists, re-sorts, writes, and returns the full list. |
| `remove_agency(agency_id)` | Drops every entry with that `id`, writes, and returns the full list. |

An agency dict has the keys `id` (int, Autotask company id), `site` (Datto site uid string) and `name`.

## Uses

- Standard library `json`, `os`, `threading.Lock`.
- [config](<../Reporting Server - config.md>) for `settings.data_dir`.

## Used By

- [agencies router](<../routers/Reporting Router - agencies.md>)
- [sync service](<Reporting Service - sync.md>) (builds one step per agency)
- [hdd_tickets service](<Reporting Service - hdd_tickets.md>) (defaults to every agency when none are named)
- [demo seed](<../demo/Reporting Demo - seed.md>) (`replace_agencies` with the demo list)

## Key Behavior

- All four public functions take the module lock, so concurrent edits from the settings page and a running sync cannot interleave a read-modify-write.
- `_load` is forgiving: a corrupt file is treated as empty rather than crashing the app; the next write replaces it.
- `_write` creates the data directory on demand and writes with `indent=2` so the file stays diff-friendly.
- Duplicate detection is by `id` only; two entries may share a name, and `replace_agencies` performs no de-duplication at all.
- Ordering is by name, case-insensitively, so the dropdown order in the client matches the file.

## Cleanup Notes

- `remove_agency` does not report whether anything was removed; the router cannot distinguish a no-op from a deletion.

## Source

[server/services/agencies.py](../../../server/services/agencies.py)
