"""Connection tests for the Settings page: probe both vendors with submitted values.

A test builds throwaway vendor clients from the submitted values laid over
the stored ones, through the injection points the integrations expose, so a
key can be proven before it is saved and the stored keys re-proven at any
time. A save through `save_tested` is that test followed by the write; a
vendor that refuses the values it was given blocks the save. No value in
play reaches a message: each is blanked before the integration cuts the
vendor's refusal to length.
"""

import html
from urllib.parse import unquote

from integrations import autotask, datto
from services import credentials

# A connection test answers a Settings page, so it gives up well before a
# report would.
PROBE_TIMEOUT_SECONDS = 15
HIDDEN = "[hidden]"
# A plain value this short (a two-letter platform, say) would blank unrelated
# words; a secret is blanked whatever its length.
MIN_PLAIN_LENGTH = 4


class ConnectionTestFailed(ValueError):
    """A vendor refused the values submitted for it, so nothing was saved."""


def _probe_autotask(values, redact):
    client = autotask.AutotaskClient(
        connection=lambda: autotask.connection_from(values), timeout=PROBE_TIMEOUT_SECONDS
    )
    return autotask.probe(client, redact)


def _probe_datto(values, redact):
    provider = datto.DattoTokenProvider(
        token_request=lambda: datto.token_request_from(values), timeout=PROBE_TIMEOUT_SECONDS
    )
    return datto.probe(provider, redact)


_PROBES = {credentials.AUTOTASK: _probe_autotask, credentials.DATTO: _probe_datto}


def _worth_blanking(name, value):
    return bool(value) and (credentials.FIELDS[name].secret or len(value) >= MIN_PLAIN_LENGTH)


def redacted(text, values):
    """`text` with every value in play blanked, longest first, after HTML and URL unescaping.

    A vendor's refusal may quote what it was sent, and a username or host is
    no more the page's business than a secret. The body is unescaped first
    because an HTML error page or a URL in it can carry the value encoded;
    longest first, so a value that contains another is blanked whole.
    """
    text = unquote(html.unescape(text))
    in_play = {value for name, value in values.items() if _worth_blanking(name, value)}
    for value in sorted(in_play, key=len, reverse=True):
        text = text.replace(value, HIDDEN)
    return text


def _probe(values, vendor):
    """The vendor's `ProbeResult`, or None without a request while one of its fields is blank."""
    if not credentials.complete(values, vendor):
        return None
    return _PROBES[vendor](values, lambda text: redacted(text, values))


def _probe_all(values):
    return {vendor: _probe(values, vendor) for vendor in _PROBES}


def _passed(outcome):
    return outcome is not None and outcome.ok


def _incomplete(vendor):
    return f"{credentials.VENDOR_LABELS[vendor]} credentials are incomplete"


def _report(vendor, outcome):
    """`{ok, message}` for the page; a vendor that was not probed reads as incomplete."""
    if outcome is None:
        return {"ok": False, "message": _incomplete(vendor)}
    return {"ok": outcome.ok, "message": outcome.message}


def _record(outcomes, vendors):
    """Stamp the outcome of each listed vendor that was probed on its stored rows."""
    for vendor in vendors:
        if outcomes[vendor] is not None:
            credentials.record_test(vendor, outcomes[vendor].ok)


def _vendors_of(changes):
    return {credentials.FIELDS[name].vendor for name in changes}


def test_connection(values):
    """Probe both vendors with `values` laid over the stored ones; nothing is saved.

    A vendor whose values did not change is tested too, so the page learns
    whether the stored keys still work, and only those outcomes are
    recorded: a vendor tested with submitted values was not tested against
    what its rows hold.
    """
    changes = credentials.changes(values)
    outcomes = _probe_all(credentials.merged_from(changes))
    _record(outcomes, set(outcomes) - _vendors_of(changes))
    return {vendor: _report(vendor, outcome) for vendor, outcome in outcomes.items()}


def _refusal(vendor, outcome):
    if outcome is None:
        return ConnectionTestFailed(_incomplete(vendor))
    return ConnectionTestFailed(
        f"{credentials.VENDOR_LABELS[vendor]} refused the credentials: {outcome.message}"
    )


def save_tested(values):
    """Test, then store: a changed vendor that fails its test blocks the whole save.

    The outcomes are recorded after the write, so a row written by this save
    carries its own result. Returns nothing: the caller reads the status it
    wants afterwards, so this module shapes no response.
    """
    changes = credentials.changes(values)
    outcomes = _probe_all(credentials.merged_from(changes))
    for vendor in sorted(_vendors_of(changes)):
        if not _passed(outcomes[vendor]):
            raise _refusal(vendor, outcomes[vendor])
    credentials.store_changes(changes)
    _record(outcomes, outcomes)
