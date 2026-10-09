# Job record

> The server-side record of the one report currently in progress: its label, status, latest progress, and the cancel flag that cooperative cancellation reads.

## Purpose

Reports run for minutes in a uvicorn worker thread and keep going whether or not the browser that asked is still open. Keeping the current run in process memory lets a reloaded page rebuild the status bar from `GET /api/jobs/current` and lets several tabs agree on what is running. Only the current run is kept; there is no history and no persistence. The design decision is that cancellation is cooperative: a worker thread cannot be killed, so the flag is checked by the per-run logger on every log line and surfaces as `ReportCancelled` inside the report.

## Interface

| Name | Description |
|---|---|
| `ReportCancelled` | Exception raised inside a report when the run has been flagged cancelled. |
| `start(label)` | Replaces any previous record with a new running job and returns its id, `f"{label}-{time.time()}"`. |
| `cancel(job_id=None)` | Sets the cancel flag. Returns `False` if nothing is running, the job is not in status `running`, or `job_id` is given and does not match. |
| `raise_if_cancelled(job_id)` | Raises `ReportCancelled` when the current job has that id and is flagged; a no-op for any other id. |
| `note(job_id, message)` | Records a log line against that job only. |
| `note_current(message)` | Records a log line against whichever job is running, for endpoints that contribute to a run they did not start. |
| `finish(job_id, error=None, cancelled=False)` | Closes the job: `cancelled` if asked or if the flag was set, else `error` or `done`; stamps `finished_at`. |
| `current()` | A copy of the record, or `None`. |
| `clear()` | Drops the record. |

Record fields: `id`, `label`, `status` (`running`, `done`, `error`, `cancelled`), `progress` (parsed `[PROGRESS]` JSON or `None`), `status_text` (last non-progress line), `error`, `started_at`, `finished_at` (epoch seconds), `cancelled`.

## Uses

- `threading.Lock`, `json`, `time`
- [progress](<Reporting Core - progress.md>) for `PROGRESS_PREFIX`

## Used By

- [streams](<Reporting Core - streams.md>) (`note`, `raise_if_cancelled` from the per-run logger)
- [routers common](<../routers/Reporting Router - common.md>) (`start`, `finish`, `note`, `ReportCancelled`)
- [jobs router](<../routers/Reporting Router - jobs.md>) (`current`, `cancel`, `clear`)
- [utilization router](<../routers/Reporting Router - utilization.md>) (`note_current`)
- [server/tests/test_core.py](../../../server/tests/test_core.py)

## Key Behavior

- Every function takes the module lock; `current()` returns a shallow copy so callers never hold a reference to the live dict.
- `_absorb` is the single place a log line becomes state: a line starting with `[PROGRESS] ` has its JSON tail parsed into `progress` (a malformed tail is ignored), any other line replaces `status_text`.
- `start` replaces the record unconditionally. If a report is still running when another starts, the first run is orphaned: its later `note`, `raise_if_cancelled` and `finish` calls all compare ids and become no-ops, so it can no longer be cancelled and its outcome is never recorded. This is the known single-process limit described in the architecture notes.
- `cancel` only flags a job in status `running`; cancelling a finished job returns `False` (covered by `test_cancelling_a_job_raises_at_the_next_log_line`).
- `finish` prefers `cancelled` over `error`: if the flag was set and the run then failed, the status is `cancelled` and `error` is cleared.
- `raise_if_cancelled` releases the lock before raising, so the exception never propagates with the lock held.
- Nothing here is persisted; a server restart forgets the current job and the client sees `{}`.

## Cleanup Notes

- The `job_id` argument of `cancel` is never supplied by any caller; the jobs router always cancels whatever is running.

## Source

[server/core/jobs.py](../../../server/core/jobs.py)
