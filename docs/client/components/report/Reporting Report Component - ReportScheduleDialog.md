# ReportScheduleDialog

> Mounts `ScheduleDialog` from a `useScheduleDialog` result: nothing until a draft exists, then the dialog bound to the hook's state.

## Purpose

Every report page uses the Schedule dialog the same way: the hook's `openDialog` goes to the Schedule button, and the rest of its state drives the dialog, which must not mount until the first open has produced a draft. This component holds that binding once so the seven pages each add one line instead of repeating the null check and five props. It is in the report component layer.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `schedule` | `ReportSchedule` | yes | The `useScheduleDialog` result without `openDialog`: `open`, `draft`, `closeDialog`, `save`, `saving`. |

`ReportSchedule` is exported for callers that build the state themselves (the test does).

Default export: `ReportScheduleDialog`.

## Uses

- [ScheduleDialog](<Reporting Report Component - ScheduleDialog.md>) for the dialog itself
- The return type of [useScheduleDialog](<Reporting Report Component - useScheduleDialog.md>), as a type only

## Used By

- Re-exported by [the report component barrel](<Reporting Report Component - index.md>)
- Every generating report page: [DeviceReports](<../../pages/reports/Reporting Page - DeviceReports.md>), [OfficeWindowsReports](<../../pages/reports/Reporting Page - OfficeWindowsReports.md>), [PatchManagement](<../../pages/reports/Reporting Page - PatchManagement.md>), [HddTickets](<../../pages/reports/Reporting Page - HddTickets.md>), [SlaPerformance](<../../pages/reports/Reporting Page - SlaPerformance.md>), [AgencyUtilization](<../../pages/reports/Reporting Page - AgencyUtilization.md>) and [AnnualUtilization](<../../pages/reports/Reporting Page - AnnualUtilization.md>)

## Key Behavior

- Renders null while `schedule.draft` is null, so a page that has never opened the dialog carries no dialog DOM.
- Once a draft exists the dialog stays mounted and follows `open`; the hook keeps the draft after a save or cancel so the dialog can fade out with its fields intact rather than vanishing.
- Passes `closeDialog` as `onClose` and `save` as `onSave`; the dialog itself blocks closing while `saving`.

## Cleanup Notes

- Covered by `ReportScheduleDialog.test.tsx`.

## Source

[client/src/components/report/ReportScheduleDialog.tsx](../../../../client/src/components/report/ReportScheduleDialog.tsx)
