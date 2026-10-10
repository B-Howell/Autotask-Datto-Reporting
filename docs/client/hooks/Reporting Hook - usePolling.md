# usePolling

> Calls a function at once and then on a fixed interval while enabled, clearing the timer on unmount and rebuilding it when the interval or the flag changes.

## Purpose

Three places in the client ask the server the same question over and over: the schedule list and runner status, the renderer's health, and the sync status while a sync runs. Each used to carry its own `useEffect` with a `setInterval` and a `clearInterval`, and each got the cadence rule slightly differently (one rebuilt the timer through a ref, one closed over a function defined inside the effect). `usePolling` is that effect written once, so a caller states only the function, the cadence and when polling is on.

## Interface

`usePolling(fn: () => void | Promise<void>, intervalMs: number, enabled = true): void`

| Argument | Description |
|---|---|
| `fn` | What to call. Its identity is an effect dependency, so a caller memoises it (`useCallback`) or passes a module-level function; a new identity each render would restart the timer each render. A returned promise is dropped; the function owns its own error handling. |
| `intervalMs` | The gap between calls after the first. Changing it restarts the cycle with an immediate call. |
| `enabled` | `false` clears the timer and makes no calls; flipping to `true` starts again with an immediate call. |

## Uses

- `react` (`useEffect`) and the browser timers.

## Used By

- [useSchedules](<../pages/scheduledReports/Reporting Scheduled Reports - useSchedules.md>): `usePolling(refresh, running ? 5000 : 30000)`, so a run in flight flips the cadence and refreshes at once.
- [RendererStatusChip](<../pages/scheduledReports/Reporting Scheduled Reports - RendererStatusChip.md>): the health check every 60 s.
- [useSyncStatus](<../pages/settings/Reporting Settings - useSyncStatus.md>): `usePolling(refresh, 1500, status.running)`, polling only while a sync runs.
- [client/src/hooks/usePolling.test.ts](../../../client/src/hooks/usePolling.test.ts), under fake timers.

## Key Behavior

- The first call happens synchronously inside the effect, so a page shows fresh data on mount rather than one interval later.
- Every dependency change (`fn`, `intervalMs`, `enabled`) runs the cleanup and the effect again: the old timer is cleared before a new one starts, so two timers never overlap and a faster cadence takes effect immediately with a call.
- A call that is still pending when the next tick fires is not awaited or cancelled; callers that care about ordering (as `useSchedules` does with its ticket counter) handle it in `fn`.
- While `enabled` is false the effect returns nothing, so there is no timer to clear and no call is made.

## Cleanup Notes

- Covered by `usePolling.test.ts`.

## Source

[client/src/hooks/usePolling.ts](../../../client/src/hooks/usePolling.ts)
