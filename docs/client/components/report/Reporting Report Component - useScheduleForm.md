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
| `valid` | `boolean` | True once there is a To address, no To or CC entry lacks an `@`, and the subject is non-blank. |

Exports the `ScheduleFormValues` and `SchedulePayload` types. `scheduleDraft.ts` exports `PresetDraft`, `REPORT_LABELS`, `defaultName`, `defaultSubject`, `splitAddresses`, `isEmailAddress`, `invalidAddresses` and the two draft factories:

| Export | Signature | Description |
|---|---|---|
| `agencyPresetDraft` | `(reportType, agency: EffectiveAgency, options = {}) => PresetDraft` | A draft for one agency or group: `agencyKey` is `String(valueFor(agency))` (`'1000'` or `'group:Name'`), `agencyName` the agency's name. |
| `agencyWidePresetDraft` | `(reportType, options = {}) => PresetDraft` | A draft for a report covering every agency: null key, empty name. |
| `isEmailAddress` | `(text) => boolean` | True when the text contains an `@`. |

## Uses

- `react` (`useState`, `useCallback`)
- [API types](<../../api/Reporting API - types.md>): `PresetInput`, `ScheduleInput`, `PresetReportType`, `EffectiveAgency`
- [scheduleDraft](../../../../client/src/components/report/scheduleDraft.ts) for the defaults and the address splitter; it takes `valueFor` from the [agencyGroups util](<../../utils/Reporting Util - agencyGroups.md>) to key an agency draft

## Used By

- [ScheduleDialog](<Reporting Report Component - ScheduleDialog.md>)
- [useScheduleDialog](<Reporting Report Component - useScheduleDialog.md>) takes the `SchedulePayload` type for its `save`
- The draft factories, through the [report component barrel](<Reporting Report Component - index.md>): [HddTickets](<../../pages/reports/Reporting Page - HddTickets.md>), [PatchManagement](<../../pages/reports/Reporting Page - PatchManagement.md>) and [Office Windows presetDraft](<../../pages/reports/officeWindows/Reporting Office Windows - presetDraft.md>) call `agencyPresetDraft`; [AgencyUtilization](<../../pages/reports/Reporting Page - AgencyUtilization.md>), [SlaPerformance](<../../pages/reports/Reporting Page - SlaPerformance.md>) and [Annual Utilization presetDraft](<../../pages/reports/annualUtilization/Reporting Annual Utilization - presetDraft.md>) call `agencyWidePresetDraft`
- [DeliveryTestButton](<../../pages/scheduledReports/Reporting Scheduled Reports - DeliveryTestButton.md>) uses `isEmailAddress` for its one address

## Key Behavior

- Edits are stored together with the draft object they were made against. When the dialog is opened again for a different report the page passes a new draft object, the stored edits no longer match it, and the hook shows fresh defaults; there is no reset effect and no remount, which keeps the hook clear of the react-hooks compiler rules about setting state in effects.
- `REPORT_LABELS` must match `REPORT_LABELS` in `server/services/scheduled_runs.py`: the server fills `{report}` with its copy, and the preset name built here uses this one, so the two should read the same. The type is `Record<PresetReportType, string>`, so a new report type fails the build until it has a label.
- `defaultName` is `<agencyName> <label>` trimmed when `agencyKey` is not null, else the label; `defaultSubject` is `{agency} {report} {period}` or `{report} {period}` on the same test. The agency key, not the name, decides, because the agency-wide reports send an empty name.
- `splitAddresses` splits on commas and semicolons, trims each part, drops empties and drops repeats compared case-insensitively (the first spelling wins), so `a@x.com;; b@x.com` yields two addresses and `Ops@x.com, ops@x.com` one. `invalidAddresses` returns the entries that fail `isEmailAddress` (no `@`, the server's own test); the form's `valid` requires it to be empty for To and CC, and `RecipientsField` shows the first offender. Anything else about an address is still left to the server's 400.
- The preset's `options` are the draft's, except for `office_windows` where the chosen `format` is laid over them; the initial format is the draft's `options.format` when it is `pdf`, else `docx`.
- `name` and `subject` are trimmed in the payload; `body` is sent as typed.
- The draft factories are the only way pages build a `PresetDraft`: the agency key rule (`valueFor` as a string) and the agency-wide shape (null key, empty name) live here once, so a page passes a report type, the reported agency and any renderer options and cannot misspell the shape. The device page's `devicePresetDraft` still writes the literal because it starts from a dropdown value, not an agency.

## Cleanup Notes

- `scheduleDraft.test.ts` covers the draft factories and `isEmailAddress`; the defaults and splitting are exercised through `ScheduleDialog.test.tsx`.

## Source

[client/src/components/report/useScheduleForm.ts](../../../../client/src/components/report/useScheduleForm.ts), [client/src/components/report/scheduleDraft.ts](../../../../client/src/components/report/scheduleDraft.ts)
