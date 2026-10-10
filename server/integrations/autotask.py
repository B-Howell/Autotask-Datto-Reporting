"""Autotask PSA REST client.

Autotask's query endpoint caps a page at 500 records and has no page token;
the reliable way to walk a large result is an `id > last_id` cursor. Some
entities (TimeEntries among them) return nothing at all unless an id filter is
present, so the cursor is sent on the very first page too. Lookups by id go
through `in` filters in chunks, because a single `in` list has a length limit.

The base URL and the auth headers are resolved for every request from the
credential source registered in `core.credential_source`, so a credential
saved on the Settings page is used by the next call without a restart. The
composition root registers that source and the listener that drops the
picklist cache when the values change.
"""

from dataclasses import dataclass
from threading import Lock

import requests

from core import credential_source
from integrations import http_errors

PAGE_SIZE = 500
ID_CHUNK_SIZE = 200
DEFAULT_TIMEOUT = 60
# The connection test: one `Companies/query` for the zero account (company
# id 0 is the MSP's own record), the smallest query every tenant can answer.
PROBE_ENTITY = "Companies"
PROBE_FILTER = ({"op": "eq", "field": "id", "value": 0},)
PROBE_FIELDS = ("id",)


@dataclass(frozen=True)
class Connection:
    """Where a request goes and the auth headers it carries."""

    base_url: str
    headers: dict


def connection_from(values):
    """The connection the given credential values describe."""
    return Connection(
        values["autotask_base_url"],
        {
            "UserName": values["autotask_username"],
            "Secret": values["autotask_secret"],
            "ApiIntegrationCode": values["autotask_integration_code"],
        },
    )


def current_connection():
    """The connection from the credentials in effect; raises when any is blank."""
    return connection_from(credential_source.require(credential_source.AUTOTASK))


class AutotaskClient:
    def __init__(self, connection=current_connection, timeout=DEFAULT_TIMEOUT):
        """`connection()` is called before every request for the URL and headers."""
        self._connection = connection
        self._timeout = timeout
        self._session = requests.Session()
        self._session.headers.update({"Content-Type": "application/json"})
        self._picklists = {}
        self._picklists_lock = Lock()

    # ── raw calls ──────────────────────────────────────────────────────────

    def _request(self, method, path, **kwargs):
        connection = self._connection()
        response = method(
            f"{connection.base_url}/{path}",
            headers=connection.headers,
            timeout=self._timeout,
            **kwargs,
        )
        response.raise_for_status()
        return response

    def _post(self, path, payload):
        return self._request(self._session.post, path, json=payload).json()

    def _get(self, path):
        return self._request(self._session.get, path).json()

    # ── queries ────────────────────────────────────────────────────────────

    def query_page(self, entity, filters, include_fields=None, max_records=PAGE_SIZE):
        """One page of `/Entity/query`."""
        payload = {"filter": list(filters), "maxRecords": max_records}
        if include_fields:
            payload["includeFields"] = list(include_fields)
        return self._post(f"{entity}/query", payload).get("items", [])

    def query_all(self, entity, filters, include_fields=None, on_page=None):
        """Every record matching `filters`, walked with an id cursor.

        `on_page(count_so_far)` is called after each page for progress reporting.
        """
        items = []
        max_id = 0
        while True:
            page = self.query_page(
                entity,
                [*filters, {"op": "gt", "field": "id", "value": max_id}],
                include_fields,
            )
            if not page:
                break
            items.extend(page)
            max_id = max(item["id"] for item in page)
            if on_page:
                on_page(len(items))
        return items

    def query_by_ids(self, entity, ids, include_fields=None, on_chunk=None):
        """Records for a list of ids, fetched in `in` chunks.

        `on_chunk(done, total)` is called after each chunk.
        """
        ids = list(ids)
        items = []
        for start in range(0, len(ids), ID_CHUNK_SIZE):
            chunk = ids[start : start + ID_CHUNK_SIZE]
            items.extend(
                self.query_page(
                    entity, [{"op": "in", "field": "id", "value": chunk}], include_fields
                )
            )
            if on_chunk:
                on_chunk(min(start + ID_CHUNK_SIZE, len(ids)), len(ids))
        return items

    def get(self, entity, item_id):
        return self._get(f"{entity}/{item_id}").get("item", {})

    def patch(self, entity, item_id, payload):
        return self._request(self._session.patch, f"{entity}/{item_id}", json=payload)

    # ── picklists ──────────────────────────────────────────────────────────

    def forget_picklists(self):
        """Drop the cached labels; they belong to the tenant the old credentials reached."""
        with self._picklists_lock:
            self._picklists.clear()

    def picklists(self, entity):
        """{field name: {value: label}} for every picklist field on an entity.

        Fetched once per entity and kept until the credentials change: the
        field schema is a large download and the labels only change when an
        Autotask admin edits them.
        """
        with self._picklists_lock:
            cached = self._picklists.get(entity)
            if cached is not None:
                return cached
            mapping = {}
            for field in self._get(f"{entity}/entityInformation/fields").get("fields", []):
                values = field.get("picklistValues")
                if not values:
                    continue
                mapping[field["name"]] = {
                    int(v["value"]): v["label"] for v in values if v.get("isActive", True)
                }
            self._picklists[entity] = mapping
            return mapping

    def picklist(self, entity, field_name):
        return self.picklists(entity).get(field_name, {})


def probe(client, redact=http_errors.unchanged):
    """Test the client's connection with one query that returns at most one record.

    `redact` runs over a refusal's body before it is cut to length.
    """
    return http_errors.probe(
        lambda: client.query_page(PROBE_ENTITY, PROBE_FILTER, PROBE_FIELDS, max_records=1),
        redact,
    )


_client = AutotaskClient()


def autotask():
    """The process-wide client; it reads the credentials per request.

    Picklist labels are per tenant, so new credentials (a different zone,
    say) must not be served the labels the old ones fetched: the composition
    root registers its `forget_picklists` with the credential source.
    """
    return _client
