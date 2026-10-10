import pytest

from integrations.autotask import ID_CHUNK_SIZE, AutotaskClient, Connection
from services import credentials

FIXED = Connection("https://example.invalid/v1.0", {"UserName": "u"})


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


class FakeSession:
    """Answers query posts from a fixed record set, honouring the id filters."""

    def __init__(self, records, picklists=None):
        self.records = records
        self.picklists = picklists or {}
        self.posts = []
        self.requests = []

    def post(self, url, json, headers, timeout):
        self.posts.append(json)
        self.requests.append((url, headers))
        items = self.records
        for f in json["filter"]:
            if f["field"] == "id" and f["op"] == "gt":
                items = [r for r in items if r["id"] > f["value"]]
            if f["field"] == "id" and f["op"] == "in":
                items = [r for r in items if r["id"] in f["value"]]
        return FakeResponse({"items": items[: json["maxRecords"]]})

    def get(self, url, headers, timeout):
        self.requests.append((url, headers))
        return FakeResponse({"fields": self.picklists})


def _client(session, connection=lambda: FIXED):
    client = AutotaskClient(connection)
    client._session = session
    return client


def test_query_all_walks_with_an_anchored_id_cursor():
    session = FakeSession([{"id": i} for i in range(1, 1201)])
    client = _client(session)

    items = client.query_all("Tickets", [{"op": "eq", "field": "companyID", "value": 1}])

    assert [i["id"] for i in items] == list(range(1, 1201))
    cursors = [f["value"] for post in session.posts for f in post["filter"] if f["field"] == "id"]
    # The first page is anchored at id > 0; later pages continue from the last id seen.
    assert cursors == [0, 500, 1000, 1200]


def test_query_by_ids_chunks_the_in_filter():
    ids = list(range(1, ID_CHUNK_SIZE * 2 + 5))
    session = FakeSession([{"id": i} for i in ids])
    client = _client(session)

    items = client.query_by_ids("Companies", ids, ["id"])

    assert [i["id"] for i in items] == ids
    assert [len(p["filter"][0]["value"]) for p in session.posts] == [
        ID_CHUNK_SIZE,
        ID_CHUNK_SIZE,
        4,
    ]


def test_picklists_are_fetched_once_and_skip_inactive_values():
    fields = [
        {
            "name": "priority",
            "picklistValues": [
                {"value": "1", "label": "High", "isActive": True},
                {"value": "2", "label": "Retired", "isActive": False},
            ],
        },
        {"name": "title"},
    ]
    session = FakeSession([], picklists=fields)
    session.gets = 0
    original_get = session.get

    def counted_get(url, headers, timeout):
        session.gets += 1
        return original_get(url, headers, timeout)

    session.get = counted_get
    client = _client(session)

    assert client.picklist("Tickets", "priority") == {1: "High"}
    assert client.picklist("Tickets", "priority") == {1: "High"}
    assert client.picklist("Tickets", "missing") == {}
    assert session.gets == 1


def test_requests_carry_the_stored_credentials_and_base_url(configured):
    session = FakeSession([])
    client = AutotaskClient()
    client._session = session

    client.get("Tickets", 7)

    assert session.requests == [
        (
            f"{configured['autotask_base_url']}/Tickets/7",
            {
                "UserName": configured["autotask_username"],
                "Secret": configured["autotask_secret"],
                "ApiIntegrationCode": configured["autotask_integration_code"],
            },
        )
    ]


def test_a_rotated_secret_is_used_by_the_next_request(configured):
    session = FakeSession([])
    client = AutotaskClient()
    client._session = session
    client.get("Tickets", 7)

    credentials.save({"autotask_secret": "rotated-secret-not-real"})
    client.query_page("Tickets", [])

    assert session.requests[-1][1]["Secret"] == "rotated-secret-not-real"


def test_a_request_without_credentials_names_the_settings_page(store):
    session = FakeSession([])
    client = AutotaskClient()
    client._session = session

    with pytest.raises(credentials.CredentialsMissing, match="open Settings"):
        client.get("Tickets", 7)

    assert session.requests == []
