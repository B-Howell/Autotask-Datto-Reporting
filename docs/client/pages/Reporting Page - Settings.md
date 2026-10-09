# Settings page

> The `/settings` page: a heading and three stacked sections for appearance, data sync and the agency list.

## Purpose

`Settings` is rendered at `/settings` by the client's router. It is a pure composition page:
it owns no state and makes no API calls. Each concern is a self-contained section component
under `pages/settings/` that talks to its own store or hook, so this file only fixes the order
in which they appear (Appearance, then Data Sync, then Agencies).

Keeping the page this thin means a new settings area is added by writing one section
component and inserting one line here.

## Interface

`Settings` takes no props and is the module's default export. It renders:

| Section | Component | Backed by |
|---|---|---|
| Appearance | `AppearanceSection` | theme store |
| Data Sync | `DataSyncSection` | `useSyncStatus` hook and the sync API |
| Agencies | `AgenciesSection` | agency store |

## Uses

- Material UI `Box` and `Typography`.
- [AppearanceSection](<settings/Reporting Settings - AppearanceSection.md>)
- [DataSyncSection](<settings/Reporting Settings - DataSyncSection.md>)
- [AgenciesSection](<settings/Reporting Settings - AgenciesSection.md>)

## Used By

- [App](<../Reporting Client - App.md>) mounts it on the `/settings` route.

## Key Behavior

- Each section renders its own `Paper` capped at `maxWidth: 600`; the first two add a
  bottom margin of 3 and the last does not, which is why the order here matters visually.
- The page has no loading state. Sections that need data (agencies, sync status) show their
  own spinner or placeholder.
- Nothing here subscribes to a store, so the page itself never re-renders; only the sections
  that read changed state do.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/Settings.tsx](../../../client/src/pages/Settings.tsx)
