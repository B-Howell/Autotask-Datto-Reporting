# Progress wire format

> Defines the `[PROGRESS] ` prefix and JSON payload that reports write alongside their log, and the `Phases` helper that lets one bar span a whole run.

## Purpose

A log is written for whoever is debugging; "Page 52: 500 time entries" tells the person waiting nothing about how far along they are. This module puts a second, machine-readable line on the same stream. Phases are named for what they achieve ("Collecting tickets"), not for the API call behind them. The client and the job record read the prefix to tell the two kinds of line apart, so a caller that passes a plain `logger` keeps working unchanged. The prefix is mirrored by `PROGRESS_PREFIX` in the client's `reportJob.ts`.

## Interface

| Name | Description |
|---|---|
| `PROGRESS_PREFIX` | The string `"[PROGRESS] "` (with the trailing space). |
| `emit(logger, phase, done=None, total=None, step=None, steps=None)` | Writes one progress line through `logger`. |
| `Phases(logger, names)` | Holds an ordered list of phase names so each phase knows its position. |
| `Phases.start(name, done=None, total=None)` | Makes `name` current and emits. |
| `Phases.update(done=None, total=None)` | Re-emits the current phase with new counts; a no-op before any `start`. |
| `Phases.done()` | Emits the last phase with `done=1, total=1` so the bar reaches the end. |

## Uses

- `json` only.

## Used By

- [jobs](<Reporting Core - jobs.md>) (`PROGRESS_PREFIX`, to parse lines into the job record)
- [devices service](<../services/Reporting Service - devices.md>), [office_windows service](<../services/Reporting Service - office_windows.md>), [patch_management service](<../services/Reporting Service - patch_management.md>), [hdd_tickets service](<../services/Reporting Service - hdd_tickets.md>), [sla service](<../services/Reporting Service - sla.md>) (`Phases`)
- [utilization service](<../services/Reporting Service - utilization.md>) (`emit`, mapping query labels onto phases)
- [demo data](<../demo/Reporting Demo - data.md>), which emits the same phases as the real fetches
- [reportJob util](<../../client/utils/Reporting Util - reportJob.md>) on the client, which parses the line

## Key Behavior

- The wire format is exactly `PROGRESS_PREFIX + json.dumps({"phase": phase, "done": done, "total": total, "step": step, "steps": steps})`. All five keys are always present; absent values are JSON `null`. Example: `[PROGRESS] {"phase": "Collecting tickets", "done": 1200, "total": null, "step": 1, "steps": 3}`.
- `total` is left `None` when paginating an unknown number of pages. The client then holds the bar at the phase boundary instead of inventing a percentage, so the bar only ever moves forward.
- `step` is the 1-based index of the current phase in `names`; `steps` is `len(names)`. The client gives each phase an equal slice of one bar and fills the slice from `done/total`. A phase name not in `names` emits with `step=None`.
- `Phases.done()` always reports the last declared phase complete, so a run must declare its final phase last in `names` for the bar to end at 100 percent.
- Because progress lines go through the same logger as everything else, they also pass through the job record (`jobs.note`) and the cancel check; a report that only emits progress still gets cancelled promptly.

## Cleanup Notes

- The prefix must stay byte-identical to the client constant; nothing enforces that beyond the comment in each file.

## Source

[server/core/progress.py](../../../server/core/progress.py)
