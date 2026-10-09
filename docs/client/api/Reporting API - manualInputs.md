# Manual Inputs API

> Reads and saves the hand-entered values (such as licence counts) stored per agency and report type.

## Purpose

`client/src/api/manualInputs.ts` wraps the `/api/manual-inputs` routes. Some report figures do not exist in either vendor system; the Office/Windows licensing report, for example, needs the number of licences the client actually owns. Those values are typed into the report and persisted on the server keyed by agency, report type and field, so they survive a refresh of the vendor data and appear in the exports.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchManualInputs` | `GET /api/manual-inputs?agency_key&report_type` | `agencyKey: string`, `reportType: string` | `Promise<ManualInputs>`, a `Record<string, string>` of field key to value |
| `saveManualInput` | `PUT /api/manual-inputs` | `agencyKey`, `reportType`, `fieldKey`, `value: string` | `Promise<{ ok: boolean }>` |

## Uses

- [client](<Reporting API - client.md>): `getJson`, `putJson`, `query`.
- [types](<Reporting API - types.md>): `ManualInputs`.

## Used By

- [useManualInputs](<../pages/reports/officeWindows/Reporting Office Windows - useManualInputs.md>), via `manualInputsApi` from [index](<Reporting API - index.md>). It is the only caller.

## Key Behavior

- `agencyKey` is a string, not a company id, so an agency group (`group:<name>`) can carry its own inputs distinct from any member's.
- Values are always strings; the page parses numbers itself. An empty string is a valid stored value.
- Saves are one field per `PUT`; there is no batch endpoint. The consuming hook debounces each field with a timer so typing does not issue a request per keystroke.
- The server accepts `value: null` and stores it as an empty string; the client always sends a string.
- Neither call accepts an abort signal; they are quick and not tracked as jobs.

## Cleanup Notes

- None noted.

## Source

[client/src/api/manualInputs.ts](../../../client/src/api/manualInputs.ts)
