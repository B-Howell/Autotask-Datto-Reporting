# Credentials repository

> Rows for the `credentials` table: one encrypted vendor credential per field, keyed by the field name, with the time it was last saved and the outcome of the last connection test.

## Purpose

Vendor credentials entered on the Settings page have to outlive a restart and a redeploy, so they live in the database next to the other user data. This module owns the table and nothing else: it stores and returns opaque ciphertext and never sees a plain value. Which fields exist, how a value is encrypted, and when the environment takes precedence over a stored row are all decided by the [credentials service](<../services/Reporting Service - credentials.md>); the ciphertext itself comes from [secrets](<../core/Reporting Core - secrets.md>).

Like presets and schedules, these rows are user data with no upstream copy. The comment above the table in the [sqlite repository](<Reporting Repository - sqlite.md>) says it must never be listed in `_STALE_ON_UPGRADE`, so a `CACHE_VERSION` bump leaves it alone.

## Interface

| Name | Description |
|---|---|
| `get_all()` | Every row as a dict keyed by `name`. Each row carries `name`, `ciphertext` (bytes), `updated_at`, `last_tested_at` and `last_test_ok`, the last decoded to `True`, `False` or `None`. |
| `upsert_many(entries)` | For every `(name, ciphertext)` pair, inserts the row or, when the name exists, replaces its ciphertext; `updated_at` is stamped with one timestamp for the whole call. All the writes go in one transaction, so a failure on any pair leaves every row as it was. The test columns are left as they were. |
| `record_test(names, ok)` | Sets `last_tested_at` to now and `last_test_ok` to 1 or 0 on every row whose name is in `names`. A name with no row is skipped silently; an empty list is a no-op. |
| `delete_all()` | Deletes every row in one statement, so no transaction is needed; an empty table is harmless. The service calls it to forget the stored credentials. |

## Uses

- [sqlite repository](<Reporting Repository - sqlite.md>) for `query`, `execute`, `transaction` and `iso_now`.

## Used By

- [credentials service](<../services/Reporting Service - credentials.md>), imported as `repo`.
- [server/tests/test_credentials.py](../../../server/tests/test_credentials.py).

## Key Behavior

- `name` is the primary key, so each pair in `upsert_many` is one `INSERT ... ON CONFLICT(name) DO UPDATE` and the table can never hold two rows for one field. The pairs run on the connection the sqlite repository's `transaction()` yields, under its lock, and the transaction rolls back on the first failure (a `NULL` ciphertext trips the `NOT NULL` constraint, and the test shows the earlier pair is not kept). The service only ever passes names from its `FIELDS` table.
- `ciphertext` is a `BLOB NOT NULL`; SQLite hands it back as `bytes`, which is what `secrets.decrypt` takes. The repository has no key and cannot read it.
- `record_test` interpolates only the placeholder count into the `IN (...)` clause; the names and the timestamp stay bound parameters. Bandit reports the f-string as B608 at medium severity and medium confidence, which CI (gated at high) allows; the comment above the statement is the record of why it is safe.
- `last_test_ok` is stored as an integer and decoded to a bool on the way out, so callers never compare against `1`. A row that has never been tested has `NULL` in both test columns and decodes to `None`.
- Only rows that exist are stamped by `record_test`. A field supplied by the environment has no row, so a connection test of a vendor configured entirely through the environment leaves no trace here; the Settings page shows `last_tested_at` as absent for those fields.

## Cleanup Notes

- `record_test` could take the vendor name and own the `name IN (...)` list itself, but that would move knowledge of which field belongs to which vendor into the repository; the service passes the names instead so the mapping lives in one place.
- There is no single-row delete: nothing in the application clears one value (a save replaces, a forget removes all), so the module offers only `delete_all`.

## Source

[server/repositories/credentials.py](../../../server/repositories/credentials.py)
