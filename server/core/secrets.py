"""Encrypt stored vendor credentials with a master key kept outside the database.

The key comes from APP_SECRET_KEY when set, otherwise from secret.key in the
data directory, generated once on first use. A copied database or backup is
useless without it; losing it means entering the credentials again.
"""

import os
import threading

from cryptography.fernet import Fernet, InvalidToken

from config import settings

KEY_FILE = os.path.join(settings.data_dir, "secret.key")
ENV_VAR = "APP_SECRET_KEY"

_lock = threading.Lock()
_fernet = None


class SecretsError(RuntimeError):
    """The key is unusable, or a stored value was encrypted with another key."""


def reset_cache():
    """Forget the loaded key so the next call reads it again (tests, rotation)."""
    global _fernet
    with _lock:
        _fernet = None


def _env_key():
    # Read the environment directly rather than settings.app_secret_key: the
    # Settings object is frozen and loaded once at import, and this module is
    # expected to see a key that is set or cleared afterwards (the tests vary
    # it per case). The Settings field remains the documented name and lets
    # the rest of the app report whether the key is environment-provided.
    return os.environ.get(ENV_VAR, "").strip()


def _read_key_file():
    with open(KEY_FILE, "rb") as f:
        return f.read().strip()


def _load_key():
    """Return (key bytes, source) where source is 'environment' or 'file'."""
    env_key = _env_key()
    if env_key:
        return env_key.encode("ascii", "replace"), "environment"
    if os.path.isfile(KEY_FILE):
        return _read_key_file(), "file"
    key = Fernet.generate_key()
    os.makedirs(os.path.dirname(KEY_FILE), exist_ok=True)
    try:
        # O_EXCL makes creation atomic; 0o600 keeps the file owner-only on
        # POSIX (Windows accepts and ignores the mode).
        fd = os.open(KEY_FILE, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        # Another worker created the file between the check and the open;
        # its key is the one every worker must share.
        return _read_key_file(), "file"
    with os.fdopen(fd, "wb") as f:
        f.write(key)
    print(f"[INFO] Created {KEY_FILE}; back it up with the data directory")
    return key, "file"


def _get():
    global _fernet
    with _lock:
        if _fernet is None:
            key, source = _load_key()
            try:
                _fernet = Fernet(key)
            except (ValueError, TypeError) as exc:
                where = ENV_VAR if source == "environment" else KEY_FILE
                raise SecretsError(f"{where} is not a valid Fernet key") from exc
        return _fernet


def key_source():
    """'environment' or 'file', for the Settings page; loads the key if needed."""
    _get()
    return "environment" if _env_key() else "file"


def encrypt(text):
    """Encrypt a string to an opaque bytes token for storage."""
    return _get().encrypt(text.encode("utf-8"))


def decrypt(blob):
    """Decrypt a stored token back to the string it was made from."""
    try:
        return _get().decrypt(bytes(blob)).decode("utf-8")
    except InvalidToken as exc:
        raise SecretsError("Stored credentials cannot be read with the current key") from exc
