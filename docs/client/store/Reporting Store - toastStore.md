# toastStore

> Global snackbar state so any code, React or not, can show a one-line outcome message.

## Purpose

Export helpers and the device write-back path need to tell the user whether something worked, and they are not React components. This store holds the single snackbar's open flag, message and severity, so plain functions can call `useToastStore.getState().showToast(...)` and the `Toaster` component at the root renders it. It is in the store layer.

## Interface

Not created by the `reportDataStore` factory.

| Field / action | Type | Description |
|---|---|---|
| `open` | `boolean` | Whether the snackbar is showing. |
| `message` | `string` | The text shown. |
| `severity` | `ToastSeverity` (`'success' \| 'error' \| 'info' \| 'warning'`) | MUI Alert severity. |
| `showToast(message, severity?)` | `(string, ToastSeverity?) => void` | Opens with the message; severity defaults to `success`. |
| `hideToast()` | `() => void` | Closes; the message and severity are left in place for the exit animation. |

Exports the `ToastSeverity` type and the default store hook.

## Uses

- `zustand` (`create`)

## Used By

- [Toaster](<../components/Reporting Component - Toaster.md>), the only renderer
- [useReportingData](<../hooks/Reporting Hook - useReportingData.md>) for the device write-back outcome
- [saveReport util](<../utils/Reporting Util - saveReport.md>) for "saved to app" and save failures

## Key Behavior

- One toast at a time: a second `showToast` while the first is open replaces the message in place; there is no queue.
- Auto-hide timing and the click-away rule live in `Toaster`, not here.

## Cleanup Notes

- None noted.

## Source

[client/src/store/toastStore.ts](../../../client/src/store/toastStore.ts)
