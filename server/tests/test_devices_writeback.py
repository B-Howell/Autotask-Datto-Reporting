from services import devices


class FakeAutotask:
    def __init__(self, fail_ids=()):
        self.patched = []
        self.fail_ids = set(fail_ids)

    def patch(self, entity, item_id, payload):
        if item_id in self.fail_ids:
            raise RuntimeError("422 Unprocessable Entity")
        self.patched.append((entity, item_id, payload))

        class Response:
            status_code = 200
            text = "{}"

        return Response()


def test_changes_are_grouped_per_device_and_unknown_fields_are_refused(monkeypatch):
    client = FakeAutotask()
    monkeypatch.setattr(devices, "autotask", lambda: client)
    quiet = lambda message: None  # noqa: E731

    results = devices.update_devices(
        [
            {"deviceId": 51001, "field": "Department", "value": "Finance"},
            {"deviceId": 51001, "field": "Location", "value": "Annex"},
            {"deviceId": 51002, "field": "Primary User or Role", "value": "Front Desk"},
            {"deviceId": 51002, "field": "Serial Number", "value": "tampered"},
            {"deviceId": None, "field": "Department", "value": "Lost"},
        ],
        logger=quiet,
    )

    assert [r["status"] for r in results] == ["ok", "ok"]
    assert [item_id for _, item_id, _ in client.patched] == [51001, 51002]
    first_payload = client.patched[0][2]["userDefinedFields"]
    assert {f["name"] for f in first_payload} == {"Department", "Location"}
    assert all(f["name"] != "Serial Number" for f in client.patched[1][2]["userDefinedFields"])


def test_a_failed_patch_is_reported_per_device_not_raised(monkeypatch):
    client = FakeAutotask(fail_ids={51002})
    monkeypatch.setattr(devices, "autotask", lambda: client)

    results = devices.update_devices(
        [
            {"deviceId": 51001, "field": "Department", "value": "Finance"},
            {"deviceId": 51002, "field": "Department", "value": "Clinical"},
        ],
        logger=lambda message: None,
    )

    assert results[0] == {"deviceId": 51001, "status": "ok"}
    assert results[1]["status"] == "error" and "422" in results[1]["error"]


def test_the_sheet_carries_an_id_per_body_row(temp_db, monkeypatch):
    rows = [
        {"autotask_id": 51001, "type": "Laptop", "name": "HPH-LT-0001"},
        {"autotask_id": 51002, "type": "Desktop", "name": "HPH-DT-0002"},
    ]
    monkeypatch.setattr(devices, "fetch_rows", lambda company_id, site_id, logger: rows)

    report = devices.get_device_sheet(1000, "site-a", logger=lambda message: None)

    assert report["ids"] == [51001, 51002]
    assert len(report["sheet"]) == 3
    assert report["sheet"][0][1] == "Reference Name"
    assert report["sheet"][1][1] == "HPH-LT-0001"
