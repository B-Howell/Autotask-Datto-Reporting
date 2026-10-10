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

- Standard library `threading`.
- [sqlite repository](<../repositories/Reporting Repository - sqlite.md>) `iso_now`, the tick's `now`: the same offset-bearing UTC format every writer of `next_run_at` uses, which is what makes the repository's `due()` text comparison correct.
- [streams](<../core/Reporting Core - streams.md>) `report_logger(STREAM, clear=True)`: one logger per batch, so a tick that starts three schedules writes them one after another into a buffer cleared at the start of the batch.
- [schedules repository](<../repositories/Reporting Repository - schedules.md>) `due`, `close_running`, and the `TRIGGER_SCHEDULE` and `TRIGGER_MANUAL` constants a batch is started with.
- [schedules service](<Reporting Service - schedules.md>) `get`, to re-read each schedule just before it runs.
- [scheduled_runs service](<Reporting Service - scheduled_runs.md>) `run_schedule`, with the trigger and the batch logger.

## Used By

- [server/tests/test_schedule_runner.py](../../../server/tests/test_schedule_runner.py).
- [main](<../Reporting Server - main.md>): `sweep_interrupted()` once at startup, then `runner.tick()` from the `_schedule_ticker` task.
- [schedules router](<../routers/Reporting Router - schedules.md>): `runner.run_now` from the run-now route, `runner.status` from `/status`, and `STREAM` for the `/logs` route.

## Key Behavior

- One thread, started under the lock only when no thread is alive. `_start` records the first schedule id as `_current` before the thread exists, so a `status()` read in the same request that called `run_now` already names the schedule; the worker then updates `_current` as it moves through the batch and clears it at the end. `status()` reports `running` from `Thread.is_alive()` rather than a flag, so a thread that died unexpectedly cannot leave the runner reporting busy forever.
- A tick while a run is in flight does nothing and does not queue: `due()` compares `next_run_at <= now`, and the run that is in flight advances its own schedule, so whatever else was due is still due on the next tick and starts then. A missed minute (a slow tick, a paused container) is harmless for the same reason.
- Each schedule is re-read with `schedules.get` just before it runs, because a tick collects its ids up front and the later ones wait on the earlier ones. A schedule deleted in the meantime is skipped with `[INFO] Schedule <id> no longer exists; skipped`; one switched off is skipped with `[INFO] Schedule <id> is disabled; skipped` when the trigger is `schedule`. A manual run-now still runs a disabled schedule: that is how a schedule is tried from the page before it is switched on, and the page asked for that exact id.
- The batch keeps going when one schedule fails to start: `run_schedule` records every failure on its own run row and only raises for an unknown id, so the `except` here logs `[ERROR] Schedule <id>: <reason>` to the stream and moves to the next id rather than losing the rest of the morning's sends to one deleted schedule.
- The sweep exists because a run row is opened before the work and closed after it, so a process killed mid-render leaves a row in `running` that nothing will revisit. The schedule itself was advanced as the first step of that run, so the sweep closes the row as an error and does not re-run it; the error text tells the page what happened. The saved report id on the row is kept when the save had already happened.
- `tick()` is one SQLite query and, at most, a thread start; it never blocks on the run. `main` still calls it through `asyncio.to_thread`, because the sqlite repository's single connection and lock can be held by a snapshot swap for a while, and on the event loop that wait would stall every request.
- `join` is for tests and for shutdown: `main`'s `lifespan` calls `join(timeout=1)` after cancelling its tasks, which only lets a run on its last step close its row. The thread is a daemon, so a run still rendering ends with the process; the sweep on the next start closes whatever it left behind.
- If `schedules.advance` raises inside a scheduled run (an invalid `SCHEDULE_TIMEZONE` set after schedules already exist is the realistic case), `next_run_at` is never moved: the run closes as `error` with the reason, the schedule stays due, and the next tick starts it again, so the schedule is retried every poll interval and gains an error row each time until the setting is fixed. Fixing `SCHEDULE_TIMEZONE` and restarting stops it; the next run then advances normally. Nothing is rendered or sent on those attempts, since advancing is the first step of a scheduled run.

## Cleanup Notes

- `tick()` starts every due schedule on one thread in `due()` order; a long batch delays the later ones by the earlier ones' run time, which is fine for a few monthly reports but would want a queue if schedules grew to dozens.
- The log buffer is cleared per batch, so the page sees only the current batch's lines; earlier runs are visible through their run rows, not the stream.

## Source

[server/services/schedule_runner.py](../../../server/services/schedule_runner.py)
