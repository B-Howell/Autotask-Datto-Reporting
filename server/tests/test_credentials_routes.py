import dataclasses

import pytest
import requests
from conftest import SAMPLE_AUTOTASK, SAMPLE_DATTO
from fastapi.testclient import TestClient

from config import settings
from core import secrets
from integrations import autotask, datto, http_errors
from main import app
from routers import credentials as credentials_router
from services import connection_tests, credentials

SECRET = SAMPLE_AUTOTASK["autotask_secret"]
VALUES = {**SAMPLE_AUTOTASK, **SAMPLE_DATTO}
DEMO_REFUSAL = "Demo mode simulates the vendor clients"


class Refusal:
    """What a vendor's rejected request looks like to the integrations."""

    def __init__(self, status_code, text):
        self.status_code = status_code
        self.text = text


def _refusing(status_code, text):
    """A probe whose one vendor call is refused with the given status and body."""

    def refuse():
        raise requests.HTTPError(response=Refusal(status_code, text))

    return lambda _target, redact: http_errors.probe(refuse, redact)


def _connected(_target, _redact):
    return http_errors.CONNECTED


def _never_called(_target, _redact):
    raise AssertionError("the probe must not run")


@pytest.fixture
def live(store, monkeypatch):
    """The store with demo mode off for the router, so the vendor probes are reachable."""
    monkeypatch.setattr(
        credentials_router, "settings", dataclasses.replace(settings, demo_mode=False)
    )
    return store


@pytest.fixture
def probes(monkeypatch):
    """Both probes answer `Connected` unless a test swaps one."""
    monkeypatch.setattr(autotask, "probe", _connected)
    monkeypatch.setattr(datto, "probe", _connected)
    return monkeypatch


def _field(fields, name):
    return next(entry for entry in fields if entry["name"] == name)


def test_get_reports_every_field_without_any_secret(live):
    credentials.save(VALUES)
    with TestClient(app) as client:
        response = client.get("/api/credentials")
    assert response.status_code == 200
    body = response.json()
    assert body["demoMode"] is False and body["keySource"] == "file"
    assert [entry["name"] for entry in body["fields"]] == list(credentials.FIELDS)
    entry = _field(body["fields"], "autotask_secret")
    assert entry["source"] == "stored" and entry["last4"] == SECRET[-4:]
    assert SECRET not in response.text
    assert SAMPLE_DATTO["datto_api_secret"] not in response.text


def test_test_reports_both_vendors_and_never_echoes_a_submitted_value(live, probes):
    body_text = f"  Bad\n\n  secret {SECRET}  for user " + "x" * 1000
    probes.setattr(autotask, "probe", _refusing(401, body_text))
    with TestClient(app) as client:
        response = client.post("/api/credentials/test", json={"values": VALUES})
    assert response.status_code == 200
    result = response.json()
    assert result["datto"] == {"ok": True, "message": "Connected"}
    assert result["autotask"]["ok"] is False
    assert result["autotask"]["message"].startswith("HTTP 401: Bad secret [hidden]")
    assert len(result["autotask"]["message"]) <= len("HTTP 401: ") + http_errors.ERROR_TEXT_LIMIT
    assert SECRET not in response.text


def test_put_refuses_when_a_changed_vendor_fails_and_stores_nothing(live, probes):
    probes.setattr(autotask, "probe", _refusing(403, f"Forbidden for {SECRET}"))
    with TestClient(app) as client:
        response = client.put("/api/credentials", json={"values": VALUES})
    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Autotask refused the credentials: HTTP 403: Forbidden for [hidden]"
    )
    assert SECRET not in response.text
    assert all(value == "" for value in credentials.current().values())


def test_put_stores_tested_values_and_blank_fields_keep_what_is_stored(live, probes):
    with TestClient(app) as client:
        saved = client.put("/api/credentials", json={"values": VALUES})
        assert saved.status_code == 200
        entry = _field(saved.json(), "autotask_secret")
        assert entry["source"] == "stored" and entry["last4"] == SECRET[-4:]
        assert entry["last_test_ok"] is True
        assert SECRET not in saved.text

        rotated = client.put(
            "/api/credentials",
            json={"values": {"autotask_username": "", "autotask_secret": "rotated-not-real"}},
        )
    assert rotated.status_code == 200
    values = credentials.current()
    assert values["autotask_username"] == SAMPLE_AUTOTASK["autotask_username"]
    assert values["autotask_secret"] == "rotated-not-real"


def test_the_routes_pass_the_service_answers_through_and_map_its_refusal(live, monkeypatch):
    seen = {}
    report = {
        "autotask": {"ok": True, "message": "Connected"},
        "datto": {"ok": False, "message": "x"},
    }
    monkeypatch.setattr(
        connection_tests, "test_connection", lambda values: seen.update(tested=values) or report
    )

    def refuse(values):
        seen.update(saved=values)
        raise connection_tests.ConnectionTestFailed("Datto refused the credentials: x")

    monkeypatch.setattr(connection_tests, "save_tested", refuse)
    with TestClient(app) as client:
        tested = client.post("/api/credentials/test", json={"values": {"datto_api_key": "k"}})
        saved = client.put("/api/credentials", json={"values": {"datto_api_key": "k"}})
    assert tested.status_code == 200 and tested.json() == report
    assert saved.status_code == 400
    assert saved.json()["detail"] == "Datto refused the credentials: x"
    assert seen == {"tested": {"datto_api_key": "k"}, "saved": {"datto_api_key": "k"}}


def test_put_rejects_bad_input_before_any_probe(live, probes):
    probes.setattr(autotask, "probe", _never_called)
    with TestClient(app) as client:
        unknown = client.put("/api/credentials", json={"values": {"nope": "x"}})
        bad_url = client.put(
            "/api/credentials", json={"values": {"autotask_base_url": "http://plain.example.test"}}
        )
    assert unknown.status_code == 400 and unknown.json()["detail"] == "Unknown credential: nope"
    assert bad_url.status_code == 400 and "https://" in bad_url.json()["detail"]


def test_a_malformed_body_is_a_422_that_does_not_echo_the_input(live):
    with TestClient(app) as client:
        response = client.put(
            "/api/credentials", json={"values": {"autotask_secret": ["list-not-a-real-value"]}}
        )
    assert response.status_code == 422
    assert "list-not-a-real-value" not in response.text
    assert response.json()["detail"][0]["loc"] == ["body", "values", "autotask_secret"]


def test_demo_mode_shows_status_but_refuses_tests_and_saves(store, monkeypatch):
    monkeypatch.setattr(
        credentials_router, "settings", dataclasses.replace(settings, demo_mode=True)
    )
    with TestClient(app) as client:
        shown = client.get("/api/credentials")
        tested = client.post("/api/credentials/test", json={"values": VALUES})
        saved = client.put("/api/credentials", json={"values": VALUES})
    assert shown.status_code == 200 and shown.json()["demoMode"] is True
    assert tested.status_code == 409 and tested.json()["detail"] == DEMO_REFUSAL
    assert saved.status_code == 409 and saved.json()["detail"] == DEMO_REFUSAL
    assert all(value == "" for value in credentials.current().values())


def test_get_is_a_503_when_the_stored_values_cannot_be_read(live, tmp_path):
    credentials.save({"autotask_username": "u"})
    (tmp_path / "secret.key").unlink()
    secrets.reset_cache()
    credentials.invalidate()
    with TestClient(app) as client:
        response = client.get("/api/credentials")
    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Stored credentials cannot be read; check APP_SECRET_KEY or the key file"
    )
