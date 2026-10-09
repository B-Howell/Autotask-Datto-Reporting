# useManualInputs

> The licence figures and visible-plan choice typed against one agency, loaded from and saved to the server per field with a short debounce.

## Purpose

Licence counts and the Office 365 plan selection come from the account manager, not from a vendor API, so they are stored in the server's `manual_inputs` table keyed by agency and report type. This hook owns that state for the Office and Windows page: it loads an agency's saved map when a report is generated, keeps the three editable maps and the plan list in React state, and writes every edit back one field at a time after the user pauses. Scoping everything to one agency key is the rule that stops one agency's numbers bleeding into another's.

## Interface

Returns:

| Member | Description |
|---|---|
| `agencyKey` | The agency currently loaded, or `null` before the first Generate. |
| `officeLicenses`, `osLicenses` | `ManualInputs` maps keyed by product name (both start as the same saved map). |
| `officeAvailable` | `ManualInputs` map keyed by SKU, from the `available::` entries. |
| `visibleSkus` | Ticked Office 365 plans, canonical order. |
| `loadFor(key)` | Switch to an agency: reset state, then fetch its saved values. |
| `setOfficeLicense(name, value)`, `setOsLicense(name, value)` | Update and save under the bare product name. |
| `setOfficeAvailable(name, value)` | Update and save under `availableKey(name)`. |
| `setVisibleSkus(list)` | Replace the plan list and save it as JSON under `VISIBLE_SKUS_KEY`. |
| `toggleSku(sku)` | `setVisibleSkus(toggleSku(visibleSkus, sku))`. |

## Uses

- `manualInputsApi` from [API manualInputs](<../../../api/Reporting API - manualInputs.md>); `ManualInputs` type from [API types](<../../../api/Reporting API - types.md>).
- `REPORT_TYPE` from [reportRows](<Reporting Office Windows - reportRows.md>).
- Keys, parsers and `toggleSku` from [skus](<Reporting Office Windows - skus.md>).

## Used By

- [OfficeWindowsReports page](<../Reporting Page - OfficeWindowsReports.md>), which calls `loadFor(String(valueFor(agency)))` in its Generate handler before starting the report fetch.

## Key Behavior

- Agency key: the page passes `valueFor(agency)` stringified, so a single company is keyed by its numeric Autotask id and a group by `group:<name>`. This is the `agency_key` column on the server.
- Load round trip: `loadFor` synchronously sets the key, clears all three maps and resets the plan list to every plan, then issues `GET /api/manual-inputs?agency_key=<key>&report_type=office_windows`. The response is one flat `{ field_key: value }` map. `applySaved` assigns that whole map to both `officeLicenses` and `osLicenses` (Office and Windows product names never collide), derives `officeAvailable` with `availableValuesOf`, and derives `visibleSkus` with `visibleSkusOf`. A failed load logs to the console and leaves the cleared state.
- Debounce: each setter updates React state immediately, then calls `save(fieldKey, value)`. `save` keeps one timer per field key in a ref; a new edit to the same field clears the pending timer and restarts the 600ms wait (`SAVE_DELAY_MS`). Edits to different fields have independent timers, so typing in two cells quickly produces two requests, not one.
- Save round trip: when a timer fires it sends `PUT /api/manual-inputs` with `{ agency_key, report_type: 'office_windows', field_key, value }`. The server upserts that single row (`INSERT ... ON CONFLICT DO UPDATE` on agency, report type and field). Failures are logged, not surfaced; the on-screen value is already updated, so the user sees no error.
- `save` is a no-op while `agencyKey` is null, and the key is captured when `save` is called, so a timer that fires after the user switches agency still writes to the agency the edit was made on.
- Plan changes are saved as `JSON.stringify(list)`; an empty list is stored as `[]`, which is how "every box unticked" survives a reload.

## Cleanup Notes

- No stale-response guard on `loadFor`: if a user generates for agency A and then agency B before A's GET resolves, A's values are applied after B's reset and attributed to B's key on screen.
- Pending timers are not cleared on unmount, so navigating away within 600ms of an edit still fires the save (harmless, but unobservable).

## Source

[client/src/pages/reports/officeWindows/useManualInputs.ts](../../../../../client/src/pages/reports/officeWindows/useManualInputs.ts)
