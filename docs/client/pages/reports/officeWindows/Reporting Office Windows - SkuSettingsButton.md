# SkuSettingsButton

> The toolbar gear button that opens the Office 365 subscription settings, disabled until a report has been generated.

## Purpose

Which Office 365 subscription lines appear under the family heading is saved per agency, so there is nothing meaningful to configure before an agency's report has been generated and its saved inputs loaded. This button encodes that rule: it is disabled until the manual-inputs hook has an agency key, and its tooltip explains why. It is a presentational component rendered in the report toolbar's action slot.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `enabled` | `boolean` | yes | The page passes whether `manual.agencyKey` is set; false disables the button. |
| `onClick` | `() => void` | yes | Opens the settings dialog. |

## Uses

- `@mui/material` (`IconButton`, `Tooltip`).
- `@mui/icons-material/Settings`.

## Used By

- [OfficeWindowsReports page](<../Reporting Page - OfficeWindowsReports.md>), which opens [SkuSettingsDialog](<Reporting Office Windows - SkuSettingsDialog.md>) from it.

## Key Behavior

- The tooltip text changes with state: "Choose which Office 365 subscriptions appear" when enabled, otherwise a sentence telling the user to generate a report first because the settings are saved per agency.
- The `IconButton` is wrapped in a `span` so the tooltip still fires while the button is disabled; a disabled button emits no pointer events, so without the wrapper the explanatory tooltip would never show.
- The button carries `aria-label="Report settings"` since it has no visible text.
- `enabled` becomes true as soon as `loadFor` has run, which happens when Generate is clicked, before the report data has arrived.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/officeWindows/SkuSettingsButton.tsx](../../../../../client/src/pages/reports/officeWindows/SkuSettingsButton.tsx)
