# Jobs router

> The status bar's view of the server: read the current report job, cancel it, dismiss it.

## Purpose

Reports run in a worker thread and outlive the page that asked for them. These routes expose the in-memory job record so a reloaded page can rebuild the status bar, several tabs can agree on what is running, and the Cancel button can reach a run that another tab started. The client polls the current job every two seconds and reconciles it with the runs it started itself.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/api/jobs/current` | none | the job record (`id, label, status, progress, status_text, error, started_at, finished_at, cancelled`) or `{}` when none | none |
| POST | `/api/jobs/current/cancel` | none | `{cancelled: bool}` | none |
| DELETE | `/api/jobs/current` | none | `{ok: true}` | none |

No SSE, no `run_report`; these routes read and flag the record that `run_report` maintains.

## Uses

- `fastapi.APIRouter`
- [jobs](<../core/Reporting Core - jobs.md>) (`current`, `cancel`, `clear`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [client jobs API](<../../client/api/Reporting API - jobs.md>) (`fetchCurrentJob`, `cancelCurrentJob`, `dismissCurrentJob`)

## Key Behavior

- An empty record is answered as `{}` rather than `null`; the client checks for an `id` field to decide whether anything is running.
- Cancel always targets whatever job is running (no id is passed). It answers `cancelled: false` when nothing is running or the job has already finished, and `true` when the flag was set; the report itself stops at its next log line, so the record stays `running` for a moment after a `true`.
- A `done`, `error` or `cancelled` record persists until something dismisses it or a new report starts; DELETE is how the status bar clears a finished row.
- Dismissing while a report is still running drops the record but does not stop the run; the run continues, can no longer be cancelled, and its outcome is never recorded.
- The record is process memory, so a server restart answers `{}` even if a report was in flight.

## Cleanup Notes

- DELETE does not check the status, so a client can dismiss a running job; guarding on `status == "running"` would prevent orphaning a run by accident.

## Source

[server/routers/jobs.py](../../../server/routers/jobs.py)
