"""Connection tests for the Settings page: probe both vendors with submitted values.

A test builds throwaway vendor clients from the submitted values laid over
the stored ones, through the injection points the integrations expose, so a
key can be proven before it is saved and the stored keys re-proven at any
time. A save through `save_tested` is that test followed by the write; a
vendor that refuses the values it was given blocks the save. No value in
play reaches a message: each is blanked before the integration cuts the
vendor's refusal to length.
"""

from integrations import autotask, datto
from services import credentials

# A connection test answers a Settings page, so it gives up well before a
# report would.
PROBE_TIMEOUT_SECONDS = 15
HIDDEN = "[hidden]"


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


def redacted(text, values):
    """`text` with every non-blank value in play blanked, longest first.

    A vendor's refusal may quote what it was sent, and a username or host is
    no more the page's business than a secret; longest first, so a value that
    contains another is blanked whole.
    """
    for value in sorted({value for value in values.values() if value}, key=len, reverse=True):
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


def _record(outcomes):
    """Stamp each probed vendor's outcome on its stored rows."""
    for vendor, outcome in outcomes.items():
        if outcome is not None:
            credentials.record_test(vendor, outcome.ok)


def test_connection(values):
    """Probe both vendors with `values` laid over the stored ones, and record the outcomes.

    A vendor whose values did not change is tested too: the page wants to
    know that the stored keys still work.
    """
    outcomes = _probe_all(credentials.merged(values))
    _record(outcomes)
    return {vendor: _report(vendor, outcome) for vendor, outcome in outcomes.items()}


def _vendors_of(changes):
    return {credentials.FIELDS[name].vendor for name in changes}


def _refusal(vendor, outcome):
    if outcome is None:
        return ConnectionTestFailed(_incomplete(vendor))
    return ConnectionTestFailed(
        f"{credentials.VENDOR_LABELS[vendor]} refused the credentials: {outcome.message}"
    )


def save_tested(values):
    """Test, then store: a changed vendor that fails its test blocks the whole save.

    The outcomes are recorded after the write, so a row written by this save
    carries its own result. Returns the status entries after the save.
    """
    changes = credentials.changes(values)
    outcomes = _probe_all(credentials.merged(values))
    for vendor in sorted(_vendors_of(changes)):
        if not _passed(outcomes[vendor]):
            raise _refusal(vendor, outcomes[vendor])
    credentials.save(changes)
    _record(outcomes)
    return credentials.status()
