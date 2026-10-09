# agencyLogos util

> Resolves an agency display name to the logo URL the server serves for it, and measures an image's natural size for the Word export.

## Purpose

`client/src/utils/agencyLogos.ts` is the lookup the PDF header and the Word export share. Both ask `getAgencyLogoUrl(name)`; a `null` answer means the document renders without a logo rather than failing. The mapping itself no longer lives in this file: it is the `logos` map of the tenant settings, read through the tenant store, so a deployment adds a logo by dropping a PNG in the server's `data/logos` directory and naming it in `data/tenant.json`, with no change to tracked client files.

`loadImageDimensions` exists because the `docx` library needs explicit pixel dimensions for an embedded image, and the only reliable way to get them in the browser is to load the image.

## Interface

| Function | Signature | Description |
|---|---|---|
| `getAgencyLogoUrl` | `(agencyName: string \| null \| undefined) => string \| null` | `useTenantStore.getState().logoUrl(name)`: `/api/tenant/logos/<file>` for a mapped name; `null` for a missing name or no entry. |
| `loadImageDimensions` | `(url: string) => Promise<ImageDimensions \| null>` | Resolves `{ width, height }` from `naturalWidth` and `naturalHeight`, or `null` if the image fails to load. |

`ImageDimensions` is `{ width: number; height: number }`.

## Uses

- [tenantStore](<../store/Reporting Store - tenantStore.md>) for `logoUrl`.
- The browser `Image` element.

## Used By

- [pdf util](<Reporting Util - pdf.md>) calls `getAgencyLogoUrl` when drawing the report header.
- [Office Windows wordExport](<../pages/reports/officeWindows/Reporting Office Windows - wordExport.md>) uses both functions to place the logo in the Word document.

## Key Behavior

- URLs point at the server's logo route, which serves files from the untracked `data/logos` directory, not at anything under `/public`. The server's no-cache middleware applies, so each export fetches the file again.
- The lookup reads the store at call time through `getState()` rather than subscribing. Exports run long after the tenant settings arrive, so a stale read is not a practical concern.
- `loadImageDimensions` never rejects. A 404 or a decode error resolves `null`, so a bad mapping degrades to "no logo".
- Nothing caches the dimensions; each export loads the image again. Logos are small and exports are infrequent.
- Group names (from the agencyGroups util) can be keys too, since a group exports under its display name.

## Cleanup Notes

- `getAgencyLogoUrl` is a one-line pass-through to the store. It stays so the two export builders keep one import for both logo helpers rather than reaching into the store themselves.

## Source

[client/src/utils/agencyLogos.ts](../../../client/src/utils/agencyLogos.ts)
