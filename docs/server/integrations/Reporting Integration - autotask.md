# Autotask integration

> The Autotask PSA REST client: id-cursor paging, chunked id lookups, picklist caching, the per-request read of the base URL and auth headers from the credentials service, the one-record query that tests a connection, and the process-wide instance services call through `autotask()`.

## Purpose

Autotask's query endpoint returns at most 500 records, has no page token, and for some entities (TimeEntries among them) returns nothing unless an id filter is present. This module hides those quirks behind a handful of methods so that services only ever express "every ticket matching these filters" or "these configuration items by id". Services never see a URL, header or page number.

## Interface

| Name | Description |
|---|---|
| `Connection(base_url, headers)` | Frozen dataclass: where a request goes and the `UserName`, `Secret` and `ApiIntegrationCode` headers it carries. |
| `connection_from(values)` | The `Connection` the given credential values describe: `autotask_base_url` and the three headers from `autotask_username`, `autotask_secret` and `autotask_integration_code`. |
| `current_connection()` | `connection_from` of the credentials in effect. Calls `credentials.require(AUTOTASK)` first, so a blank field raises `CredentialsMissing` before any request. |
| `AutotaskClient(connection=current_connection, timeout=60)` | Builds a `requests.Session` holding only the JSON content-type header; `connection()` is called before every request for the URL and auth headers. |
| `query_page(entity, filters, include_fields=None, max_records=500)` | One POST to `/<Entity>/query`; returns the `items` list. |
| `query_all(entity, filters, include_fields=None, on_page=None)` | Every record matching `filters`, walked with the id cursor. `on_page(count_so_far)` is called after each page. |
| `query_by_ids(entity, ids, include_fields=None, on_chunk=None)` | Records for a list of ids, fetched with `in` filters in chunks of `ID_CHUNK_SIZE` (200). `on_chunk(done, total)` after each chunk. |
| `get(entity, item_id)` | GET `/<Entity>/<id>`, returning the `item` dict. |
| `patch(entity, item_id, payload)` | PATCH `/<Entity>/<id>`; returns the raw `Response` after `raise_for_status`. |
| `picklists(entity)` | `{field name: {int value: label}}` for every picklist field on the entity, fetched once per entity and kept until the credentials change. |
| `forget_picklists()` | Drops the cached labels under the picklist lock; registered with `credentials.on_change` for the process-wide client. |
| `picklist(entity, field_name)` | One field's `{value: label}` map, or `{}`. |
| `probe(client, redact=http_errors.unchanged)` | The connection test: `query_page(PROBE_ENTITY, PROBE_FILTER, PROBE_FIELDS, max_records=1)` run through `http_errors.probe`, so it answers a `ProbeResult` rather than raising; `redact` runs over a refusal's body before it is cut to length. |
| `PROBE_ENTITY`, `PROBE_FILTER`, `PROBE_FIELDS` | `Companies`, `({"op": "eq", "field": "id", "value": 0},)` and `("id",)`: the smallest query every tenant can answer, since company 0 is the MSP's own record. |
| `autotask()` | The process-wide client, built at import with the default `current_connection`. |
| `PAGE_SIZE`, `ID_CHUNK_SIZE`, `DEFAULT_TIMEOUT` | 500, 200 and 60 seconds. |

## Uses

- `requests` (`Session` for connection reuse).
- [credentials service](<../services/Reporting Service - credentials.md>) for `require` (which returns the current values), `on_change` and `AUTOTASK`: the base URL, username, secret and integration code are read from it on every request.
- [http_errors](<Reporting Integration - http_errors.md>) for `probe`, which words a refused test without the URL.

## Used By

- [devices service](<../services/Reporting Service - devices.md>), [office_windows service](<../services/Reporting Service - office_windows.md>), [hdd_tickets service](<../services/Reporting Service - hdd_tickets.md>), [tickets service](<../services/Reporting Service - tickets.md>), [sla service](<../services/Reporting Service - sla.md>), [utilization service](<../services/Reporting Service - utilization.md>)
- [credentials service](<../services/Reporting Service - credentials.md>) builds a throwaway `AutotaskClient(connection=lambda: connection_from(values))` and calls `probe` on it for a Settings page test.
- [server/tests/test_autotask_client.py](../../../server/tests/test_autotask_client.py) exercises paging and chunking against a stubbed session with a fixed `Connection`, proves the default connection carries the stored credentials, uses a rotated secret on the next request, drops the picklist cache when a credential is saved, and refuses with `CredentialsMissing` when a field is blank, and proves the probe's exact request and its wording of a refusal.

## Key Behavior

- Credentials per request: `_request` calls `self._connection()` before every POST, GET and PATCH and passes the result's headers with that one call, so nothing credential-derived is held on the session. A value saved on the Settings page is used by the very next request with no restart, and a blank field surfaces as `credentials.CredentialsMissing` (`Autotask credentials are not configured; open Settings`) before a request is attempted; [routers/common](<../routers/Reporting Router - common.md>) maps it to 503. The credentials dict is cached by the service, so the per-request read costs no database or key work.
- Anchored id cursor: `query_all` appends `{"op": "gt", "field": "id", "value": max_id}` to the caller's filters on every page, starting at 0, and sets `max_id` to the largest id in the page just received. The loop ends on the first empty page. Because the cursor is present from the first request, entities that require an id filter work without special casing.
- `max_id` is the largest id in the page, not the last item, so the walk is correct whatever order Autotask returns a page in; a record created while paging is picked up only if its id is above the cursor.
- Id chunking: `query_by_ids` slices the id list into runs of 200 and issues one `in` query per run; an empty id list returns an empty list without a request. Callers wanting labels pass `include_fields=["id", "name"]`.
- Picklist caching: `picklists(entity)` downloads `/<Entity>/entityInformation/fields` once, keeps only fields with `picklistValues`, drops inactive values, and keys labels by `int(value)`. The cache lives on the instance behind `_picklists_lock`, so a device report that needs five picklists costs one download, and a label edited in Autotask is seen after a restart. Labels are per tenant, so the module registers `forget_picklists` with `credentials.on_change` at import: a save on the Settings page (a different zone, say) clears the cache under the same lock and the next report downloads the labels the new credentials reach.
- `include_fields` matters for user-defined fields: Autotask returns `userDefinedFields` only when `includeFields` is omitted, which is why the device services make two passes over the same ids.
- Timeouts: every request passes `timeout=self._timeout` (60 seconds by default). There is no retry; an HTTP error raises from `raise_for_status` and the calling report fails with that message, which the snapshot layer records in `sync_state`.
- `patch` is the only write in the whole integration layer; it is used for device user-defined field write-back.
- The connection test is one POST to `<base URL>/Companies/query` with the body `{"filter": [{"op": "eq", "field": "id", "value": 0}], "maxRecords": 1, "includeFields": ["id"]}` and the usual three headers. Company 0 is the zero account every tenant has, `maxRecords` 1 and the single field keep the answer to a few bytes, and no cursor is added because `query_page` is used rather than `query_all`. A 401 or 403 from bad headers, a 404 from a base URL that is not an Autotask zone, or a connection failure comes back as a `ProbeResult` whose message holds the status and the trimmed body (or the failure's kind), never the URL that was tried.

## Cleanup Notes

- `DEFAULT_TIMEOUT` is not configurable from settings, unlike the Datto timeout.

## Source

[server/integrations/autotask.py](../../../server/integrations/autotask.py)
