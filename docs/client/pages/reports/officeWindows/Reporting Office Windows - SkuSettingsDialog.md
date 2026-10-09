# SkuSettingsDialog

> The per-agency checklist of Office 365 desktop subscriptions that may appear as lines under the Office 365 heading.

## Purpose

The full list of desktop-entitling Office 365 plans is offered to every agency, but most hold only one or two. This dialog lets the account manager tick the plans an agency holds so the on-screen table shows only those lines. The choice is saved with the agency's other manual inputs, so it follows the agency rather than the browser. The component is presentational; the selection state and persistence live in [useManualInputs](<Reporting Office Windows - useManualInputs.md>).

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `open` | `boolean` | yes | Dialog visibility. |
| `onClose` | `() => void` | yes | Closes the dialog (the "Done" button). |
| `visibleSkus` | `string[]` | yes | Currently ticked plans, in `M365_DESKTOP_SKUS` order. |
| `onToggle` | `(sku: string) => void` | yes | Flips one plan. |
| `onChange` | `(skus: string[]) => void` | yes | Replaces the whole selection; used by Clear all and Select all. |

## Uses

- `@mui/material` (`Checkbox`, `FormGroup`, `FormControlLabel`, `Button`, `Typography`).
- [SettingsDialog](<../../../components/report/Reporting Report Component - SettingsDialog.md>) for the dialog frame, title and close button.
- `M365_DESKTOP_SKUS` from [skus](<Reporting Office Windows - skus.md>).

## Used By

- [OfficeWindowsReports page](<../Reporting Page - OfficeWindowsReports.md>).

## Key Behavior

- Title is "Office 365 subscriptions"; the close button is relabelled "Done".
- Two extra actions sit before Done: "Clear all" (disabled when nothing is ticked) and "Select all" (disabled when every plan in `M365_DESKTOP_SKUS` is already ticked). Both call `onChange` with the full replacement list.
- Each checkbox is checked by `visibleSkus.includes(sku)` and toggled through `onToggle`, which the hook implements with `toggleSku` so the saved order stays canonical.
- The helper text states the two rules a user needs: only ticked plans appear under Office 365, and a line still has to carry a figure to reach the exported report (see [reportRows](<Reporting Office Windows - reportRows.md>)).
- Every change is persisted immediately by the hook (debounced); there is no separate Save button and closing the dialog does not revert anything.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/officeWindows/SkuSettingsDialog.tsx](../../../../../client/src/pages/reports/officeWindows/SkuSettingsDialog.tsx)
