import pytest

from core import credential_source, jobs
from core.log_buffer import LogBuffer
from services.device_audit import classify_office, primary_office_label, round_storage_gb


def test_log_buffer_cursor_survives_eviction_and_clear():
    buffer = LogBuffer(max_lines=3)
    for i in range(5):
        buffer.append(f"line {i}")

    lines, cursor = buffer.since(0)
    assert lines == ["line 2", "line 3", "line 4"] and cursor == 5

    buffer.append("line 5")
    lines, cursor = buffer.since(cursor)
    assert lines == ["line 5"] and cursor == 6

    buffer.clear()
    buffer.append("fresh")
    lines, cursor = buffer.since(cursor)
    assert lines == ["fresh"]


def test_cancelling_a_job_raises_at_the_next_log_line():
    job_id = jobs.start("Report · test")
    jobs.note(job_id, '[PROGRESS] {"phase": "Collecting", "done": 3, "total": 10}')
    assert jobs.current()["progress"]["done"] == 3

    assert jobs.cancel() is True
    with pytest.raises(jobs.ReportCancelled):
        jobs.raise_if_cancelled(job_id)

    jobs.finish(job_id, cancelled=True)
    assert jobs.current()["status"] == "cancelled"
    assert jobs.cancel() is False
    jobs.clear()


@pytest.mark.parametrize(
    "name, label",
    [
        ("Microsoft 365 Apps for business - en-us", "Microsoft 365 Business"),
        ("Microsoft 365 Apps for enterprise - en-us", "Microsoft 365 Enterprise"),
        ("Microsoft Office Standard 2019 w/ Access", "Office Standard 2019 w/ Access"),
        ("Microsoft Office LTSC Professional Plus 2024", "Office LTSC Professional Plus 2024"),
        ("Microsoft Office Proofing Tools 2016", None),
        ("Google Chrome", None),
    ],
)
def test_office_names_are_classified(name, label):
    assert classify_office(name) == label


def test_primary_office_prefers_a_specific_plan_then_the_newest_edition():
    assert (
        primary_office_label(["Office Standard 2016", "Microsoft 365 Business"])
        == "Microsoft 365 Business"
    )
    assert (
        primary_office_label(["Office Standard 2016", "Office Standard 2021"])
        == "Office Standard 2021"
    )
    assert primary_office_label([]) is None


def test_storage_rounds_up_to_the_marketing_size():
    assert round_storage_gb(238.4) == 240
    assert round_storage_gb(476.9) == 480
    assert round_storage_gb(0) == ""


def test_an_unregistered_credential_source_fails_naming_the_cause(monkeypatch):
    monkeypatch.setattr(credential_source, "_source", None)
    for read in (
        credential_source.current,
        lambda: credential_source.require("autotask"),
        lambda: credential_source.on_change(lambda: None),
        lambda: credential_source.api_base_for("example"),
        credential_source.datto_api_base,
    ):
        with pytest.raises(RuntimeError, match="^No credential source registered$"):
            read()


def test_a_registered_source_is_forwarded_to(monkeypatch):
    class Source:
        def __init__(self):
            self.listeners = []

        def current(self):
            return {"datto_platform": "example"}

        def require(self, vendor):
            return {"vendor": vendor}

        def on_change(self, callback):
            self.listeners.append(callback)

        def api_base_for(self, platform):
            return f"https://{platform}-api.example.test"

        def datto_api_base(self):
            return self.api_base_for(self.current()["datto_platform"])

    source = Source()
    monkeypatch.setattr(credential_source, "_source", None)
    credential_source.register(source)
    listener = lambda: None  # noqa: E731
    credential_source.on_change(listener)
    assert credential_source.current() == {"datto_platform": "example"}
    assert credential_source.require("datto") == {"vendor": "datto"}
    assert credential_source.api_base_for("other") == "https://other-api.example.test"
    assert credential_source.datto_api_base() == "https://example-api.example.test"
    assert source.listeners == [listener]
