# agencyStore

> Client-side cache of the server's agency list, with the add and remove actions that keep it in step.

## Purpose

The configured agencies (Autotask company plus Datto site pairs, and their optional group names) live on the server so every browser shares one list. This Zustand store holds a copy of that list for the client. It sits in the store layer and is loaded once at startup by the app shell; the agency dropdowns on every report page read it through `useEffectiveAgencies`.

The design decision is that mutations go through the API and replace the whole list from the server's response, rather than patching the local array. There is no optimistic update and no local id generation.

## Interface

Not created by the `reportDataStore` factory; it is a hand-written `create` call.

| Field / action | Type | Description |
|---|---|---|
| `agencies` | `Agency[]` | The current list, empty until the first fetch resolves. |
| `loaded` | `boolean` | True once a fetch has completed, successfully or not. |
| `fetchAgencies()` | `() => Promise<void>` | Loads the list from `agenciesApi.fetchAgencies()`. |
| `addAgency(agency)` | `(Agency) => Promise<void>` | Posts the agency and replaces the list with the server's response. |
| `removeAgency(id)` | `(number) => Promise<void>` | Deletes by id and replaces the list with the server's response. |

## Uses

- `zustand` (`create`)
- [agencies API](<../api/Reporting API - agencies.md>) for `fetchAgencies`, `createAgency`, `deleteAgency`
- [API types](<../api/Reporting API - types.md>) for `Agency`

## Used By

- [App](<../Reporting Client - App.md>) calls `fetchAgencies` once on mount
- [useEffectiveAgencies](<../hooks/Reporting Hook - useEffectiveAgencies.md>)
- [DeviceReports page](<../pages/reports/Reporting Page - DeviceReports.md>)
- [OfficeWindowsReports page](<../pages/reports/Reporting Page - OfficeWindowsReports.md>)
- [Tickets page](<../pages/reports/Reporting Page - Tickets.md>)
- [AgenciesSection settings](<../pages/settings/Reporting Settings - AgenciesSection.md>)

## Key Behavior

- `loaded` is set to true even when the fetch fails, so pages can distinguish "still loading" from "loaded but empty" and do not spin forever against an unreachable server.
- Every action swallows its error: it logs to `console.error` and leaves the previous `agencies` value untouched. Nothing in the store exposes an error string.
- `addAgency` and `removeAgency` do not touch `loaded`.
- The list returned from create and delete is the server's full list, so the store never diverges from the server after a successful call.

## Cleanup Notes

- Failures in `addAgency` and `removeAgency` are invisible to the user; the store has no `error` field and callers cannot tell the call failed.

## Source

[client/src/store/agencyStore.ts](../../../client/src/store/agencyStore.ts)
