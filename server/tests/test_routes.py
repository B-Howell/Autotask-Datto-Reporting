from fastapi.testclient import TestClient

from core import secrets
from main import app
from services import credentials


def test_a_bad_date_range_is_a_400_with_the_reason(temp_db):
    with TestClient(app) as client:
        response = client.get(
            "/api/agency-utilization", params={"start": "2026-09-30", "end": "2026-07-01"}
        )
    assert response.status_code == 400
    assert "before start" in response.json()["detail"]


def test_device_update_rejects_a_malformed_body(temp_db):
    with TestClient(app) as client:
        response = client.post("/api/devices/update", json={"changes": [{"field": "Department"}]})
    assert response.status_code == 422


def test_responses_are_never_cacheable(temp_db):
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert "no-store" in response.headers["cache-control"]


def _device_sheet(client):
    return client.get("/api/devices", params={"company_id": 1, "site_id": "site-a"})


def test_a_report_without_credentials_is_a_503_naming_settings(store):
    with TestClient(app) as client:
        response = _device_sheet(client)
    assert response.status_code == 503
    assert response.json()["detail"] == "Autotask credentials are not configured; open Settings"


def test_a_report_whose_stored_credentials_cannot_be_read_is_a_503(store, tmp_path):
    credentials.save({"autotask_username": "u"})
    (tmp_path / "secret.key").unlink()
    secrets.reset_cache()
    credentials.invalidate()
    with TestClient(app) as client:
        response = _device_sheet(client)
    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Stored credentials cannot be read; check APP_SECRET_KEY or the key file"
    )
