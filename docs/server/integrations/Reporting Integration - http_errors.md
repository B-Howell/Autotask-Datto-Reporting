# HTTP failure text

> Describes a refused or failed vendor call as text that is safe to store and show, and runs one vendor call as a connection test that answers with that text instead of raising.

## Purpose

A `requests` exception quotes the request URL in its message. For the delivery flow the URL carries a signature; for a vendor it carries the host the operator just typed. A vendor's error page can also run to kilobytes of HTML. The integrations therefore never pass an exception's text on. This module gives them one way to word a failure: the HTTP status and the body collapsed to one line and capped, or, when no response came back, only the kind of transport failure. `probe` wraps a call in that wording so the credentials service can test a key without knowing how a vendor refuses.

## Interface

| Name | Description |
|---|---|
| `ERROR_TEXT_LIMIT` | 300 characters: how much of a refusal is kept on a run record or shown on the Settings page. |
| `ProbeResult(ok, message)` | Frozen dataclass: the outcome of a connection test, worded for the Settings page. |
| `CONNECTED` | `ProbeResult(True, "Connected")`. |
| `NOT_JSON` | `The answer was not the expected JSON`. |
| `unchanged(text)` | The default redaction: returns `text`. |
| `trimmed(text)` | `text` with every run of whitespace collapsed to one space, stripped and cut at `ERROR_TEXT_LIMIT`. |
| `described(exc, redact=unchanged)` | For a `requests.JSONDecodeError`, `NOT_JSON`; for any other `requests.RequestException` with a response, `HTTP <status>: ` followed by `trimmed(redact(body))`; without a response, `Vendor unreachable: <exception class name>`. Never the URL. |
| `probe(call, redact=unchanged)` | Runs `call()`: `CONNECTED` when it returns; `ProbeResult(False, described(exc, redact))` for a `requests.RequestException`; `NOT_JSON` for a `KeyError` (a 200 whose JSON lacks the field the client reads); `Request not sent: <exception class name>` for any other `ValueError`, which is what a header value the transport cannot encode raises before anything is sent. |

## Uses

- `requests` (the exception type), `re`.

## Used By

- [autotask integration](<Reporting Integration - autotask.md>) (`probe` around its smallest query)
- [datto integration](<Reporting Integration - datto.md>) (`probe` around a token fetch)
- [delivery integration](<Reporting Integration - delivery.md>) (`trimmed` for a refusal whose body is not the flow's error shape)
- [connection_tests service](<../services/Reporting Service - connection_tests.md>) reads `ok` and `message` of the `ProbeResult` each probe answers and supplies the redaction the probes apply
- [server/tests/test_http_errors.py](../../../server/tests/test_http_errors.py)

## Key Behavior

- `described` reads `exc.response`, which `requests` sets on an `HTTPError` from `raise_for_status` and leaves `None` on a `ConnectionError` or `Timeout`; the branch on `None` is what keeps the URL out of a transport failure's text, because the exception's own message is never used.
- The body is trimmed, not parsed: a vendor's JSON error is shown as its one-line text. The delivery client parses the flow's `{"error": {"message"}}` shape itself before falling back to `trimmed`, because that shape is documented for Power Automate and not for the vendors.
- `redact` runs over the whole body before `trimmed` cuts it. Blanking after the cut would let a hidden value survive as the fragment that straddles the 300th character, which is why the caller's redaction is a parameter here rather than a pass over the finished message. The module does not know which values were sent; the connection_tests service, which does, supplies the redaction.
- A `requests.JSONDecodeError` is a `RequestException` that `Response.json()` raises without a response attached, so it is matched first; it would otherwise read as `Vendor unreachable`. `KeyError` is caught because the Datto client reads `response.json()["access_token"]` after `raise_for_status`, and a 200 with the wrong body would otherwise reach the Settings page as a 500. Any other `ValueError` is a request that could not be built, named by its class only, since its text can quote the value. Everything else propagates: a bug is not a failed test.

## Cleanup Notes

- `described` names the vendor as `Vendor` because the module serves both; the service prefixes the vendor's name when the message blocks a save.

## Source

[server/integrations/http_errors.py](../../../server/integrations/http_errors.py)
