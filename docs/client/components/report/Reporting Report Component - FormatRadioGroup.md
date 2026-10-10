# FormatRadioGroup

> The Word-or-PDF radio for a report that can go out as either, used by the Schedule dialog for the Office and Windows report.

## Purpose

Only one report type can be mailed in two formats, and the choice belongs in the Schedule dialog beside the other delivery details. The radio group used to be inline JSX in `ScheduleDialog`; it is now its own component so the dialog stays composition and the control can be reused or tested on its own.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `OfficeWindowsFormat` | yes | `'docx'` or `'pdf'`, the selected option. |
| `onChange` | `(format: OfficeWindowsFormat) => void` | yes | Called with the option picked. |

Renders a `FormControl` with the label "Format" and a row `RadioGroup` of two small radios, "Word (docx)" and "PDF". Default export: `FormatRadioGroup`.

## Uses

- `react` (`useId`) for the label id, so two dialogs on one page never share one.
- `@mui/material` `FormControl`, `FormLabel`, `RadioGroup`, `FormControlLabel`, `Radio`.
- [API types](<../../api/Reporting API - types.md>) for `OfficeWindowsFormat`.

## Used By

- [ScheduleDialog](<Reporting Report Component - ScheduleDialog.md>), rendered only when `hasFormatChoice(draft)` is true.

## Key Behavior

- The radio's string value is narrowed to `OfficeWindowsFormat` before `onChange`; the two options are the only values the group can produce.
- It carries no default: the dialog's form supplies the starting value (`pdf` when the draft's options say so, otherwise `docx`).

## Cleanup Notes

- Exercised through `ScheduleDialog.test.tsx`, which switches the Office and Windows draft to PDF and reads `options.format` back.

## Source

[client/src/components/report/FormatRadioGroup.tsx](../../../../client/src/components/report/FormatRadioGroup.tsx)
