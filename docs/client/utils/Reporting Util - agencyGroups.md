# agencyGroups util

> Folds Autotask companies that are really one organisation into a single dropdown entry, and translates between dropdown values, agencies and the members a report must fetch.

## Purpose

`client/src/utils/agencyGroups.ts` implements agency groups on the client. The server returns a flat agency list and, separately, the tenant's group rules (a display name and a company-name prefix); `getEffectiveAgencies` applies those rules and collapses matching members into one `AgencyGroup`. Every report hook then calls `membersOf` to learn which companies to fetch and merges the results, so the report reads as one client.

The dropdown stores a single `AgencyValue`: a numeric company id, or the string `group:<name>`. The helpers here are the only client code that knows that encoding; the server's tenant service understands the same `group:` prefix when a scheduled run resolves a stored value.

## Interface

| Function | Signature | Description |
|---|---|---|
| `groupKey` | `(groupName) => string` | Builds `group:<name>`. |
| `isGroupKey` | `(value: unknown) => value is string` | True for a string starting with `group:`. |
| `groupNameFromKey` | `(key) => string` | Strips the prefix. |
| `getEffectiveAgencies` | `(agencies: Agency[], groups: GroupRule[] = []) => EffectiveAgency[]` | Collapses the given groups, passes the rest through, sorts by name. |
| `resolveAgencyValue` | `(value, effectiveAgencies) => EffectiveAgency \| null` | Finds the entry a stored dropdown value refers to. |
| `valueFor` | `(agency) => AgencyValue` | The dropdown value for an entry. |
| `membersOf` | `(agency) => Agency[]` | The group's members, or the agency itself in a one-element array. |
| `agencyNameFor` | `(value, agencies) => string` | Display name for a stored value; `''` when unknown or `null`. |

## Uses

- [types](<../api/Reporting API - types.md>): `Agency`, `AgencyGroup`, `AgencyValue`, `EffectiveAgency`, `GroupRule`, `isAgencyGroup`.

## Used By

- [useEffectiveAgencies](<../hooks/Reporting Hook - useEffectiveAgencies.md>) (`getEffectiveAgencies`, passing the tenant store's `groups`).
- [AgencySelect](<../components/report/Reporting Report Component - AgencySelect.md>) (`valueFor`).
- Report hooks [useReportingData](<../hooks/Reporting Hook - useReportingData.md>), [useTicketData](<../hooks/Reporting Hook - useTicketData.md>), [useOfficeWindowsData](<../hooks/Reporting Hook - useOfficeWindowsData.md>), [usePatchManagementData](<../hooks/Reporting Hook - usePatchManagementData.md>) (`membersOf`, `valueFor`).
- Pages [DeviceReports](<../pages/reports/Reporting Page - DeviceReports.md>), [Tickets](<../pages/reports/Reporting Page - Tickets.md>), [OfficeWindowsReports](<../pages/reports/Reporting Page - OfficeWindowsReports.md>), [PatchManagement](<../pages/reports/Reporting Page - PatchManagement.md>), [HddTickets](<../pages/reports/Reporting Page - HddTickets.md>) (`resolveAgencyValue`, `agencyNameFor`, `membersOf`).
- [client/src/utils/agencyGroups.test.ts](../../../client/src/utils/agencyGroups.test.ts).

## Key Behavior

- The rules are a parameter, not a constant in this file. `useEffectiveAgencies` passes `tenant.groups` from the [tenantStore](<../store/Reporting Store - tenantStore.md>), which the server fills from `data/tenant.json`; the default `[]` gives the plain sorted list, which is what the demo stack and the existing tests see.
- A rule looks like `{ name: 'Example Schools', matchPrefix: 'Example Schools - ' }` and matches on `name.startsWith(matchPrefix)`. The match is case-sensitive and the trailing space in a prefix matters, exactly as in the server's `group_members`.
- A group only forms when at least two agencies match the prefix; a lone match stays a plain agency, so a half-configured rule does not hide anything.
- Members are copied (`id`, `site`, `name`) rather than referenced, and their ids go into a handled set so they do not also appear individually.
- The result is sorted with `localeCompare` on name, groups and agencies together.
- `resolveAgencyValue` accepts `''` (nothing selected); `Number('')` is `0`, which matches no agency, so it returns `null`.
- Group membership is recomputed whenever the agency list or the rules change, so renaming a company in Autotask can move it in or out of a group on the next load, and the dropdown regroups as soon as the tenant settings arrive.

## Cleanup Notes

- `groupKey`, `isGroupKey` and `groupNameFromKey` are exported but only used within this file.
- The tests cover ordering without rules and one prefix rule; the two-member minimum is untested.

## Source

[client/src/utils/agencyGroups.ts](../../../client/src/utils/agencyGroups.ts)
