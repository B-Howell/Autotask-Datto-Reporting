# useSavedReports

> Hook that loads the saved-report list on mount, reloads on demand, and deletes with an optimistic local update.

## Purpose

`useSavedReports` is the data layer of the Saved Reports page. The list is small and cheap to
fetch, and nothing outside the page reads it, so it is local hook state rather than a Zustand
store. Deleting removes the row locally as soon as the server confirms, without a second fetch.

## Interface

Returns `{ reports, loading, reload, remove }`:

| Name | Type | Description |
|---|---|---|
| `reports` | `SavedReport[]` | The current list, empty on failure. |
| `loading` | `boolean` | True from mount until the first load settles, and during each reload. |
| `reload` | `() => Promise<void>` | Refetches the list (the `load` callback). |
| `remove` | `(id: number) => Promise<void>` | Deletes on the server, then filters the row out locally. |

Default export: `useSavedReports`.

## Uses

- `react` (`useState`, `useEffect`, `useCallback`).
- [savedReports API](<../../../api/Reporting API - savedReports.md>) for `fetchSavedReports`
  and `deleteSavedReport`, and [API types](<../../../api/Reporting API - types.md>) for `SavedReport`.

## Used By

- [SavedReports page](<../Reporting Page - SavedReports.md>)

## Key Behavior

- `loading` starts `true` so the page shows its spinner before the first request completes
  rather than an empty-state flash.
- `load` sets `loading`, awaits the fetch, and on failure logs to the console and resets the
  list to `[]`; `loading` is cleared in both cases.
- `remove` awaits the server delete first and only then filters the row out, so a failed
  delete leaves the row in place; the failure is logged, not surfaced to the user.
- `load` is memoised with no dependencies, so the mount effect runs exactly once; `remove` is
  recreated each render.
- There is no toast on delete success or failure.

## Cleanup Notes

- Failures are console-only; a toast through the toast store would match the rest of the app.

## Source

[client/src/pages/reports/savedReports/useSavedReports.ts](../../../../../client/src/pages/reports/savedReports/useSavedReports.ts)
