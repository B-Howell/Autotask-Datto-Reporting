# SettingsDialog

> A titled dialog with a divided content area, optional extra action buttons and a contained close button, for per-report settings.

## Purpose

Two reports have a small settings dialog (annual utilization rates and company selection; Office SKU mapping). This component standardises the frame so each only supplies its body and any extra buttons. It is in the report component layer.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `open` | `boolean` | yes | Dialog visibility. |
| `onClose` | `() => void` | yes | Close handler, also used for backdrop and the close button. |
| `title` | `string` | yes | Dialog title. |
| `children` | `ReactNode` | yes | Body content. |
| `actions` | `ReactNode` | no | Extra buttons placed before the close button. |
| `closeLabel` | `string` | no | Close button text. Default `Close`. |
| `maxWidth` | `'xs' \| 'sm' \| 'md'` | no | MUI dialog width. Default `sm`. |

## Uses

- `@mui/material` dialog components and `Button`

## Used By

- Re-exported by [the report component barrel](<Reporting Report Component - index.md>)
- [annualUtilization ReportSettingsDialog](<../../pages/reports/annualUtilization/Reporting Annual Utilization - ReportSettingsDialog.md>)
- [officeWindows SkuSettingsDialog](<../../pages/reports/officeWindows/Reporting Office Windows - SkuSettingsDialog.md>)

## Key Behavior

- Always `fullWidth` at the chosen `maxWidth`.
- The content area uses `dividers`, so long bodies scroll between fixed title and action bars.
- There is no separate save action: the dialogs that use it write settings as they are changed, and the one button closes.

## Cleanup Notes

- None noted.

## Source

[client/src/components/report/SettingsDialog.tsx](../../../../client/src/components/report/SettingsDialog.tsx)
