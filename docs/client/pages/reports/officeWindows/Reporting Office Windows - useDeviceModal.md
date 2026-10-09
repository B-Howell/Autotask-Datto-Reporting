# useDeviceModal

> Local state for which product's device list is showing in the Office and Windows report.

## Purpose

Both tables can open the device dialog, so the open flag, title and device list must live above them. This hook holds that trio for the page and exposes `open` and `close` so the tables only need a single `onOpenDevices` callback. It is a page-level hook with plain `useState`; nothing is persisted or shared.

## Interface

Returns `{ modal, open, close }`:

| Member | Type | Description |
|---|---|---|
| `modal` | `{ open: boolean; title: string; devices: string[] }` | Props for `DeviceListDialog`. |
| `open` | `(title: string, devices: string[] or undefined) => void` | Shows the dialog for one product. |
| `close` | `() => void` | Hides the dialog. |

## Uses

- `react` (`useState`).

## Used By

- [OfficeWindowsReports page](<../Reporting Page - OfficeWindowsReports.md>), which passes `devices.open` to [OfficeTable](<Reporting Office Windows - OfficeTable.md>) and [WindowsTable](<Reporting Office Windows - WindowsTable.md>) and spreads `devices.modal` into [DeviceListDialog](<Reporting Office Windows - DeviceListDialog.md>).

## Key Behavior

- `open` normalises an undefined device list to `[]`, so a row with no `devices` field still opens a dialog showing the empty-state sentence rather than crashing.
- `close` only flips `open` to false and keeps the title and devices, so the dialog's fade-out animation shows the same content rather than an empty box.
- The initial state is closed with an empty title and list.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/officeWindows/useDeviceModal.ts](../../../../../client/src/pages/reports/officeWindows/useDeviceModal.ts)
