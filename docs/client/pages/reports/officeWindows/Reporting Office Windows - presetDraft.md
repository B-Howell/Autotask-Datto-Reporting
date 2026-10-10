# Office Windows presetDraft

> Builds the `PresetDraft` the licensing page hands to the Schedule dialog: the reported agency, a Word starting format and the licence-column choice.

## Purpose

The licensing report is the one report that can be mailed as Word or PDF, and the choice
belongs in the dialog rather than on the page. This module records everything else the page
knows (which agency, whether licence columns are shown) and a `docx` format for the dialog's
Format radio to start from; `useScheduleForm` replaces the format with the radio's value when
the preset is sent.

## Interface

`officeWindowsPresetDraft({ agency, showLicenses }): PresetDraft | null`

| Input | Type | Description |
|---|---|---|
| `agency` | `EffectiveAgency \| null` | The agency the report is titled for, from `reportedAgencyForSite`; null before a run. |
| `showLicenses` | `boolean` | The page's licence-column toggle. |

Returns null without an agency; otherwise
`agencyPresetDraft('office_windows', agency, { format: 'docx', showLicenses })`, that is
`{ reportType: 'office_windows', agencyKey: String(valueFor(agency)), agencyName: agency.name,
options: { format: 'docx', showLicenses } }`.

## Uses

- `agencyPresetDraft` and `PresetDraft` from [the report component barrel](<../../../components/report/Reporting Report Component - index.md>); the factory is documented under [useScheduleForm](<../../../components/report/Reporting Report Component - useScheduleForm.md>)
- The `EffectiveAgency` type from the [API types](<../../../api/Reporting API - types.md>)

## Used By

- [OfficeWindowsReports page](<../Reporting Page - OfficeWindowsReports.md>) inside its `useScheduleDialog` factory

## Key Behavior

- A member of a configured group is reported under the group, so the stored key is the group's
  `group:Name` value and the scheduled run renders the whole group, as the page did.
- `showLicenses` is stored as a boolean because the server's preset validation rejects
  anything else for that key.

## Cleanup Notes

- Covered by `presetDrafts.test.ts` in the parent folder.

## Source

[client/src/pages/reports/officeWindows/presetDraft.ts](../../../../../client/src/pages/reports/officeWindows/presetDraft.ts)
