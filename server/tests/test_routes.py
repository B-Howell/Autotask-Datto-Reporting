from fastapi.testclient import TestClient

from main import app


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
