# ErrorBanner

> Renders a report's error string in a card, or nothing when there is no error.

## Purpose

Report hooks that pass `setError` to `useTrackedReport` end up with an error message in their store. Pages drop this component in once and pass that string; it handles the null case so the page has no conditional. It is in the report component layer.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `error` | `string \| null \| undefined` | yes | The message; falsy renders nothing. |

## Uses

- `@mui/material` (`Paper`, `Typography`)

## Used By

- Re-exported by [the report component barrel](<Reporting Report Component - index.md>)
- [AgencyUtilization page](<../../pages/reports/Reporting Page - AgencyUtilization.md>)
- [AnnualUtilization page](<../../pages/reports/Reporting Page - AnnualUtilization.md>)
- [SlaPerformance page](<../../pages/reports/Reporting Page - SlaPerformance.md>)
- [Tickets page](<../../pages/reports/Reporting Page - Tickets.md>)

## Key Behavior

- Returns null for `''`, null and undefined, so an empty string after a cleared error hides the banner.
- The text is prefixed with `Error: ` and coloured with the theme's error colour.
- Only the pages whose hooks wire `setError` show anything here; device, patch, HDD and licensing failures are visible only in the status bar.

## Cleanup Notes

- `borderColor: 'error.main'` is set on a `Paper` that has no border (default elevation variant), so the colour has no visible effect.

## Source

[client/src/components/report/ErrorBanner.tsx](../../../../client/src/components/report/ErrorBanner.tsx)
