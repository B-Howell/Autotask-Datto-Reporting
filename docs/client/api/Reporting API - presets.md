# Presets API

> Lists, creates, renames and deletes the stored report configurations that a schedule renders.

## Purpose

`client/src/api/presets.ts` wraps the `/api/presets` routes. A preset is one report's configuration (type, agency, the options the renderer reads) stored on the server so a schedule can render it unattended. The Schedule dialog creates one from the report the user has just generated; the scheduled reports page lists and removes them.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchPresets` | `GET /api/presets` | none | `Promise<ReportPreset[]>` |
| `createPreset` | `POST /api/presets` | `body: PresetInput` | `Promise<ReportPreset>` (201) |
| `updatePreset` | `PUT /api/presets/{id}` | `id: number`, `body: Partial<PresetInput>` | `Promise<ReportPreset>` |
| `deletePreset` | `DELETE /api/presets/{id}` | `id: number` | `Promise<{ deleted: boolean }>` |

## Uses

- [client](<Reporting API - client.md>): `getJson`, `postJson`, `putJson`, `deleteJson`.
- [types](<Reporting API - types.md>): `ReportPreset`, `PresetInput`.

## Used By

- [useScheduleDialog](<../components/report/Reporting Report Component - useScheduleDialog.md>) creates the preset a new schedule points at, and deletes it again if the schedule itself cannot be saved.
- The [Scheduled Reports page](<../pages/Reporting Page - ScheduledReports.md>) reads presets only through the schedule rows they are joined to; deleting a schedule there leaves its preset in place, so this module is not called from that page.

## Key Behavior

- The server validates on create and update and answers 400 with a `detail` naming the field: an unknown `report_type`, an agency-scoped report with no `agency_key`, a blank `name`, or an option of the wrong shape (`format` other than `docx` or `pdf`, `columns` not a list of strings). The helper rejects with an `ApiError` carrying that message, so callers show `err.message` as is.
- `updatePreset` sends only the keys given; the server merges them over the stored row before validating, so a rename does not need to resend `options`.
- `deletePreset` rejects with a 409 `ApiError` while any schedule still references the preset. Delete the schedules first.
- Options the renderer does not read for that report type are dropped server-side, so the returned `options` can be smaller than what was sent.
- `agency_key` is sent as the string form of the agency selection (`'1000'` or `'group:Name'`) or `null` for the agency-wide reports; see [Reporting Router - presets](<../../server/routers/Reporting Router - presets.md>).

## Cleanup Notes

- None noted.

## Source

[client/src/api/presets.ts](../../../client/src/api/presets.ts)
