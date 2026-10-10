import pytest
import requests
from conftest import SAMPLE_DATTO, store_values

from integrations import datto, http_errors
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
    store_values(rotated)
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


class RefusingResponse(FakeResponse):
    def __init__(self, status_code, text):
        super().__init__({}, status_code)
        self.text = text

    def raise_for_status(self):
        raise requests.HTTPError(response=self)


class RefusingRequests(FakeRequests):
    def post(self, url, headers, data, auth, timeout):
        self.posts.append((url, data))
        return RefusingResponse(401, "  invalid_client  ")


def _throwaway_provider(values):
    return datto.DattoTokenProvider(token_request=lambda: datto.token_request_from(values))


def test_probe_fetches_one_token_with_the_values_given(fake_requests):
    assert datto.probe(_throwaway_provider(SAMPLE_DATTO)) == http_errors.CONNECTED
    assert fake_requests.posts == [_token_post(TOKEN_URL, SAMPLE_DATTO)]
    assert fake_requests.gets == []


def test_probe_describes_a_refused_token_by_status_and_trimmed_body(monkeypatch):
    monkeypatch.setattr(datto, "requests", RefusingRequests())

    result = datto.probe(_throwaway_provider(SAMPLE_DATTO))

    assert result == http_errors.ProbeResult(False, "HTTP 401: invalid_client")
