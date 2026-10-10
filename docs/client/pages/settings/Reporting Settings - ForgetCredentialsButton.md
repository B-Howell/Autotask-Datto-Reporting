# ForgetCredentialsButton

> An outlined error-colour button that asks before every stored vendor credential is removed.

## Purpose

`ForgetCredentialsButton` is the one control for the credentials DELETE route. It exists
because the Settings page needs the same confirmed action in two places: beside Retry when the
status cannot be read, and below the vendor cards while something is stored. Both are a
destructive step an operator should not take by accident, so the button opens the shared
`ConfirmDialog` and only the dialog's confirm calls back. The button holds only whether its
dialog is open; the request, the toast and the reload belong to the hook that owns `onForget`.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `disabled` | `boolean` | no | Disables the button (demo mode). Defaults to false. |
| `busy` | `boolean` | no | Disables the button and the dialog's buttons while a request is in flight. Defaults to false. |
| `onForget` | `() => Promise<void>` | yes | Runs on confirm; the dialog closes once it settles. |

## Uses

- Material UI `Button` and the `DeleteOutline` icon.
- [ConfirmDialog](<../../components/Reporting Component - ConfirmDialog.md>) with `destructive` and the confirm label `Forget`.
- `react` (`useState`) for the open flag.

## Used By

- [CredentialsSection](<Reporting Settings - CredentialsSection.md>), beside Retry in the error state and below the cards.

## Key Behavior

- The button reads `Forget stored credentials`, outlined in the error colour, so it reads as
  destructive next to the primary Save and the neutral Retry without competing with them.
- The dialog is titled `Forget stored credentials?` and says `This removes every stored
  Autotask and Datto value. Values set by the environment are unaffected. Continue?`, naming
  the one thing it cannot touch so an operator with mixed sources is not surprised.
- Confirm awaits `onForget` and then closes; a refusal is handled inside the hook (an error
  toast), so the dialog closes either way and nothing is left half open. Cancel and the
  backdrop close it without calling back, and `busy` locks both while a request runs.

## Cleanup Notes

- Covered through `CredentialsSection.test.tsx`, which opens the dialog from both placements,
  confirms once and cancels once.

## Source

[client/src/pages/settings/ForgetCredentialsButton.tsx](../../../../client/src/pages/settings/ForgetCredentialsButton.tsx)
