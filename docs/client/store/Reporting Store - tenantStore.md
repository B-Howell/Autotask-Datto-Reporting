# tenantStore

> Holds the deployment's presentation settings fetched once at startup, the defaults the client runs on until they arrive, and the logo URL builder that reads the tenant's logo map.

## Purpose

The agency groups, logo map, rated departments and picker year floors are deployment-specific business data. They used to be constants spread across `agencyGroups`, `agencyLogos`, `departments`, `dates` and `quarters`, so a private deployment had to edit tracked client files and carry those edits through every upstream merge. This Zustand store is now the single client-side home for those values: the app shell fetches `/api/tenant` once on mount and stores the answer here, and every former constant reads from it. It sits in the store layer beside `agencyStore`, which plays the same role for the agency list.

The design decision is that the store starts from `TENANT_DEFAULTS`, a literal copy of the server's `DEFAULTS`, rather than from an empty or `null` state. Pages that render before the fetch resolves, and pages on a server that has no tenant route, behave exactly as the client did when the values were constants.

## Interface

Not created by the `reportDataStore` factory; it is a hand-written `create` call.

| Field / action | Type | Description |
|---|---|---|
| `tenant` | `TenantSettings` | The current settings: `groups`, `logos`, `ratedDepartments`, `firstReportYear`, `earliestQuarterYear`. Starts as `TENANT_DEFAULTS`. |
| `loaded` | `boolean` | True once `setTenant` has been called. |
| `setTenant(tenant)` | `(TenantSettings) => void` | Replaces `tenant` wholesale and sets `loaded`. |
| `logoUrl(agencyName)` | `(string \| null \| undefined) => string \| null` | `/api/tenant/logos/<encoded file>` for a name in the logo map, `null` for an empty name or no entry. |

The module also exports `TENANT_DEFAULTS`: no groups, no logos, five rated departments (Administration 0, Call Center 65, Help Desk 75, Jr Sys Admin 80, Sr Sys Admin 90), `firstReportYear` 2024 and `earliestQuarterYear` 2023.

## Uses

- `zustand` (`create`)
- [API types](<../api/Reporting API - types.md>) for `TenantSettings`

## Used By

- [App](<../Reporting Client - App.md>) calls `setTenant` with the result of `tenantApi.fetchTenant()` once on mount
- [useEffectiveAgencies](<../hooks/Reporting Hook - useEffectiveAgencies.md>) subscribes to `tenant.groups`
- [agencyLogos util](<../utils/Reporting Util - agencyLogos.md>) calls `logoUrl` through `getState()`
- [dates util](<../utils/Reporting Util - dates.md>) reads `firstReportYear` through `getState()` as the default floor of `reportYears`, and [MonthYearSelect](<../components/report/Reporting Report Component - MonthYearSelect.md>) subscribes to it
- [Agency Utilization quarters](<../pages/reports/agencyUtilization/Reporting Agency Utilization - quarters.md>) reads `earliestQuarterYear` through `getState()` as the default floor of `quarterChoices`, and the [AgencyUtilization page](<../pages/reports/Reporting Page - AgencyUtilization.md>) subscribes to it
- [Annual Utilization departments](<../pages/reports/annualUtilization/Reporting Annual Utilization - departments.md>) reads `ratedDepartments` through `getState()` as the default list, and [useAnnualReport](<../pages/reports/annualUtilization/Reporting Annual Utilization - useAnnualReport.md>) and [ReportSettingsDialog](<../pages/reports/annualUtilization/Reporting Annual Utilization - ReportSettingsDialog.md>) subscribe to it
- [client/src/store/tenantStore.test.ts](../../../client/src/store/tenantStore.test.ts)

## Key Behavior

- `TENANT_DEFAULTS` must stay identical to `DEFAULTS` in the [tenant service](<../../server/services/Reporting Service - tenant.md>). The client never merges: a fetch either replaces everything or changes nothing, so a drift between the two would only show on a server without the route.
- Two kinds of reader. React components and hooks subscribe with a selector (`useTenantStore((s) => s.tenant.groups)`) so they re-render when the settings arrive after their first paint. Plain modules (`agencyLogos`, `dates`, `quarters`, `departments`) read `useTenantStore.getState()` at call time, the same way `useReportingData` reads `useDeviceDataStore.getState()`, which is why each exposes the tenant value as a default parameter: a component that memoises the result passes the subscribed value in so its memo dependencies are honest.
- `setTenant` replaces the whole object. The server always answers with every key, so there is no partial state to merge; a response with an unexpected shape would be stored as-is.
- `logoUrl` encodes the filename with `encodeURIComponent`. The server's logo route refuses any name with a slash in it anyway, so a mapping that names a path can only produce a 400, never a file outside the logo directory.
- Nothing ever writes the settings back. Editing them means editing `data/tenant.json` on the server.
- Fetch failures are handled by the caller, not here; the store has no `error` field.

## Cleanup Notes

- `loaded` has no consumer yet; it is here so a page can one day distinguish "defaults because the fetch has not finished" from "defaults because the server has none".
- Report exports read `logoUrl` through `getState()` at export time rather than subscribing, which is fine because an export always happens long after the settings arrive, but it is a second pattern to know about.

## Source

[client/src/store/tenantStore.ts](../../../client/src/store/tenantStore.ts)
