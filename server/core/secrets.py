"""Encrypt stored vendor credentials with a master key kept outside the database.

The key comes from APP_SECRET_KEY when set, otherwise from secret.key in the
data directory, generated once on first use. A copied database or backup is
useless without it; losing it means entering the credentials again.
"""

import os
import threading
import time

from cryptography.fernet import Fernet, InvalidToken

from config import settings

KEY_FILE = os.path.join(settings.data_dir, "secret.key")
ENV_VAR = "APP_SECRET_KEY"
# How long to wait for another worker that has created the key file but not
# yet written the key into it.
_EMPTY_FILE_RETRY_SECONDS = 0.2

_lock = threading.Lock()
_fernet = None
_source = None


class SecretsError(RuntimeError):
    """The key is unusable, or a stored value was encrypted with another key."""


def reset_cache():
    """Forget the loaded key so the next call reads it again (tests, rotation)."""
    global _fernet, _source
    with _lock:
        _fernet = None
        _source = None


def _env_key():
    # Read the environment directly rather than settings.app_secret_key: the
    # Settings object is frozen and loaded once at import, and this module is
    # expected to see a key that is set or cleared afterwards (the tests vary
    # it per case). The Settings field remains the documented name and lets
    # the rest of the app report whether the key is environment-provided.
    return os.environ.get(ENV_VAR, "").strip()


def _read_key_file():
    """Read the key file, waiting once for a worker that created it but has not written yet."""
    for attempt in range(2):
        with open(KEY_FILE, "rb") as f:
            key = f.read().strip()
        if key:
            return key
        if attempt == 0:
            time.sleep(_EMPTY_FILE_RETRY_SECONDS)
    raise SecretsError(f"{KEY_FILE} is empty")


def _load_key():
    """Return (key, source) where source is 'environment' or 'file'.

    The key is a str from the environment or bytes from the file; Fernet
    accepts either and validates it.
    """
    env_key = _env_key()
    if env_key:
        return env_key, "environment"
    if os.path.isfile(KEY_FILE):
        return _read_key_file(), "file"
    key = Fernet.generate_key()
    os.makedirs(os.path.dirname(KEY_FILE), exist_ok=True)
    try:
        # O_EXCL makes creation atomic, so two workers cannot both write the
        # file. The 0o600 mode makes it owner-only on POSIX; on Windows the C
        # runtime honours only the write bit and the file inherits its ACL
        # from the data directory, so lock that directory down instead.
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
    global _fernet, _source
    with _lock:
        if _fernet is None:
            key, source = _load_key()
            try:
                fernet = Fernet(key)
            except (ValueError, TypeError) as exc:
                where = ENV_VAR if source == "environment" else KEY_FILE
                raise SecretsError(f"{where} is not a valid Fernet key") from exc
            _fernet, _source = fernet, source
        return _fernet


def key_source():
    """'environment' or 'file': where the loaded key came from, for the Settings page.

    Loads the key if needed and answers from the cache, so the answer always
    describes the key in use even if the environment changed since.
    """
    _get()
    return _source


def encrypt(text):
    """Encrypt a string to an opaque bytes token for storage."""
    return _get().encrypt(text.encode("utf-8"))


def decrypt(blob):
    """Decrypt a stored token (bytes or str) back to the string it was made from.

    Tokens never expire: Fernet's timestamp is only checked when a TTL is
    passed, and none is.
    """
    try:
        return _get().decrypt(blob).decode("utf-8")
    except InvalidToken as exc:
        raise SecretsError("Stored credentials cannot be read with the current key") from exc
    except TypeError as exc:
        raise SecretsError(f"Stored credential is not a token: {type(blob).__name__}") from exc
