# LicenseField

> The small right-aligned numeric text input used for every hand-entered licence figure on the Office and Windows report.

## Purpose

Licence counts are not available from either vendor API; an account manager types them in against each product line and the app saves them per agency. The Office table has two such columns (Licenses and Available) and the Windows table has one. This component is the single input used in all three places so the look, alignment and keyboard behaviour are identical. It is a presentational component; persistence is handled by [useManualInputs](<Reporting Office Windows - useManualInputs.md>).

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `string` | yes | The current text. Values are kept as strings end to end, never parsed to numbers. |
| `onChange` | `(value: string) => void` | yes | Called with the raw input text on every keystroke. |
| `placeholder` | `string` | yes | Shown when empty. The Office table passes a dash, the Windows table passes "Enter". |
| `width` | `number` | no | Fixed width in pixels. When omitted the field fills its table cell. |

## Uses

- `@mui/material` (`TextField`).

## Used By

- [OfficeTable](<Reporting Office Windows - OfficeTable.md>) (fills the cell).
- [WindowsTable](<Reporting Office Windows - WindowsTable.md>) (fixed `width={90}`).

## Key Behavior

- `size="small"`, with the native input styled `textAlign: right` and `fontSize: 16` so figures line up under the right-aligned Installs column at the same size as the table text.
- `inputMode="numeric"` asks mobile keyboards for a number pad but does not restrict input; the component accepts any text, and the exports print whatever was typed.
- `fullWidth` is true exactly when `width` is undefined; a supplied width is applied through `sx` instead.
- There is no validation, no blur handler and no debounce here; the saving pause lives in the hook that owns the value.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/officeWindows/LicenseField.tsx](../../../../../client/src/pages/reports/officeWindows/LicenseField.tsx)
