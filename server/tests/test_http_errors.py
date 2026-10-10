import requests

from integrations import http_errors


class Refusal:
    def __init__(self, status_code, text):
        self.status_code = status_code
        self.text = text


def _raising(exc):
    def call():
        raise exc

    return call


def test_trimmed_collapses_whitespace_and_caps_the_length():
    assert http_errors.trimmed("  a \n\n b\t c  ") == "a b c"
    assert len(http_errors.trimmed("x" * 1000)) == http_errors.ERROR_TEXT_LIMIT


def test_a_refusal_is_described_by_status_and_trimmed_body_never_the_url():
    exc = requests.HTTPError(
        "401 Client Error for url: https://secret.example.test/x",
        response=Refusal(401, " Bad  credentials "),
    )
    assert http_errors.probe(_raising(exc)) == http_errors.ProbeResult(
        False, "HTTP 401: Bad credentials"
    )


def test_a_transport_failure_is_described_by_its_kind_only():
    exc = requests.ConnectionError("https://secret.example.test/x refused")
    assert http_errors.probe(_raising(exc)) == http_errors.ProbeResult(
        False, "Vendor unreachable: ConnectionError"
    )


def test_a_call_that_returns_is_connected_and_a_malformed_answer_is_not():
    assert http_errors.probe(lambda: {"items": []}) == http_errors.CONNECTED
    not_json = http_errors.ProbeResult(False, "The answer was not the expected JSON")
    assert http_errors.probe(_raising(KeyError("access_token"))) == not_json
    bad_json = _raising(requests.JSONDecodeError("Expecting value", "<html>", 0))
    assert http_errors.probe(bad_json) == not_json


def test_a_request_that_cannot_be_built_is_named_by_its_kind():
    assert http_errors.probe(_raising(ValueError("bad header"))) == http_errors.ProbeResult(
        False, "Request not sent: ValueError"
    )


def test_the_body_is_redacted_before_it_is_cut():
    body = "x" * (http_errors.ERROR_TEXT_LIMIT - 5) + "hunter2-not-a-real-secret"
    exc = requests.HTTPError(response=Refusal(401, body))

    result = http_errors.probe(
        _raising(exc), redact=lambda text: text.replace("hunter2", "[hidden]")
    )

    assert "hunter2" not in result.message
    assert "hunte" not in result.message
    assert len(result.message) == len("HTTP 401: ") + http_errors.ERROR_TEXT_LIMIT
