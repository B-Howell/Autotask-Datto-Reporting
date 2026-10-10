import json

import pytest
from conftest import SAMPLE_AUTOTASK as AUTOTASK
from conftest import SAMPLE_DATTO as DATTO
from conftest import store_values

from core import secrets
from repositories import credentials as repo
from services import credentials


def _status(name):
    return next(entry for entry in credentials.status() if entry["name"] == name)


def test_environment_wins_over_a_stored_value(store, monkeypatch):
    store_values({"autotask_username": "stored-user"})
    monkeypatch.setenv("AUTOTASK_USERNAME", "  env-user  ")
    credentials.invalidate()
    assert credentials.current()["autotask_username"] == "env-user"
    assert _status("autotask_username")["source"] == "environment"


def test_save_round_trip_is_encrypted_and_status_never_shows_the_value(store):
    store_values({"autotask_secret": AUTOTASK["autotask_secret"]})
    row = repo.get_all()["autotask_secret"]
    assert AUTOTASK["autotask_secret"].encode() not in row["ciphertext"]
    assert credentials.current()["autotask_secret"] == AUTOTASK["autotask_secret"]
    entry = _status("autotask_secret")
    assert entry["source"] == "stored"
    assert entry["configured"] is True
    assert entry["secret"] is True
    assert entry["last4"] == AUTOTASK["autotask_secret"][-4:]
    assert entry["updated_at"] == row["updated_at"]
    assert AUTOTASK["autotask_secret"] not in json.dumps(credentials.status())


def test_an_environment_secret_shows_its_last_four_too(store, monkeypatch):
    monkeypatch.setenv("DATTO_API_SECRET", "env-secret-value")
    credentials.invalidate()
    entry = _status("datto_api_secret")
    assert entry["source"] == "environment" and entry["last4"] == "alue"
    assert _status("datto_platform") == {
        "name": "datto_platform",
        "vendor": "datto",
        "secret": False,
        "configured": False,
        "source": "missing",
        "last4": "",
        "updated_at": None,
        "last_tested_at": None,
        "last_test_ok": None,
    }


def test_a_blank_value_keeps_the_stored_one(store):
    store_values({"autotask_username": "first"})
    store_values({"autotask_username": "   ", "autotask_secret": "s3cret-not-real"})
    assert credentials.current()["autotask_username"] == "first"
    assert credentials.current()["autotask_secret"] == "s3cret-not-real"


def test_an_unknown_name_is_rejected(store):
    with pytest.raises(ValueError, match="autotask_password"):
        store_values({"autotask_password": "x"})
    assert repo.get_all() == {}


def test_a_field_set_by_the_environment_cannot_be_saved(store, monkeypatch):
    monkeypatch.setenv("AUTOTASK_PASSWORD", "from-env")
    with pytest.raises(ValueError, match="AUTOTASK_PASSWORD is set by the environment"):
        store_values({"autotask_secret": "x"})
    assert repo.get_all() == {}


def test_the_base_url_must_be_https_and_loses_its_trailing_slash(store):
    with pytest.raises(ValueError, match="https://"):
        store_values({"autotask_base_url": "http://webservices.example.test/"})
    store_values({"autotask_base_url": "https://webservices.example.test/api/"})
    assert credentials.current()["autotask_base_url"] == "https://webservices.example.test/api"


def test_the_datto_platform_must_be_a_hostname_label(store):
    for bad in ("Example", "example.centrastage.net", "ex ample", "https://example"):
        with pytest.raises(ValueError, match="platform"):
            store_values({"datto_platform": bad})
    store_values({"datto_platform": "  zinfandel-2  "})
    assert credentials.current()["datto_platform"] == "zinfandel-2"
    assert credentials.datto_api_base() == "https://zinfandel-2-api.centrastage.net"
    assert credentials.token_url_for("other") == (
        "https://other-api.centrastage.net/auth/oauth/token"
    )


def test_a_rejected_save_writes_nothing(store):
    with pytest.raises(ValueError):
        store_values({"autotask_username": "fine", "datto_platform": "Not Valid"})
    assert repo.get_all() == {}


def test_invalidate_and_a_stored_change_notify_listeners(store):
    calls = []
    credentials.on_change(lambda: calls.append("called"))
    credentials.invalidate()
    assert calls == ["called"]
    store_values({"autotask_username": "u"})
    assert calls == ["called", "called"]


def test_storing_no_changes_writes_nothing_and_does_not_notify(store):
    calls = []
    credentials.on_change(lambda: calls.append("called"))
    cleaned = credentials.changes({"autotask_username": "   ", "autotask_secret": ""})
    assert cleaned == {}
    credentials.store_changes(cleaned)
    assert calls == [] and repo.get_all() == {}


def test_a_listener_may_read_the_new_values_while_it_runs(store):
    seen = []
    credentials.on_change(lambda: seen.append(credentials.current()["autotask_username"]))
    store_values({"autotask_username": "fresh"})
    assert seen == ["fresh"]


def test_a_listener_registered_during_a_callback_runs_next_time(store):
    calls = []
    credentials.on_change(lambda: credentials.on_change(lambda: calls.append("late")))
    credentials.invalidate()
    assert calls == []
    credentials.invalidate()
    assert calls == ["late"]


def test_a_short_secret_shows_no_hint(store):
    store_values({"autotask_secret": "elevenchars"})
    assert _status("autotask_secret")["last4"] == ""
    store_values({"autotask_secret": "twelve-chars"})
    assert _status("autotask_secret")["last4"] == "hars"


def test_a_save_is_one_transaction(store):
    with pytest.raises(Exception, match="NOT NULL"):
        repo.upsert_many([("autotask_username", b"token"), ("autotask_secret", None)])
    assert repo.get_all() == {}


def test_a_stored_value_that_no_longer_decrypts_fails_loudly(store, tmp_path):
    store_values({"autotask_username": "u"})
    (tmp_path / "secret.key").unlink()
    secrets.reset_cache()
    credentials.invalidate()
    with pytest.raises(secrets.SecretsError, match="current key"):
        credentials.current()
    with pytest.raises(secrets.SecretsError, match="current key"):
        credentials.status()


def test_current_is_cached_until_invalidated(store, monkeypatch):
    assert credentials.current()["autotask_username"] == ""
    monkeypatch.setenv("AUTOTASK_USERNAME", "later")
    assert credentials.current()["autotask_username"] == ""
    credentials.invalidate()
    assert credentials.current()["autotask_username"] == "later"


def test_require_needs_every_field_of_the_vendor_from_either_source(store, monkeypatch):
    store_values({k: v for k, v in AUTOTASK.items() if k != "autotask_base_url"})
    with pytest.raises(credentials.CredentialsMissing, match="^Autotask credentials"):
        credentials.require("autotask")
    monkeypatch.setenv("AUTOTASK_BASE_URL", AUTOTASK["autotask_base_url"])
    credentials.invalidate()
    assert credentials.require("autotask")["autotask_base_url"] == AUTOTASK["autotask_base_url"]
    with pytest.raises(credentials.CredentialsMissing, match="^Datto credentials"):
        credentials.require("datto")
    store_values(DATTO)
    assert credentials.require("datto") == credentials.current()


def test_require_returns_the_values_or_names_the_vendor(store):
    with pytest.raises(credentials.CredentialsMissing) as missing:
        credentials.require("datto")
    assert str(missing.value) == "Datto credentials are not configured; open Settings"
    store_values(DATTO)
    assert credentials.require("datto") == credentials.current()


def test_require_all_names_every_unconfigured_vendor_in_one_error(store):
    with pytest.raises(credentials.CredentialsMissing) as missing:
        credentials.require_all(["autotask", "datto"])
    assert str(missing.value) == "Autotask and Datto credentials are not configured; open Settings"
    store_values(DATTO)
    with pytest.raises(credentials.CredentialsMissing, match="^Autotask credentials"):
        credentials.require_all(["autotask", "datto"])
    store_values(AUTOTASK)
    assert credentials.require_all(["autotask", "datto"]) == credentials.current()


def test_record_test_stamps_only_that_vendors_rows(store):
    store_values({**AUTOTASK, **DATTO})
    credentials.record_test("datto", ok=False)
    rows = repo.get_all()
    for name in DATTO:
        assert rows[name]["last_tested_at"] is not None
        assert rows[name]["last_test_ok"] is False
    for name in AUTOTASK:
        assert rows[name]["last_tested_at"] is None
        assert rows[name]["last_test_ok"] is None
    assert _status("datto_api_key")["last_test_ok"] is False
    credentials.record_test("datto", ok=True)
    assert _status("datto_api_key")["last_test_ok"] is True


def test_changes_validates_every_entry_and_merged_from_lays_them_over_the_stored_ones(
    store, monkeypatch
):
    store_values(AUTOTASK)
    cleaned = credentials.changes({"autotask_username": "other", "autotask_secret": "  "})
    assert cleaned == {"autotask_username": "other"}
    merged = credentials.merged_from(cleaned)
    assert merged["autotask_username"] == "other"
    assert merged["autotask_secret"] == AUTOTASK["autotask_secret"]
    assert credentials.current()["autotask_username"] == AUTOTASK["autotask_username"]
    with pytest.raises(ValueError, match="Unknown credential: nope"):
        credentials.changes({"nope": "x"})
    monkeypatch.setenv("AUTOTASK_USERNAME", "env-user")
    with pytest.raises(ValueError, match="AUTOTASK_USERNAME is set by the environment"):
        credentials.changes({"autotask_username": "other"})


def test_repository_delete_all_empties_the_table(store):
    store_values({**AUTOTASK, **DATTO})
    repo.delete_all()
    assert repo.get_all() == {}
    credentials.invalidate()
    assert credentials.current()["autotask_username"] == ""


def test_forget_stored_removes_every_row_and_the_next_status_reads_missing(store, monkeypatch):
    calls = []
    credentials.on_change(lambda: calls.append("called"))
    store_values({**AUTOTASK, **DATTO})
    monkeypatch.setenv("AUTOTASK_USERNAME", "env-user")
    calls.clear()
    credentials.forget_stored()
    assert calls == ["called"]
    assert repo.get_all() == {}
    assert _status("autotask_secret")["source"] == "missing"
    assert _status("datto_api_key") == {
        "name": "datto_api_key",
        "vendor": "datto",
        "secret": True,
        "configured": False,
        "source": "missing",
        "last4": "",
        "updated_at": None,
        "last_tested_at": None,
        "last_test_ok": None,
    }
    assert _status("autotask_username")["source"] == "environment"
    assert credentials.current()["autotask_username"] == "env-user"


def test_forget_stored_works_when_the_rows_no_longer_decrypt(store, tmp_path):
    store_values({"autotask_username": "u"})
    (tmp_path / "secret.key").unlink()
    secrets.reset_cache()
    credentials.invalidate()
    with pytest.raises(secrets.SecretsError):
        credentials.current()
    credentials.forget_stored()
    assert repo.get_all() == {}
    assert all(value == "" for value in credentials.current().values())
