# reportDataStore

> Factory and helpers for the state every long-running report shares: result, in-flight flag, error and log tail.

## Purpose

Every report hook needs the same four pieces of state and the same four setters. Rather than repeat them, this module exports a typed factory that builds a Zustand store for a given result type, plus the `Updater` helper that lets a setter accept either a value or a `prev => next` function. It is in the store layer and is the base the per-report stores build on, either by calling the factory or by reusing `applyUpdater` in a hand-written store.

## Interface

| Export | Kind | Description |
|---|---|---|
| `Updater<T>` | type | `T \| ((prev: T) => T)`. |
| `applyUpdater(prev, next)` | function | Resolves an `Updater` against the previous value. |
| `ReportDataState<T>` | interface | `data: T \| null`, `loading`, `error: string \| null`, `logs: string[]`, and `setData`, `setLoading`, `setError`, `setLogs`. |
| `ReportDataStore<T>` | type | `UseBoundStore<StoreApi<ReportDataState<T>>>`, the hook type the factory returns. |
| `createReportDataStore<T>()` | function | Builds a fresh store with `data: null`, `loading: false`, `error: null`, `logs: []`. |

## Uses

- `zustand` (`create`, `StoreApi`, `UseBoundStore`)

## Used By

- Factory callers: [agencyUtilizationStore](<Reporting Store - agencyUtilizationStore.md>), [slaDataStore](<Reporting Store - slaDataStore.md>)
- `applyUpdater` and `Updater` only: [annualUtilizationStore](<Reporting Store - annualUtilizationStore.md>), [deviceDataStore](<Reporting Store - deviceDataStore.md>), [hddTicketsStore](<Reporting Store - hddTicketsStore.md>), [officeWindowsStore](<Reporting Store - officeWindowsStore.md>), [patchManagementStore](<Reporting Store - patchManagementStore.md>)
- `ReportDataState` type: [useUtilizationData](<../hooks/Reporting Hook - useUtilizationData.md>)

## Key Behavior

- `setLogs` is the only setter that goes through `applyUpdater`; `useTrackedReport` relies on this to append streamed lines with `prev => [...prev, ...lines]` and to clear with `() => []`.
- `applyUpdater` decides by `typeof next === 'function'`, so a store whose `T` is itself a function type would misbehave; none is.
- Each factory call creates an independent store, which is how the quarterly and annual utilization reports keep separate results from one endpoint.
- The factory sets no persistence and no middleware.

## Cleanup Notes

- None noted.

## Source

[client/src/store/reportDataStore.ts](../../../client/src/store/reportDataStore.ts)
