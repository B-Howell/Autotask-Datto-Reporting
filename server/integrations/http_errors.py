"""Describe a refused or failed HTTP call without repeating what was sent.

A `requests` exception quotes the request URL, which carries the vendor host
and, for a signed webhook, a secret; a vendor's error page can run to
kilobytes. The integrations therefore build their own text: the status and
the body collapsed to one line and capped, or just the kind of transport
failure. `probe` runs one vendor call as a connection test and answers with
that text instead of raising.
"""

import re
from dataclasses import dataclass

import requests

# How much of a refusal is kept on a run record or shown on the Settings page.
ERROR_TEXT_LIMIT = 300
NOT_JSON = "The answer was not the expected JSON"


@dataclass(frozen=True)
class ProbeResult:
    """The outcome of a connection test, worded for the Settings page."""

    ok: bool
    message: str


CONNECTED = ProbeResult(True, "Connected")


def unchanged(text):
    """The default redaction: nothing to hide."""
    return text


def trimmed(text):
    """The text collapsed to one line and cut at `ERROR_TEXT_LIMIT` characters."""
    return re.sub(r"\s+", " ", text).strip()[:ERROR_TEXT_LIMIT]


def described(exc, redact=unchanged):
    """`HTTP <status>: <redacted, trimmed body>` for a refusal, else the failure's kind; never the URL.

    `redact` runs over the whole body before the cut, so a hidden value can
    not survive as the fragment that straddles the limit.
    """
    if isinstance(exc, requests.JSONDecodeError):
        return NOT_JSON
    response = exc.response
    if response is None:
        return f"Vendor unreachable: {type(exc).__name__}"
    return f"HTTP {response.status_code}: {trimmed(redact(response.text))}"


def probe(call, redact=unchanged):
    """Run `call()` as a connection test: `CONNECTED`, or a result describing the failure."""
    try:
        call()
    except requests.RequestException as exc:
        return ProbeResult(False, described(exc, redact))
    except KeyError:
        # A 200 whose JSON lacks the field the client reads (`access_token`).
        # No other mapping is read inside a probe: the caller builds the
        # client from a values dict that holds every field (the credentials
        # service's `complete` guards that before a probe is made).
        return ProbeResult(False, NOT_JSON)
    except ValueError as exc:
        # The request never left: a header value the transport cannot encode, say.
        return ProbeResult(False, f"Request not sent: {type(exc).__name__}")
    return CONNECTED
