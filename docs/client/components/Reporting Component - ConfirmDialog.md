# ConfirmDialog

> A small yes-or-no dialog placed before an action the user cannot take back.

## Purpose

The client had no shared confirmation before the Scheduled Reports page needed one for
deleting a schedule. `ConfirmDialog` is the general form: a title, a sentence of explanation,
Cancel and a confirm button whose label and colour the caller sets. It sits in the top-level
component layer so any page can use it.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `open` | `boolean` | yes | |
| `title` | `string` | yes | The dialog heading, usually a question. |
| `children` | `ReactNode` | yes | The explanation, rendered as secondary `body2` text. |
| `confirmLabel` | `string` | no | Default `Confirm`. |
| `destructive` | `boolean` | no | Colours the confirm button `error`. Default false. |
| `busy` | `boolean` | no | Disables both buttons and backdrop closing while the action runs. |
| `onConfirm` | `() => void` | yes | |
| `onClose` | `() => void` | yes | Cancel, Escape and backdrop click. |

## Uses

- Material UI `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions`, `Button`, `Typography`.

## Used By

- [ScheduledReports page](<../pages/Reporting Page - ScheduledReports.md>) before deleting a schedule.

## Key Behavior

- `maxWidth="xs"` and `fullWidth`, so the dialog is a narrow fixed-width card regardless of
  the sentence inside.
- The component holds no state; the caller decides when it opens and what confirming does.

## Cleanup Notes

- None noted.

## Source

[client/src/components/ConfirmDialog.tsx](../../../client/src/components/ConfirmDialog.tsx)
