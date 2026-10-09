# Schedules service

> Validates a schedule (a day of month, an hour and recipients attached to a preset), computes the UTC instant it next runs in the deployment timezone, and keeps that instant moving after each run.

## Purpose

A schedule says "render this preset on the 1st at 07:00 and mail it to these people". The day and hour are what the user means on the wall clock, so they are read in `settings.schedule_timezone` (the `SCHEDULE_TIMEZONE` setting in [config](<../Reporting Server - config.md>)); the scheduler loop, on the other hand, compares UTC text in the [schedules repository](<../repositories/Reporting Repository - schedules.md>). This module is the bridge: every create and update passes through `_validated` and `_with_next_run`, which check the fields, normalize the addresses and write `next_run_at` as an ISO-8601 UTC string with a `+00:00` offset. It is the only code that computes `next_run_at`; the repository stores and compares it, nothing more.

## Interface

| Name | Description |
|---|---|
| `next_run_after(now, day_of_month, hour, tz)` | The ISO UTC string of the first occurrence of `day_of_month` at `hour:00` in `tz` strictly after the aware datetime `now`. A day past the end of a month runs on that month's last day. |
| `create(schedule)` | Validates, computes `next_run_at`, inserts and returns the stored row. |
| `update(schedule_id, changes)` | Loads the current row, lays `changes` over it, re-validates the whole thing, recomputes `next_run_at` and writes it back; returns the stored row. Raises `LookupError` when the id does not exist. |
| `get(schedule_id)` | The stored row or None. |
| `list_schedules()` | Every schedule ordered by id, each carrying its preset row under `preset` (None if the preset is gone). |
| `delete(schedule_id)` | Removes the schedule and its runs. |
| `advance(schedule)` | After a scheduled run: sets `next_run_at` to the occurrence after now. Takes the decoded row because the scheduler already has it. |
| `record_result(schedule_id, status, error=None)` | Stamps `last_run_at` with the current UTC time and sets `last_status` and `last_error`. |

Validation failures raise `ValueError` with a message meant for the user: `No such preset`, `day_of_month must be a whole number`, `hour must be a whole number`, `day_of_month must be between 1 and 31`, `hour must be between 0 and 23`, `A subject is required`, `Not an email address: <address>`, `At least one recipient is required`, and `SCHEDULE_TIMEZONE is not a known IANA zone: <value>`.

## Uses

- Standard library `calendar`, `re`, `datetime` and `zoneinfo`.
- [config](<../Reporting Server - config.md>) for `schedule_timezone`.
- [presets repository](<../repositories/Reporting Repository - presets.md>) for `get` (the preset must exist) and `list_presets` (the join in `list_schedules`). The [presets service](<Reporting Service - presets.md>) is not called: a schedule never changes a preset, it only needs to know one is there.
- [schedules repository](<../repositories/Reporting Repository - schedules.md>), imported as `repo`, for every read and write.
- [sqlite repository](<../repositories/Reporting Repository - sqlite.md>) for `iso_now`, so `last_run_at` is written in the same format as every other timestamp.

## Used By

- [server/tests/test_schedules.py](../../../server/tests/test_schedules.py).
- The schedules router and the scheduler loop that the scheduled-delivery branch adds next: the router calls `create`, `update`, `list_schedules` and `delete`; the loop calls `advance` and `record_result` after each due run.

## Key Behavior

- `next_run_after` builds the candidate as a wall-clock time in `tz` by replacing the fields of `now.astimezone(tz)`, then converts with `astimezone(UTC)`. `zoneinfo` recomputes the offset for the new wall time, so a daylight-saving change between now and the candidate is reflected: from 9 Oct 2026 (EDT) in `America/New_York`, "the 1st at 07:00" resolves to `2026-11-01T12:00:00+00:00`, because US daylight time ended at 02:00 that morning and 07:00 is EST. The test for this case states the expected UTC value explicitly.
- "Strictly after" means a run at exactly the scheduled time is not scheduled again for the same instant: at 07:00:00 sharp the next occurrence is next month. The scheduler calls `advance` after a run, so the time it passes as `now` is always at or after the run it just made.
- Day clamping: `min(day_of_month, last_day)` per month, so a schedule on the 31st runs on 30 Nov, 28 Feb and 29 Feb in a leap year. The loop checks at most the current and the following month; one of them always contains an occurrence after now, so the trailing `RuntimeError` is unreachable.
- The UTC string comes from `datetime.isoformat()` on an aware UTC value, which emits `+00:00`, never `Z`. The repository's text comparison depends on that; see its page for why `Z` would sort wrong.
- `recipients_to` and `recipients_cc` are stripped, lower-cased and checked against a deliberately loose pattern (`something@something.tld`, no whitespace); blank entries are dropped silently, `None` is treated as an empty list, and a bare string is wrapped as a one-element list so `"a@example.com"` is one address rather than a sequence of single-character rejects. `to` must end up with at least one address, `cc` may be empty.
- `day_of_month` and `hour` are parsed as numbers and must be integral: a bool or `None` is refused first, so `True` is not silently accepted as day 1 and a missing hour defaults to 7 only when the key is absent, not when it is sent as null; `7.5` (or `"7.5"`) is refused rather than truncated to 7, while `7.0` is accepted. A string that is not a number gets the same `must be a whole number` message rather than a bare `int()` traceback.
- `enabled` defaults to true on create. A disabled schedule gets `next_run_at = None`, which also takes it out of the repository's `due()` query; re-enabling recomputes it from now, so a schedule paused across its usual day does not fire late the moment it is resumed.
- `update` validates the merged row, not the delta, and always recomputes `next_run_at`: changing only the subject still moves `next_run_at` to the next occurrence from now, which is the same value unless the previous one has passed. The consequence is that editing any field of a schedule whose run is overdue but not yet picked up by the loop skips that run; this is acceptable because the loop ticks every minute, so the window is at most one tick. Keys other than the validated fields (the `last_*` columns, `id`, timestamps) are not touched by `update`; only `record_result` writes the `last_*` columns.
- `_tz()` resolves the zone on every call rather than at import, so a bad `SCHEDULE_TIMEZONE` is reported as a `ValueError` naming the setting when a schedule is first created, updated or advanced, instead of preventing the server from starting. On Windows and slim containers the zone database comes from the `tzdata` package; a missing database raises the same error.
- `list_schedules` fetches every preset once and joins in Python; with a handful of schedules this is cheaper than a query per row and avoids adding a join to the repository.

## Cleanup Notes

- `advance` and `record_result` are two separate updates; the scheduler loop that calls them should call `advance` first so a crash between the two leaves the schedule pointing at the future rather than re-firing.
- A schedule whose preset was deleted out from under it (the presets service refuses this, but the database does not) lists with `preset: None`; the router should treat that as an error state rather than render it.
- The email pattern accepts addresses that no mail server would (`a@b.c`); the delivery flow is the real check.

## Source

[server/services/schedules.py](../../../server/services/schedules.py)
