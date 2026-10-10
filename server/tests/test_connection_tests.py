import pytest
import requests
from conftest import SAMPLE_AUTOTASK, SAMPLE_DATTO, store_values

from integrations import autotask, datto, http_errors
from services import connection_tests, credentials

SECRET = SAMPLE_AUTOTASK["autotask_secret"]
USERNAME = SAMPLE_AUTOTASK["autotask_username"]
VALUES = {**SAMPLE_AUTOTASK, **SAMPLE_DATTO}
CONNECTED = {"ok": True, "message": "Connected"}


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


class FakeResponse:
    def __init__(self, payload):
        self.status_code = 200
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


class RecordingSession:
    """Stands in for `requests.Session` in the Autotask client; records every POST."""

    posts = []

    def __init__(self):
        self.headers = {}

    def post(self, url, json, headers, timeout):
        RecordingSession.posts.append({"url": url, "headers": headers, "timeout": timeout})
        return FakeResponse({"items": []})


class RecordingRequests:
    """Stands in for the `requests` module in the Datto client; records the token POST."""

    RequestException = requests.RequestException

    def __init__(self):
        self.posts = []

    def post(self, url, headers, data, auth, timeout):
        self.posts.append({"url": url, "data": data, "timeout": timeout})
        return FakeResponse({"access_token": "token-not-real", "expires_in": 3600})


@pytest.fixture
def probes(store, monkeypatch):
    """A fresh store where both probes answer `Connected` unless a test swaps one."""
    monkeypatch.setattr(autotask, "probe", _connected)
    monkeypatch.setattr(datto, "probe", _connected)
    return monkeypatch


def _entry(name):
    return next(entry for entry in credentials.status() if entry["name"] == name)


def test_probes_are_built_from_the_submitted_values_and_store_nothing(store, monkeypatch):
    RecordingSession.posts = []
    datto_requests = RecordingRequests()
    monkeypatch.setattr(autotask.requests, "Session", RecordingSession)
    monkeypatch.setattr(datto, "requests", datto_requests)

    assert connection_tests.test_connection(VALUES) == {"autotask": CONNECTED, "datto": CONNECTED}

    [autotask_post] = RecordingSession.posts
    assert autotask_post["url"] == f"{SAMPLE_AUTOTASK['autotask_base_url']}/Companies/query"
    assert autotask_post["headers"]["Secret"] == SECRET
    assert autotask_post["timeout"] == connection_tests.PROBE_TIMEOUT_SECONDS
    [datto_post] = datto_requests.posts
    assert datto_post["url"] == "https://example-api.centrastage.net/auth/oauth/token"
    assert datto_post["data"]["username"] == SAMPLE_DATTO["datto_api_key"]
    assert datto_post["timeout"] == connection_tests.PROBE_TIMEOUT_SECONDS
    assert all(value == "" for value in credentials.current().values())


def test_every_value_in_play_is_blanked_from_a_refusal_longest_first(probes):
    probes.setattr(autotask, "probe", _refusing(401, f"User {USERNAME} sent {SECRET}; {SECRET}x"))

    message = connection_tests.test_connection(VALUES)["autotask"]["message"]

    assert message == "HTTP 401: User [hidden] sent [hidden]; [hidden]x"
    assert USERNAME not in message and SECRET not in message


def test_a_value_cut_by_the_length_cap_leaves_no_fragment(probes):
    body = "x" * (http_errors.ERROR_TEXT_LIMIT - 5) + SECRET
    probes.setattr(autotask, "probe", _refusing(401, body))

    message = connection_tests.test_connection(VALUES)["autotask"]["message"]

    assert SECRET[:5] not in message
    assert len(message) == len("HTTP 401: ") + http_errors.ERROR_TEXT_LIMIT


def test_an_encoded_echo_is_blanked_too(probes):
    encoded = "&#x68;unter2-not-a-real-secret by api%2Duser"
    probes.setattr(autotask, "probe", _refusing(401, f"<p>{encoded}</p>"))

    message = connection_tests.test_connection(VALUES)["autotask"]["message"]

    assert message == "HTTP 401: <p>[hidden] by [hidden]</p>"


def test_a_short_plain_value_does_not_blank_unrelated_words(probes):
    probes.setattr(datto, "probe", _refusing(401, "Unexpected error"))

    result = connection_tests.test_connection({**VALUES, "datto_platform": "ex"})

    assert result["datto"]["message"] == "HTTP 401: Unexpected error"


def test_a_stored_value_left_blank_on_the_form_is_blanked_too(probes):
    store_values(VALUES)
    probes.setattr(datto, "probe", _refusing(401, f"Key {SAMPLE_DATTO['datto_api_key']}"))

    result = connection_tests.test_connection({"datto_api_key": ""})

    assert result["datto"] == {"ok": False, "message": "HTTP 401: Key [hidden]"}


def test_an_incomplete_vendor_is_reported_without_a_probe_or_a_record(probes):
    probes.setattr(datto, "probe", _never_called)
    store_values({"datto_platform": "example"})

    result = connection_tests.test_connection(SAMPLE_AUTOTASK)

    assert result == {
        "autotask": CONNECTED,
        "datto": {"ok": False, "message": "Datto credentials are incomplete"},
    }
    assert _entry("datto_platform")["last_tested_at"] is None


def test_test_connection_records_only_the_vendors_tested_with_their_stored_values(probes):
    store_values(VALUES)
    probes.setattr(datto, "probe", _refusing(401, "Unauthorized"))

    connection_tests.test_connection({"datto_api_key": "submitted-not-real"})

    # Datto was probed with a submitted key, so its stored rows were not tested.
    assert _entry("autotask_secret")["last_test_ok"] is True
    assert _entry("datto_api_key")["last_tested_at"] is None

    connection_tests.test_connection({})

    assert _entry("datto_api_key")["last_test_ok"] is False


def test_save_tested_refuses_a_changed_vendor_that_fails_and_stores_nothing(probes):
    probes.setattr(autotask, "probe", _refusing(403, f"Forbidden for {USERNAME}"))

    with pytest.raises(connection_tests.ConnectionTestFailed) as refused:
        connection_tests.save_tested(VALUES)

    assert (
        str(refused.value) == "Autotask refused the credentials: HTTP 403: Forbidden for [hidden]"
    )
    assert all(value == "" for value in credentials.current().values())


def test_save_tested_refuses_a_changed_vendor_that_is_still_incomplete(probes):
    probes.setattr(datto, "probe", _never_called)

    with pytest.raises(
        connection_tests.ConnectionTestFailed, match="Datto credentials are incomplete"
    ):
        connection_tests.save_tested({"datto_platform": "example"})

    assert credentials.current()["datto_platform"] == ""


def test_save_tested_stores_then_records_and_an_untouched_failure_does_not_block(probes):
    assert connection_tests.save_tested(VALUES) is None
    secret = _entry("autotask_secret")
    assert secret["source"] == "stored" and secret["last_test_ok"] is True

    probes.setattr(datto, "probe", _refusing(401, "Unauthorized"))
    connection_tests.save_tested({"autotask_username": "", "autotask_secret": "rotated-not-real"})

    # Datto's stored values were not changed by this save, so their failing
    # test is recorded but does not block the Autotask rotation.
    assert _entry("datto_api_key")["last_test_ok"] is False
    values = credentials.current()
    assert values["autotask_username"] == USERNAME
    assert values["autotask_secret"] == "rotated-not-real"


def test_save_tested_rejects_bad_input_before_any_probe(probes):
    probes.setattr(autotask, "probe", _never_called)
    with pytest.raises(ValueError, match="Unknown credential: nope"):
        connection_tests.save_tested({"nope": "x"})
    with pytest.raises(ValueError, match="https://"):
        connection_tests.test_connection({"autotask_base_url": "http://plain.example.test"})
