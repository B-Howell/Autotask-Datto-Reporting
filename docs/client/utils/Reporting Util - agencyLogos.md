# agencyLogos util

> Maps an agency display name to a logo file under `/public` and measures an image's natural size for the Word export.

## Purpose

`client/src/utils/agencyLogos.ts` is the one place that knows which agencies have a logo. The PDF header and the Word export both ask `getAgencyLogoUrl(name)`; a `null` answer means the document renders without a logo rather than failing. The map is keyed on the display name because that is what every page has at export time, and it is empty in this repository so no client branding ships with the code.

`loadImageDimensions` exists because the `docx` library needs explicit pixel dimensions for an embedded image, and the only reliable way to get them in the browser is to load the image.

## Interface

| Function | Signature | Description |
|---|---|---|
| `getAgencyLogoUrl` | `(agencyName: string \| null \| undefined) => string \| null` | Looks the name up in `LOGO_MAP`; `null` for a missing name or no entry. |
| `loadImageDimensions` | `(url: string) => Promise<ImageDimensions \| null>` | Resolves `{ width, height }` from `naturalWidth` and `naturalHeight`, or `null` if the image fails to load. |

`ImageDimensions` is `{ width: number; height: number }`.

## Uses

- The browser `Image` element.

## Used By

- [pdf util](<Reporting Util - pdf.md>) calls `getAgencyLogoUrl` when drawing the report header.
- [Office Windows wordExport](<../pages/reports/officeWindows/Reporting Office Windows - wordExport.md>) uses both functions to place the logo in the Word document.

## Key Behavior

- `LOGO_MAP` values are paths served by the web server from `/public` (for example `/logos/example.png`); they are not fetched through the api layer.
- `loadImageDimensions` never rejects. A 404 or a decode error resolves `null`, so a bad path degrades to "no logo".
- Nothing caches the dimensions; each export loads the image again. Logos are small and exports are infrequent.
- Group names (from the agencyGroups util) can be keys too, since a group exports under its display name.

## Cleanup Notes

- None noted.

## Source

[client/src/utils/agencyLogos.ts](../../../client/src/utils/agencyLogos.ts)
