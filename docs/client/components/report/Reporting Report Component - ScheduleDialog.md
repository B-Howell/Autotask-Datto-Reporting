# ScheduleDialog

> The dialog behind the Schedule button: name, recipients, subject, body, day and hour for a monthly emailed copy of the report on screen, saved as a preset plus a schedule.

## Purpose

Every generating report page shares one Schedule button and one dialog. The dialog turns what the page already knows about the current report (a `PresetDraft`: type, agency, renderer options) into the two server rows a scheduled delivery needs, without the page having to understand presets or schedules. It is in the report component layer; its state lives in [useScheduleForm](<Reporting Report Component - useScheduleForm.md>) and the save flow in [useScheduleDialog](<Reporting Report Component - useScheduleDialog.md>).

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `open` | `boolean` | yes | Dialog visibility. |
| `draft` | `PresetDraft` | yes | The report to schedule; a new object resets every field. |
| `onClose` | `() => void` | yes | Cancel and backdrop handler. |
| `onSave` | `(payload: SchedulePayload) => void` | yes | Called with `{ preset: PresetInput, schedule: Omit<ScheduleInput, 'preset_id'> }`. |
| `saving` | `boolean` | no | Disables both buttons while the save is in flight. |

Fields, top to bottom: Name, To, CC, Subject, Body, Day of month and Hour side by side, and for the Office and Windows report a Format radio (Word or PDF). The title is `Schedule <report label>`.

The dialog is built from two field components in the same folder:

- [RecipientsField](../../../../client/src/components/report/RecipientsField.tsx): one text line of addresses, with the `email` input mode set on the inner `<input>` through `slotProps.htmlInput` (MUI's `TextField` would otherwise drop it on the wrapper) and a caption that defaults to the separator rule ("Separate addresses with commas or semicolons"). The To field keeps that caption; the CC field passes "Optional" instead. The field runs `invalidAddresses` over its own value: an entry without an `@` turns it red and replaces the caption with `Not an email address: <entry>`, the same rule the server applies, so the mistake is visible before Save.
- [DayHourFields](../../../../client/src/components/report/DayHourFields.tsx): two selects in a row, their label ids from `useId` so two dialogs on one page never share one. Day of month lists 1 to 31 with the caption "31 means the last day of the month" (the server clamps to the month's length); Hour lists 0 to 23 rendered as `07:00` with the caption "in the server's schedule timezone". Both report through one `onChange(patch)` so the dialog passes the form's `update` straight in.

## Uses

- `@mui/material` dialog, text field, select and radio components
- [useScheduleForm](<Reporting Report Component - useScheduleForm.md>) for the field values, the `update` setter, the built payload and the `valid` flag; `REPORT_LABELS` and `PresetDraft` from the same file's companion `scheduleDraft`

## Used By

- Re-exported by [the report component barrel](<Reporting Report Component - index.md>), together with `PresetDraft`, `REPORT_LABELS` and `SchedulePayload`
- The generating report pages, each through `useScheduleDialog` next to [ReportActions](<Reporting Report Component - ReportActions.md>):
  [DeviceReports](<../../pages/reports/Reporting Page - DeviceReports.md>),
  [OfficeWindowsReports](<../../pages/reports/Reporting Page - OfficeWindowsReports.md>),
  [PatchManagement](<../../pages/reports/Reporting Page - PatchManagement.md>),
  [HddTickets](<../../pages/reports/Reporting Page - HddTickets.md>),
  [SlaPerformance](<../../pages/reports/Reporting Page - SlaPerformance.md>),
  [AgencyUtilization](<../../pages/reports/Reporting Page - AgencyUtilization.md>) and
  [AnnualUtilization](<../../pages/reports/Reporting Page - AnnualUtilization.md>)

## Key Behavior

- Save schedule is disabled until To holds at least one address, every To and CC entry contains an `@`, and Subject is non-blank; while `saving` Cancel and Save are disabled and the backdrop and Escape key are ignored, so the dialog cannot disappear under a request in flight.
- Name is prefilled `<agency> <report label>` (trimmed) for an agency report and just the label for an agency-wide one; Subject is prefilled `{agency} {report} {period}` or `{report} {period}` on the same rule, and its caption lists the placeholders the server fills (`agency`, `report`, `period`, `date`). The Body caption says the same placeholders apply there.
- The Format radio appears only for `office_windows` and writes `options.format`; every other report's options pass through from the draft untouched.
- The dialog never calls the server: `onSave` receives the payload and the owning hook decides what to do with it, so the component can be rendered with a spy in tests.
- The field components are the parts with their own rules: the recipient line is used twice (To and CC) with one input mode and one caption default, and the day and hour selects carry the two captions that explain the server's clamping and timezone. The dialog itself is left as composition.

## Cleanup Notes

- Covered by `ScheduleDialog.test.tsx`.

## Source

[client/src/components/report/ScheduleDialog.tsx](../../../../client/src/components/report/ScheduleDialog.tsx), [client/src/components/report/RecipientsField.tsx](../../../../client/src/components/report/RecipientsField.tsx), [client/src/components/report/DayHourFields.tsx](../../../../client/src/components/report/DayHourFields.tsx)
