"""Autotask PSA REST client.

Autotask's query endpoint caps a page at 500 records and has no page token;
the reliable way to walk a large result is an `id > last_id` cursor. Some
entities (TimeEntries among them) return nothing at all unless an id filter is
present, so the cursor is sent on the very first page too. Lookups by id go
through `in` filters in chunks, because a single `in` list has a length limit.
"""

from threading import Lock

import requests

from config import settings

PAGE_SIZE = 500
ID_CHUNK_SIZE = 200
DEFAULT_TIMEOUT = 60


class AutotaskClient:
    def __init__(self, base_url, username, secret, integration_code, timeout=DEFAULT_TIMEOUT):
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._session = requests.Session()
        self._session.headers.update(
            {
                "UserName": username,
                "Secret": secret,
                "ApiIntegrationCode": integration_code,
                "Content-Type": "application/json",
            }
        )
        self._picklists = {}
        self._picklists_lock = Lock()

    # ── raw calls ──────────────────────────────────────────────────────────

    def _post(self, path, payload):
        response = self._session.post(
            f"{self._base_url}/{path}", json=payload, timeout=self._timeout
        )
        response.raise_for_status()
        return response.json()

    def _get(self, path):
        response = self._session.get(f"{self._base_url}/{path}", timeout=self._timeout)
        response.raise_for_status()
        return response.json()

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
        response = self._session.patch(
            f"{self._base_url}/{entity}/{item_id}", json=payload, timeout=self._timeout
        )
        response.raise_for_status()
        return response

    # ── picklists ──────────────────────────────────────────────────────────

    def picklists(self, entity):
        """{field name: {value: label}} for every picklist field on an entity.

        Fetched once per process: the field schema is a large download and the
        labels only change when an Autotask admin edits them.
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


_client = None
_client_lock = Lock()


def autotask():
    """The process-wide client, built from settings on first use."""
    global _client
    with _client_lock:
        if _client is None:
            _client = AutotaskClient(
                settings.autotask_base_url,
                settings.autotask_username,
                settings.autotask_secret,
                settings.autotask_integration_code,
            )
        return _client
