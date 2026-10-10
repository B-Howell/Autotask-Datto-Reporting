import pytest
import requests

from integrations import datto
from services import credentials

TOKEN_URL = "https://example-api.centrastage.net/auth/oauth/token"
DEVICES_URL = "https://example-api.centrastage.net/api/v2/account/devices"


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self.status_code = status_code
        self.headers = {}
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


class FakeRequests:
    """Stands in for the requests module: hands out numbered tokens, answers every GET."""

    RequestException = requests.RequestException

    def __init__(self):
        self.posts = []
        self.gets = []

    def post(self, url, headers, data, auth, timeout):
        self.posts.append((url, data))
        return FakeResponse({"access_token": f"token-{len(self.posts)}", "expires_in": 3600})

    def get(self, url, params, headers, timeout):
        self.gets.append((url, headers["Authorization"]))
        return FakeResponse({"devices": []})


@pytest.fixture
def fake_requests(monkeypatch):
    fake = FakeRequests()
    monkeypatch.setattr(datto, "requests", fake)
    return fake


def _token_post(url, values):
    return (
        url,
        {
            "grant_type": "password",
            "username": values["datto_api_key"],
            "password": values["datto_api_secret"],
        },
    )


def test_the_token_comes_from_the_stored_credentials_and_is_reused(configured, fake_requests):
    client = datto.datto()

    client.get("account/devices")
    client.get("account/devices")

    assert fake_requests.posts == [_token_post(TOKEN_URL, configured)]
    assert fake_requests.gets == [(DEVICES_URL, "Bearer token-1"), (DEVICES_URL, "Bearer token-1")]


def test_a_save_drops_the_token_and_the_next_request_uses_the_new_values(configured, fake_requests):
    client = datto.datto()
    client.get("account/devices")

    rotated = {"datto_api_secret": "rotated-secret-not-real", "datto_platform": "other"}
    credentials.save(rotated)
    client.get("account/devices")

    assert fake_requests.posts[-1] == _token_post(
        "https://other-api.centrastage.net/auth/oauth/token", {**configured, **rotated}
    )
    assert fake_requests.gets[-1] == (
        "https://other-api.centrastage.net/api/v2/account/devices",
        "Bearer token-2",
    )


def test_a_request_without_credentials_names_the_settings_page(store, fake_requests):
    with pytest.raises(credentials.CredentialsMissing, match="Datto credentials.*open Settings"):
        datto.datto().get("account/devices")

    assert fake_requests.posts == [] and fake_requests.gets == []
