import os
import stat
import sys

import pytest

from core import secrets


@pytest.fixture
def key_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(secrets, "KEY_FILE", str(tmp_path / "secret.key"))
    monkeypatch.setenv("APP_SECRET_KEY", "")
    secrets.reset_cache()
    yield tmp_path
    secrets.reset_cache()


def test_round_trip(key_dir):
    blob = secrets.encrypt("hunter2-not-a-real-key")
    assert blob != b"hunter2-not-a-real-key"
    assert secrets.decrypt(blob) == "hunter2-not-a-real-key"


def test_key_file_is_created_once_with_owner_only_permissions(key_dir):
    secrets.encrypt("x")
    path = key_dir / "secret.key"
    assert path.exists()
    first = path.read_bytes()
    secrets.reset_cache()
    secrets.encrypt("y")
    assert path.read_bytes() == first
    if sys.platform != "win32":
        assert stat.S_IMODE(os.stat(path).st_mode) == 0o600


def test_key_source_reports_where_the_key_came_from(key_dir, monkeypatch):
    assert secrets.key_source() == "file"
    from cryptography.fernet import Fernet

    monkeypatch.setenv("APP_SECRET_KEY", Fernet.generate_key().decode())
    secrets.reset_cache()
    assert secrets.key_source() == "environment"


def test_environment_key_takes_precedence(key_dir, monkeypatch):
    from cryptography.fernet import Fernet

    env_key = Fernet.generate_key().decode()
    monkeypatch.setenv("APP_SECRET_KEY", env_key)
    secrets.reset_cache()
    blob = secrets.encrypt("value")
    assert not (key_dir / "secret.key").exists()
    assert Fernet(env_key.encode()).decrypt(blob).decode() == "value"


def test_a_key_file_created_by_another_worker_is_reused(key_dir, monkeypatch):
    from cryptography.fernet import Fernet

    other_key = Fernet.generate_key()
    real_open = os.open

    def racing_open(path, flags, mode=0o777):
        # Another worker wins the race between the existence check and O_EXCL.
        (key_dir / "secret.key").write_bytes(other_key)
        return real_open(path, flags, mode)

    monkeypatch.setattr(secrets.os, "open", racing_open)
    blob = secrets.encrypt("value")
    assert (key_dir / "secret.key").read_bytes() == other_key
    assert Fernet(other_key).decrypt(blob).decode() == "value"


def test_wrong_key_raises_a_clear_error(key_dir, monkeypatch):
    blob = secrets.encrypt("value")
    (key_dir / "secret.key").unlink()
    secrets.reset_cache()
    with pytest.raises(secrets.SecretsError, match="current key"):
        secrets.decrypt(blob)


def test_a_malformed_environment_key_is_rejected_with_the_setting_name(key_dir, monkeypatch):
    monkeypatch.setenv("APP_SECRET_KEY", "not-a-fernet-key")
    secrets.reset_cache()
    with pytest.raises(secrets.SecretsError, match="APP_SECRET_KEY"):
        secrets.encrypt("value")


def test_a_malformed_key_file_is_rejected_with_its_path(key_dir):
    (key_dir / "secret.key").write_bytes(b"not-a-fernet-key")
    with pytest.raises(secrets.SecretsError, match="secret.key"):
        secrets.encrypt("value")
