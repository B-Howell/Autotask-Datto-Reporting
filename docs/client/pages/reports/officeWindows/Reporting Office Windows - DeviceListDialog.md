# DeviceListDialog

> The modal that lists the device hostnames behind one product row of the Office and Windows report.

## Purpose

Each row of the Office and Windows tables is backed by the devices the server found that product on. Clicking a row opens this dialog so an engineer can answer "which machines are these" without leaving the report. It is a pure presentational component in the page layer: the open state, title and device list are owned by the `useDeviceModal` hook and passed in.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `open` | `boolean` | yes | Whether the dialog is shown. |
| `title` | `string` | yes | The product name, shown in the dialog title with the device count. |
| `devices` | `string[]` | yes | Hostnames to list. An empty list renders a placeholder sentence. |
| `onClose` | `() => void` | yes | Called by the Close button and by the backdrop or Escape. |

## Uses

- `@mui/material` (`Dialog`, `DialogTitle`, `DialogContent`, `DialogActions`, `Button`, `Box`, `Typography`).

## Used By

- [OfficeWindowsReports page](<../Reporting Page - OfficeWindowsReports.md>), which feeds it the state from [useDeviceModal](<Reporting Office Windows - useDeviceModal.md>).

## Key Behavior

- The title reads the product name, a dash, then `<n> device(s)`; the noun is singular for exactly one device.
- Devices are copied and sorted with the default string sort before rendering, so the prop array is never mutated and the order is stable regardless of how the server returned them. The default sort is code-point order, so uppercase names sort before lowercase ones.
- Each hostname is rendered in a monospace block with the theme's hover background, keyed by the hostname itself; duplicate hostnames in the list would produce duplicate React keys.
- The dialog is `maxWidth="sm"` and `fullWidth`, with dividers around the content so a long list scrolls inside the dialog body.
- An empty list shows "No devices in this category." in secondary italic text rather than an empty box.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/officeWindows/DeviceListDialog.tsx](../../../../../client/src/pages/reports/officeWindows/DeviceListDialog.tsx)
