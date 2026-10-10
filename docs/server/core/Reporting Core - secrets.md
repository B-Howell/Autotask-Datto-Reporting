# Stored secrets

> Encrypts the vendor credentials kept in the database with a master key held outside it: `APP_SECRET_KEY` when set, otherwise `secret.key` in the data directory, generated once on first use.

## Purpose

Vendor credentials entered in the app's Settings page are stored in SQLite so a key rotation never needs a redeploy. Storing them in clear text would make every copy of the database file, and every backup of the data volume, a credential leak. This module keeps the master key out of the database: a deployment either sets `APP_SECRET_KEY` or lets the server generate `secret.key` next to the database, where the compose volume already persists and backs it up. A copied database is useless without the key; losing the key means entering the credentials again, which is the deliberate trade. The design decision is to use Fernet (AES-128-CBC with an HMAC) from the `cryptography` package rather than anything hand-rolled: the token is authenticated, so a value encrypted under another key fails cleanly instead of decrypting to garbage.

## Interface

| Name | Description |
|---|---|
| `SecretsError` | `RuntimeError` subclass raised when the key is unusable or a stored value was encrypted with a different key. |
| `KEY_FILE` | `<data_dir>/secret.key`, the fallback key location. Tests point it at a temporary path. |
| `ENV_VAR` | `"APP_SECRET_KEY"`, the environment variable that overrides the file. |
| `encrypt(text)` | Returns the Fernet token (bytes) for a string. |
| `decrypt(blob)` | Returns the string a token was made from; raises `SecretsError("Stored credentials cannot be read with the current key")` if the token does not verify under the loaded key. |
| `key_source()` | `"environment"` or `"file"`, for the Settings page to show where the key comes from; loads the key as a side effect. |
| `reset_cache()` | Forgets the loaded key so the next call reads it again. Used by tests and available for a future rotation flow. |

## Uses

- `cryptography.fernet` (`Fernet`, `InvalidToken`)
- `os`, `threading`
- [config](<../Reporting Server - config.md>) for `settings.data_dir`

## Used By

- [server/tests/test_secrets.py](../../../server/tests/test_secrets.py)
- The credentials repository, service, router and Settings page that store and read vendor credentials build on this module; until they land nothing else imports it.

## Key Behavior

- The key is read once and cached in a module-level `Fernet` under a lock; every public function goes through `_get()`, so the first call from any thread loads it and later calls share it.
- `APP_SECRET_KEY` is read from the environment at key-load time, not from `settings.app_secret_key`. The `Settings` object is frozen and loaded once at import, and the tests need to set and clear the variable per case. The field on `Settings` is the documented name and lets other code report whether the deployment supplied a key.
- Precedence: a non-blank `APP_SECRET_KEY` wins and the key file is never created or read; otherwise an existing `secret.key` is read; otherwise a key is generated, written and logged with `[INFO] Created <path>; back it up with the data directory`.
- The file is created with `O_CREAT | O_EXCL` and mode `0o600`, so on POSIX it is owner-only from the first instant and two workers starting at once cannot both write it. If the exclusive open fails with `FileExistsError` the other worker's file is read instead, so every worker ends up with the same key (`test_a_key_file_created_by_another_worker_is_reused`). Windows accepts and ignores the mode; the permission assertion in the tests is skipped there.
- A malformed key raises `SecretsError` naming where it came from: `APP_SECRET_KEY is not a valid Fernet key` for the environment, `<path> is not a valid Fernet key` for the file. The error is raised from inside `_get()`, so `encrypt`, `decrypt` and `key_source` all surface it.
- Fernet tokens are authenticated: decrypting with the wrong key raises `InvalidToken`, which is translated to `SecretsError` with the `current key` message rather than returning bytes. The same error is what a deployment sees after losing its key file.
- Only the data directory is created on demand (`os.makedirs(..., exist_ok=True)`); the key file itself is never overwritten once present.

## Cleanup Notes

- `reset_cache()` clears the cached `Fernet` but not any value a caller has already decrypted; a rotation flow will need to re-encrypt stored rows under the new key before switching, which is outside this module.
- The `[INFO]` line is printed rather than routed through the log buffer, the same way [main](<../Reporting Server - main.md>) prints its `[WARN]` line when a schedule tick fails.

## Source

[server/core/secrets.py](../../../server/core/secrets.py)
