# Annual Utilization presetDraft

> Builds the `PresetDraft` the annual page hands to the Schedule dialog: the saved agency selection and the rate overrides, each only when the user actually set one.

## Purpose

The annual report has two user settings that shape the workbook, the agencies included and
the hourly rates per department. A preset should carry a real choice but not a default: a
preset that froze today's defaults would stop following the tenant settings when they change.
This module applies that rule so the page does not have to.

## Interface

`rateOverrides(rates, departments): Rates` and
`annualPresetDraft({ companies, rates, departments }): PresetDraft`

| Input | Type | Description |
|---|---|---|
| `companies` | `Set<string> \| null` | The store's `selectedCompanies`; null means no preference saved. |
| `rates` | `Rates` | The store's rates map; it holds every department once the settings dialog has been used. |
| `departments` | `RatedDepartment[]` | The tenant's departments with their standard rates. |

Returns `{ reportType: 'annual_utilization', agencyKey: null, agencyName: '', options }` where
`options.companies` is the selection as a list when one exists and `options.rates` is
`rateOverrides(rates, departments)` when that has entries.

## Uses

- `PresetDraft` from [the report component barrel](<../../../components/report/Reporting Report Component - index.md>)
- [departments](<Reporting Annual Utilization - departments.md>) for the `Rates` and `RatedDepartment` types

## Used By

- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>) inside its `useScheduleDialog` factory

## Key Behavior

- Never null: the report has no agency and is schedulable as soon as it has been generated.
- The fiscal year start is not stored; a scheduled run derives the year from its run date.
- `rateOverrides` keeps an entry only when `Number(rate)` differs from the department's
  standard rate, so `'95'` against a standard 95 is not an override while `'130'` is. A name
  with no standard rate is always kept. This matters because the settings dialog writes the
  merged map back to the store, so after the first edit the store holds every department
  whether or not the user changed it.
- A blank or whitespace entry is skipped, never stored as an override of 0; a field the user
  cleared in the settings dialog therefore falls back to the standard rate in the preset.

## Cleanup Notes

- Covered by `presetDrafts.test.ts` in the parent folder.

## Source

[client/src/pages/reports/annualUtilization/presetDraft.ts](../../../../../client/src/pages/reports/annualUtilization/presetDraft.ts)
