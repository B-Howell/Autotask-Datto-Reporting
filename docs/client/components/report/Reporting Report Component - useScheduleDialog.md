# useScheduleDialog

> Hook that owns the Schedule dialog for one report page: opens it with a draft of the report on screen, and on save stores the preset then the schedule, toasting the outcome.

## Purpose

A report page should only have to say what it is showing. `useScheduleDialog` takes a factory for that description and handles everything after the click: the dialog's open state, the two-step save against the presets and schedules routes, the success and failure toasts, and the cleanup when the second step fails. Pages compose `ReportActions` and `ScheduleDialog` with what this hook returns.

## Interface

`useScheduleDialog(draftFactory: () => PresetDraft | null)` returns:

| Name | Type | Description |
|---|---|---|
| `open` | `boolean` | Dialog visibility. |
| `draft` | `PresetDraft \| null` | The draft captured on the last open; null until the first. |
| `openDialog` | `() => void` | Calls the factory; a null result leaves the dialog closed. |
| `closeDialog` | `() => void` | Closes without saving. |
| `save` | `(payload: SchedulePayload) => Promise<void>` | Creates the preset, then the schedule. |
| `saving` | `boolean` | True while `save` is in flight. |

Default export: `useScheduleDialog`.

## Uses

- `react` (`useState`, `useCallback`)
- [presets API](<../../api/Reporting API - presets.md>) for `createPreset` and `deletePreset`, [schedules API](<../../api/Reporting API - schedules.md>) for `createSchedule`
- [toastStore](<../../store/Reporting Store - toastStore.md>) through `getState().showToast`, [reportJob util](<../../utils/Reporting Util - reportJob.md>) for `errorMessage`
- `PresetDraft` from `scheduleDraft`, `SchedulePayload` from [useScheduleForm](<Reporting Report Component - useScheduleForm.md>)

## Used By

- Re-exported by [the report component barrel](<Reporting Report Component - index.md>)
- No page yet; the next change calls it from each generating report page

## Key Behavior

- `openDialog` captures a fresh draft object on every open, which is what makes [useScheduleForm](<Reporting Report Component - useScheduleForm.md>) show fresh defaults; a page should build the draft in the factory rather than memoise one.
- `save` posts the preset first because a schedule needs a `preset_id`. On success it toasts `Scheduled: next run <local date and time>` (or just `Scheduled` when the server returns no `next_run_at`) and closes the dialog; the draft is kept so the dialog does not change shape while it fades out.
- On any failure it toasts the error message (the server's `detail` for an `ApiError`) and leaves the dialog open with the user's values intact. If the preset was created but the schedule was rejected, the preset is deleted again so nothing dangles on the server; that delete cannot be refused with a 409 because no schedule references the preset, and its own failure is swallowed rather than raising a second toast.
- `openDialog` is recreated whenever `draftFactory` changes; pages that pass an inline arrow get a new callback each render, which is harmless for a button handler.

## Cleanup Notes

- Covered by `useScheduleDialog.test.ts` with the api namespaces mocked.

## Source

[client/src/components/report/useScheduleDialog.ts](../../../../client/src/components/report/useScheduleDialog.ts)
