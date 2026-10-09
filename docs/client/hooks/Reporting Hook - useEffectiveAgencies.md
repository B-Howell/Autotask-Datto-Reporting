# useEffectiveAgencies

> The agency dropdown entries: the raw agency list with the tenant's configured groups collapsed into single entries.

## Purpose

Several Autotask companies can be presented as one client by a group rule in the deployment's tenant settings. Every report page's dropdown should show that group once, not each member. This hook reads the agency list from `agencyStore` and the group rules from `tenantStore`, and memoises the collapsed list. It is in the hook layer and is the one place pages get dropdown entries from.

## Interface

`useEffectiveAgencies(): EffectiveAgency[]`. Each entry is either a plain `Agency` or an `AgencyGroup` (a name plus its member agencies). No arguments.

## Uses

- `react` (`useMemo`)
- [agencyStore](<../store/Reporting Store - agencyStore.md>) for `agencies`
- [tenantStore](<../store/Reporting Store - tenantStore.md>) for `tenant.groups`
- [agencyGroups util](<../utils/Reporting Util - agencyGroups.md>) for `getEffectiveAgencies`
- [API types](<../api/Reporting API - types.md>) for `EffectiveAgency`

## Used By

- [DeviceReports page](<../pages/reports/Reporting Page - DeviceReports.md>)
- [HddTickets page](<../pages/reports/Reporting Page - HddTickets.md>)
- [OfficeWindowsReports page](<../pages/reports/Reporting Page - OfficeWindowsReports.md>)
- [PatchManagement page](<../pages/reports/Reporting Page - PatchManagement.md>)
- [Tickets page](<../pages/reports/Reporting Page - Tickets.md>)

## Key Behavior

- Recomputes only when the store's `agencies` array identity changes (fetch, add, remove) or the tenant's `groups` array identity changes (the one `setTenant` call at startup).
- Both stores are subscribed, so a page already on screen when either response lands regroups its dropdown without a remount, whichever order the two fetches resolve in.
- Returns an empty list until the agency store has loaded; pages that need to know whether loading finished read `loaded` from that store directly.
- The grouping rules (which agencies form a group, the group's value key) live in `agencyGroups`; this hook adds only the memoisation and the two store subscriptions.

## Cleanup Notes

- None noted.

## Source

[client/src/hooks/useEffectiveAgencies.ts](../../../client/src/hooks/useEffectiveAgencies.ts)
