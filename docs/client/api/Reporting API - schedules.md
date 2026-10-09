# Schedules API

> Creates and edits schedules, reads their run history, drives the runner (run now, status, log stream) and offers the two pre-flight checks the scheduled reports page uses.

## Purpose

`client/src/api/schedules.ts` wraps the `/api/schedules` routes. A schedule says when a preset runs (day of month and hour in the server's timezone), who receives the file, and the subject and body of the message. Beyond the rows themselves the module carries the operational view: the run history table, the runner status and its server-sent log stream, a run-now trigger, and two checks that can be made before anyone waits for the first of the month (is the renderer up, does the delivery flow accept mail).

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchSchedules` | `GET /api/schedules` | none | `Promise<ReportSchedule[]>`, each with its `preset` attached |
| `createSchedule` | `POST /api/schedules` | `body: ScheduleInput` | `Promise<ReportSchedule>` (201) |
| `updateSchedule` | `PUT /api/schedules/{id}` | `id: number`, `body: Partial<ScheduleInput>` | `Promise<ReportSchedule>` |
| `deleteSchedule` | `DELETE /api/schedules/{id}` | `id: number` | `Promise<{ deleted: boolean }>` |
| `fetchRuns` | `GET /api/schedules/{id}/runs` or `GET /api/schedules/runs` | `scheduleId?: number` | `Promise<ScheduleRun[]>` |
| `runNow` | `POST /api/schedules/{id}/run` | `id: number` | `Promise<{ started: boolean }>` (202) |
| `fetchRunnerStatus` | `GET /api/schedules/status` | none | `Promise<RunnerStatus>` |
| `scheduleLogsUrl` | `GET /api/schedules/logs` (SSE) | none | The URL string, for an `EventSource` |
| `fetchRendererHealth` | `GET /api/schedules/renderer-health` | none | `Promise<RendererHealth>` |
| `sendTestEmail` | `POST /api/schedules/test-delivery` | `to: string[]` | `Promise<{ sent: boolean }>` |

## Uses

- [client](<Reporting API - client.md>): `getJson`, `postJson`, `putJson`, `deleteJson`.
- [types](<Reporting API - types.md>): `ReportSchedule`, `ScheduleInput`, `ScheduleRun`, `RunnerStatus`, `RendererHealth`.

## Used By

- [useScheduleDialog](<../components/report/Reporting Report Component - useScheduleDialog.md>) calls `createSchedule` after the preset is stored.
- The scheduled reports page (not yet built) will use the list, run, status, log and check functions.

## Key Behavior

- `createSchedule` and `updateSchedule` return the row joined with its preset, the same shape the list serves, so a page can append the result without a refetch. The server computes `next_run_at` on every write; the client never sends it.
- Validation failures (no recipient, an address without `@`, `day_of_month` outside 1 to 31, `hour` outside 0 to 23, a blank subject, an unknown `preset_id`) arrive as a 400 `ApiError` whose message names the field.
- `fetchRuns()` with no id is the cross-schedule history (newest first, the server's default limit of 50); `fetchRuns(id)` is one schedule's history and rejects with 404 for an unknown id.
- `runNow` resolves as soon as the runner accepts the schedule (202) and rejects with a 409 `ApiError` naming the schedule already in flight; progress is followed through the log stream, not the response.
- `scheduleLogsUrl` returns a path rather than opening the stream, because an `EventSource` has its own lifecycle that the owning hook must close.
- `fetchRendererHealth` and `sendTestEmail` reject with a 502 `ApiError` carrying the renderer or delivery error text when the respective service is down.
- Routes are listed under [Reporting Router - schedules](<../../server/routers/Reporting Router - schedules.md>).

## Cleanup Notes

- Covered by `schedules.test.ts`.

## Source

[client/src/api/schedules.ts](../../../client/src/api/schedules.ts)
