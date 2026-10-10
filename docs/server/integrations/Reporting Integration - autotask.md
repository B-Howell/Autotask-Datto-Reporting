# Autotask integration

> The Autotask PSA REST client: id-cursor paging, chunked id lookups, picklist caching, the per-request read of the base URL and auth headers from the credentials service, and the process-wide instance services call through `autotask()`.

## Purpose

Autotask's query endpoint returns at most 500 records, has no page token, and for some entities (TimeEntries among them) returns nothing unless an id filter is present. This module hides those quirks behind a handful of methods so that services only ever express "every ticket matching these filters" or "these configuration items by id". Services never see a URL, header or page number.

## Interface

| Name | Description |
|---|---|
| `Connection(base_url, headers)` | Frozen dataclass: where a request goes and the `UserName`, `Secret` and `ApiIntegrationCode` headers it carries. |
| `current_connection()` | The `Connection` from the credentials in effect. Calls `credentials.require(AUTOTASK)` first, so a blank field raises `CredentialsMissing` before any request. |
| `AutotaskClient(connection=current_connection, timeout=60)` | Builds a `requests.Session` holding only the JSON content-type header; `connection()` is called before every request for the URL and auth headers. |
| `query_page(entity, filters, include_fields=None, max_records=500)` | One POST to `/<Entity>/query`; returns the `items` list. |
| `query_all(entity, filters, include_fields=None, on_page=None)` | Every record matching `filters`, walked with the id cursor. `on_page(count_so_far)` is called after each page. |
| `query_by_ids(entity, ids, include_fields=None, on_chunk=None)` | Records for a list of ids, fetched with `in` filters in chunks of `ID_CHUNK_SIZE` (200). `on_chunk(done, total)` after each chunk. |
| `get(entity, item_id)` | GET `/<Entity>/<id>`, returning the `item` dict. |
| `patch(entity, item_id, payload)` | PATCH `/<Entity>/<id>`; returns the raw `Response` after `raise_for_status`. |
| `picklists(entity)` | `{field name: {int value: label}}` for every picklist field on the entity, fetched once per process. |
| `picklist(entity, field_name)` | One field's `{value: label}` map, or `{}`. |
| `autotask()` | The lazily built singleton, constructed under a lock with the default `current_connection`. |
| `PAGE_SIZE`, `ID_CHUNK_SIZE`, `DEFAULT_TIMEOUT` | 500, 200 and 60 seconds. |

## Uses

- `requests` (`Session` for connection reuse).
- [credentials service](<../services/Reporting Service - credentials.md>) for `require`, `current()` and `AUTOTASK`: the base URL, username, secret and integration code are read from it on every request.

## Used By

- [devices service](<../services/Reporting Service - devices.md>), [office_windows service](<../services/Reporting Service - office_windows.md>), [hdd_tickets service](<../services/Reporting Service - hdd_tickets.md>), [tickets service](<../services/Reporting Service - tickets.md>), [sla service](<../services/Reporting Service - sla.md>), [utilization service](<../services/Reporting Service - utilization.md>)
- [server/tests/test_autotask_client.py](../../../server/tests/test_autotask_client.py) exercises paging and chunking against a stubbed session with a fixed `Connection`, and proves the default connection carries the stored credentials, uses a rotated secret on the next request, and refuses with `CredentialsMissing` when a field is blank.

## Key Behavior

- Credentials per request: `_request` calls `self._connection()` before every POST, GET and PATCH and passes the result's headers with that one call, so nothing credential-derived is held on the session. A value saved on the Settings page is used by the very next request with no restart, and a blank field surfaces as `credentials.CredentialsMissing` (`Autotask credentials are not configured; open Settings`) before a request is attempted; [routers/common](<../routers/Reporting Router - common.md>) maps it to 503. The credentials dict is cached by the service, so the per-request read costs no database or key work.
- Anchored id cursor: `query_all` appends `{"op": "gt", "field": "id", "value": max_id}` to the caller's filters on every page, starting at 0, and sets `max_id` to the largest id in the page just received. The loop ends on the first empty page. Because the cursor is present from the first request, entities that require an id filter work without special casing.
- `max_id` is the largest id in the page, not the last item, so the walk is correct whatever order Autotask returns a page in; a record created while paging is picked up only if its id is above the cursor.
- Id chunking: `query_by_ids` slices the id list into runs of 200 and issues one `in` query per run; an empty id list returns an empty list without a request. Callers wanting labels pass `include_fields=["id", "name"]`.
- Picklist caching: `picklists(entity)` downloads `/<Entity>/entityInformation/fields` once, keeps only fields with `picklistValues`, drops inactive values, and keys labels by `int(value)`. The cache lives on the instance behind `_picklists_lock` for the life of the process, so a device report that needs five picklists costs one download, and a label edited in Autotask is seen after a restart.
- `include_fields` matters for user-defined fields: Autotask returns `userDefinedFields` only when `includeFields` is omitted, which is why the device services make two passes over the same ids.
- Timeouts: every request passes `timeout=self._timeout` (60 seconds by default). There is no retry; an HTTP error raises from `raise_for_status` and the calling report fails with that message, which the snapshot layer records in `sync_state`.
- `patch` is the only write in the whole integration layer; it is used for device user-defined field write-back.

## Cleanup Notes

- `DEFAULT_TIMEOUT` is not configurable from settings, unlike the Datto timeout.
- The picklist cache is not cleared when the credentials change; labels are per tenant, so pointing a running process at a different Autotask zone keeps the old labels until a restart.

## Source

[server/integrations/autotask.py](../../../server/integrations/autotask.py)
