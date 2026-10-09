# Schedule runner service

> Owns the one scheduled run allowed in flight: the once-a-minute check for due schedules, the run-now entry point the page uses, the worker thread that hands each schedule to the scheduled runs service in turn, and the startup sweep that closes runs a previous process left open.

## Purpose

The [scheduled_runs service](<Reporting Service - scheduled_runs.md>) knows how to run one schedule; this module decides when, and makes sure only one runs at a time. Two reports rendering together would double the load on the vendor APIs and the renderer for no benefit, and a manual run-now overlapping a scheduled send would interleave their log lines on the page, so everything funnels through one daemon thread. The loop in [main](<../Reporting Server - main.md>) calls `tick()` on the event loop every `SCHEDULE_POLL_SECONDS`; the schedules router's run-now route calls `run_now()` from a request. Neither waits for the run; the page follows the `schedules` log stream and polls `status()`. The module follows the shape of the [sync service](<Reporting Service - sync.md>)'s `SyncRunner`: a lock, a thread, and a refusal to start while one is alive.

## Interface

| Name | Description |
|---|---|
| `STREAM` | `schedules`, the [streams](<../core/Reporting Core - streams.md>) buffer every run logs to; the router's `/logs` route follows it. |
| `INTERRUPTED` | `Interrupted by a restart`, the error text `sweep_interrupted` writes on a stranded run. |
| `ScheduleRunner()` | The worker owner. `status()` returns `{running: bool, schedule_id}`, the schedule the thread is on or `None`. `tick()` reads `due(now)` and starts every due id, soonest first, on one thread with trigger `schedule`; it starts nothing while a run is in flight. `run_now(schedule_id)` starts that one schedule with trigger `manual` and returns `False` instead when a run is in flight. `join(timeout=5)` waits for the thread, for tests. |
| `sweep_interrupted()` | Closes every run row still in `running` as `error` with `INTERRUPTED`, through the [schedules repository](<../repositories/Reporting Repository - schedules.md>)'s `close_running`, and returns the count. Called once from `lifespan` before the loop starts. |
| `runner` | The module-level `ScheduleRunner` that `main` and the schedules router share, so a tick and a run-now contend for the same thread. |

## Uses

- Standard library `threading` and `datetime` (the tick's `now` is `datetime.now(UTC).isoformat()`, the same offset-bearing format the repository's `due()` compares as text).
- [streams](<../core/Reporting Core - streams.md>) `report_logger(STREAM, clear=True)`: one logger per batch, so a tick that starts three schedules writes them one after another into a buffer cleared at the start of the batch.
- [schedules repository](<../repositories/Reporting Repository - schedules.md>) `due` and `close_running`.
- [scheduled_runs service](<Reporting Service - scheduled_runs.md>) `run_schedule`, with the trigger and the batch logger.

## Used By

- [server/tests/test_schedule_runner.py](../../../server/tests/test_schedule_runner.py).
- [main](<../Reporting Server - main.md>): `sweep_interrupted()` once at startup, then `runner.tick()` from the `_schedule_ticker` task.
- [schedules router](<../routers/Reporting Router - schedules.md>): `runner.run_now` from the run-now route, `runner.status` from `/status`, and `STREAM` for the `/logs` route.

## Key Behavior

- One thread, started under the lock only when no thread is alive. `_start` records the first schedule id as `_current` before the thread exists, so a `status()` read in the same request that called `run_now` already names the schedule; the worker then updates `_current` as it moves through the batch and clears it at the end. `status()` reports `running` from `Thread.is_alive()` rather than a flag, so a thread that died unexpectedly cannot leave the runner reporting busy forever.
- A tick while a run is in flight does nothing and does not queue: `due()` compares `next_run_at <= now`, and the run that is in flight advances its own schedule, so whatever else was due is still due on the next tick and starts then. A missed minute (a slow tick, a paused container) is harmless for the same reason.
- The batch keeps going when one schedule fails to start: `run_schedule` records every failure on its own run row and only raises for an unknown id, so the `except` here logs `[ERROR] Schedule <id>: <reason>` to the stream and moves to the next id rather than losing the rest of the morning's sends to one deleted schedule.
- The sweep exists because a run row is opened before the work and closed after it, so a process killed mid-render leaves a row in `running` that nothing will revisit. The schedule itself was advanced as the first step of that run, so the sweep closes the row as an error and does not re-run it; the error text tells the page what happened. The saved report id on the row is kept when the save had already happened.
- `tick()` is safe on the event loop: it runs one SQLite query and, at most, starts a thread. It never blocks on the run.
- `join` is for tests; the application never waits for the worker. The thread is a daemon, so shutdown does not wait for a run in progress; the sweep on the next start closes whatever it left behind.

## Cleanup Notes

- `tick()` starts every due schedule on one thread in `due()` order; a long batch delays the later ones by the earlier ones' run time, which is fine for a few monthly reports but would want a queue if schedules grew to dozens.
- The log buffer is cleared per batch, so the page sees only the current batch's lines; earlier runs are visible through their run rows, not the stream.

## Source

[server/services/schedule_runner.py](../../../server/services/schedule_runner.py)
