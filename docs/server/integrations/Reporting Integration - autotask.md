# Autotask integration

> The Autotask PSA REST client: id-cursor paging, chunked id lookups, picklist caching, and the process-wide instance services call through `autotask()`.

## Purpose

Autotask's query endpoint returns at most 500 records, has no page token, and for some entities (TimeEntries among them) returns nothing unless an id filter is present. This module hides those quirks behind a handful of methods so that services only ever express "every ticket matching these filters" or "these configuration items by id". Services never see a URL, header or page number.

## Interface

| Name | Description |
|---|---|
| `AutotaskClient(base_url, username, secret, integration_code, timeout=60)` | Builds a `requests.Session` with the `UserName`, `Secret`, `ApiIntegrationCode` and JSON content-type headers. |
| `query_page(entity, filters, include_fields=None, max_records=500)` | One POST to `/<Entity>/query`; returns the `items` list. |
| `query_all(entity, filters, include_fields=None, on_page=None)` | Every record matching `filters`, walked with the id cursor. `on_page(count_so_far)` is called after each page. |
| `query_by_ids(entity, ids, include_fields=None, on_chunk=None)` | Records for a list of ids, fetched with `in` filters in chunks of `ID_CHUNK_SIZE` (200). `on_chunk(done, total)` after each chunk. |
| `get(entity, item_id)` | GET `/<Entity>/<id>`, returning the `item` dict. |
| `patch(entity, item_id, payload)` | PATCH `/<Entity>/<id>`; returns the raw `Response` after `raise_for_status`. |
| `picklists(entity)` | `{field name: {int value: label}}` for every picklist field on the entity, fetched once per process. |
| `picklist(entity, field_name)` | One field's `{value: label}` map, or `{}`. |
| `autotask()` | The lazily built singleton, constructed from `settings` under a lock. |
| `PAGE_SIZE`, `ID_CHUNK_SIZE`, `DEFAULT_TIMEOUT` | 500, 200 and 60 seconds. |

## Uses

- `requests` (`Session` for header reuse).
- [config](<../Reporting Server - config.md>) for `autotask_base_url`, `autotask_username`, `autotask_secret`, `autotask_integration_code`.

## Used By

- [devices service](<../services/Reporting Service - devices.md>), [office_windows service](<../services/Reporting Service - office_windows.md>), [hdd_tickets service](<../services/Reporting Service - hdd_tickets.md>), [tickets service](<../services/Reporting Service - tickets.md>), [sla service](<../services/Reporting Service - sla.md>), [utilization service](<../services/Reporting Service - utilization.md>)
- `server/tests/test_autotask_client.py` exercises paging and chunking against a stubbed session.

## Key Behavior

- Anchored id cursor: `query_all` appends `{"op": "gt", "field": "id", "value": max_id}` to the caller's filters on every page, starting at 0, and sets `max_id` to the largest id in the page just received. The loop ends on the first empty page. Because the cursor is present from the first request, entities that require an id filter work without special casing.
- `max_id` is the largest id in the page, not the last item, so the walk is correct whatever order Autotask returns a page in; a record created while paging is picked up only if its id is above the cursor.
- Id chunking: `query_by_ids` slices the id list into runs of 200 and issues one `in` query per run; an empty id list returns an empty list without a request. Callers wanting labels pass `include_fields=["id", "name"]`.
- Picklist caching: `picklists(entity)` downloads `/<Entity>/entityInformation/fields` once, keeps only fields with `picklistValues`, drops inactive values, and keys labels by `int(value)`. The cache lives on the instance behind `_picklists_lock` for the life of the process, so a device report that needs five picklists costs one download, and a label edited in Autotask is seen after a restart.
- `include_fields` matters for user-defined fields: Autotask returns `userDefinedFields` only when `includeFields` is omitted, which is why the device services make two passes over the same ids.
- Timeouts: every request passes `timeout=self._timeout` (60 seconds by default). There is no retry; an HTTP error raises from `raise_for_status` and the calling report fails with that message, which the snapshot layer records in `sync_state`.
- `patch` is the only write in the whole integration layer; it is used for device user-defined field write-back.

## Cleanup Notes

- `DEFAULT_TIMEOUT` is not configurable from settings, unlike the Datto timeout.

## Source

[server/integrations/autotask.py](../../../server/integrations/autotask.py)
