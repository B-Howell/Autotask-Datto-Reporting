# agencyLogos util

> Resolves an agency display name to the logo URL the server serves for it.

## Purpose

`client/src/utils/agencyLogos.ts` is the lookup the report image loader uses before fetching a logo. It asks `getAgencyLogoUrl(name)`; a `null` answer means the document renders without a logo rather than failing. The mapping itself no longer lives in this file: it is the `logos` map of the tenant settings, read through the tenant store, so a deployment adds a logo by dropping a PNG in the server's `data/logos` directory and naming it in `data/tenant.json`, with no change to tracked client files.

## Interface

| Function | Signature | Description |
|---|---|---|
| `getAgencyLogoUrl` | `(agencyName: string \| null \| undefined) => string \| null` | `useTenantStore.getState().logoUrl(name)`: `/api/tenant/logos/<file>` for a mapped name; `null` for a missing name or no entry. |

## Uses

- [tenantStore](<../store/Reporting Store - tenantStore.md>) for `logoUrl`.

## Used By

- [reportImages util](<Reporting Util - reportImages.md>) calls `getAgencyLogoUrl` in `loadBrowserAssets` to decide whether to fetch a logo. It is the only caller; the PDF header and the Word builder receive the loaded image instead of looking the URL up themselves.

## Key Behavior

- URLs point at the server's logo route, which serves files from the untracked `data/logos` directory, not at anything under `/public`. The server's no-cache middleware applies, so each export fetches the file again.
- The lookup reads the store at call time through `getState()` rather than subscribing. Exports run long after the tenant settings arrive, so a stale read is not a practical concern.
- Image dimensions are no longer measured here by loading an `Image`; the reportImages util reads them from the PNG header, which needs no DOM.
- Group names (from the agencyGroups util) can be keys too, since a group exports under its display name.

## Cleanup Notes

- `getAgencyLogoUrl` is a one-line pass-through to the store. It stays as the named lookup so the image loader does not reach into the store itself.

## Source

[client/src/utils/agencyLogos.ts](../../../client/src/utils/agencyLogos.ts)
