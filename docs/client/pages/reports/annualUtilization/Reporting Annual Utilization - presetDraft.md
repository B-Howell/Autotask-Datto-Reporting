# Annual Utilization presetDraft

> Builds the `PresetDraft` the annual page hands to the Schedule dialog: the saved agency selection and the rate overrides, each only when the user actually set one.

## Purpose

The annual report has two user settings that shape the workbook, the agencies included and
the hourly rates per department. A preset should carry a real choice but not a default: a
preset that froze today's defaults would stop following the tenant settings when they change.
This module applies that rule so the page does not have to.

## Interface

`annualPresetDraft({ companies, rates }): PresetDraft`

| Input | Type | Description |
|---|---|---|
| `companies` | `Set<string> \| null` | The store's `selectedCompanies`; null means no preference saved. |
| `rates` | `Rates` | The store's raw rate overrides, before `withDefaultRates` fills in the tenant defaults. |

Returns `{ reportType: 'annual_utilization', agencyKey: null, agencyName: '', options }` where
`options.companies` is the selection as a list when one exists and `options.rates` is the
overrides when there are any.

## Uses

- `PresetDraft` from [the report component barrel](<../../../components/report/Reporting Report Component - index.md>)
- [departments](<Reporting Annual Utilization - departments.md>) for the `Rates` type

## Used By

- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>) inside its `useScheduleDialog` factory

## Key Behavior

- Never null: the report has no agency and is schedulable as soon as it has been generated.
- The fiscal year start is not stored; a scheduled run derives the year from its run date.
- The page passes the store's `rates`, not `useAnnualReport().rates`, because the hook's value
  already has the defaults laid over it and would store every department.

## Cleanup Notes

- Covered by `presetDrafts.test.ts` in the parent folder.

## Source

[client/src/pages/reports/annualUtilization/presetDraft.ts](../../../../../client/src/pages/reports/annualUtilization/presetDraft.ts)
