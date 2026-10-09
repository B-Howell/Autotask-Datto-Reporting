# useScheduleForm

> The Schedule dialog's field state: prefilled from a `PresetDraft`, edited through one `update` call, and read back as the preset and schedule bodies the server expects.

## Purpose

`useScheduleForm` keeps the dialog's eight values (name, to, cc, subject, body, day of month, hour, format) and the two derived results the dialog needs: the payload to send and whether it may be sent. Its defaults and the recipient splitting come from `scheduleDraft.ts`, which also declares the `PresetDraft` shape the report pages hand over and the `REPORT_LABELS` table that names each report type.

## Interface

`useScheduleForm(draft: PresetDraft)` returns:

| Name | Type | Description |
|---|---|---|
| `values` | `ScheduleFormValues` | The current field strings and numbers. |
| `update` | `(patch: Partial<ScheduleFormValues>) => void` | Merges a change into the values. |
| `payload` | `SchedulePayload` | `{ preset, schedule }` built from the draft and the values. |
| `valid` | `boolean` | True once there is a To address and a non-blank subject. |

Exports the `ScheduleFormValues` and `SchedulePayload` types. `scheduleDraft.ts` exports `PresetDraft`, `REPORT_LABELS`, `defaultName`, `defaultSubject` and `splitAddresses`.

## Uses

- `react` (`useState`, `useCallback`)
- [API types](<../../api/Reporting API - types.md>): `PresetInput`, `ScheduleInput`, `PresetReportType`
- [scheduleDraft](../../../../client/src/components/report/scheduleDraft.ts) for the defaults and the address splitter

## Used By

- [ScheduleDialog](<Reporting Report Component - ScheduleDialog.md>)
- [useScheduleDialog](<Reporting Report Component - useScheduleDialog.md>) takes the `SchedulePayload` type for its `save`

## Key Behavior

- Edits are stored together with the draft object they were made against. When the dialog is opened again for a different report the page passes a new draft object, the stored edits no longer match it, and the hook shows fresh defaults; there is no reset effect and no remount, which keeps the hook clear of the react-hooks compiler rules about setting state in effects.
- `REPORT_LABELS` must match `REPORT_LABELS` in `server/services/scheduled_runs.py`: the server fills `{report}` with its copy, and the preset name built here uses this one, so the two should read the same. The type is `Record<PresetReportType, string>`, so a new report type fails the build until it has a label.
- `defaultName` is `<agencyName> <label>` trimmed when `agencyKey` is not null, else the label; `defaultSubject` is `{agency} {report} {period}` or `{report} {period}` on the same test. The agency key, not the name, decides, because the agency-wide reports send an empty name.
- `splitAddresses` splits on commas and semicolons, trims each part and drops empties, so `a@x.com;; b@x.com` yields two addresses. It does not validate the addresses; the server rejects one without an `@` with a 400 the dialog's owner toasts.
- The preset's `options` are the draft's, except for `office_windows` where the chosen `format` is laid over them; the initial format is the draft's `options.format` when it is `pdf`, else `docx`.
- `name` and `subject` are trimmed in the payload; `body` is sent as typed.

## Cleanup Notes

- None noted.

## Source

[client/src/components/report/useScheduleForm.ts](../../../../client/src/components/report/useScheduleForm.ts), [client/src/components/report/scheduleDraft.ts](../../../../client/src/components/report/scheduleDraft.ts)
