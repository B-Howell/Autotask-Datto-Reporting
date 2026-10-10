"""Rows for the `credentials` table: one encrypted vendor credential per field.

This module stores and reads opaque ciphertext; it never sees a plain value.
Which fields exist, how they are encrypted and where the environment takes
precedence is decided by the credentials service.
"""

from repositories import sqlite

_UPSERT = """
    INSERT INTO credentials (name, ciphertext, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET ciphertext = excluded.ciphertext,
                                    updated_at = excluded.updated_at
"""


def _decode(row):
    row = dict(row)
    ok = row["last_test_ok"]
    row["last_test_ok"] = None if ok is None else bool(ok)
    return row


def get_all():
    """Every stored row keyed by field name."""
    return {row["name"]: _decode(row) for row in sqlite.query("SELECT * FROM credentials")}


def upsert_many(entries):
    """Store every `(name, ciphertext)` pair in one transaction, so a save is all or nothing."""
    now = sqlite.iso_now()
    with sqlite.transaction() as conn:
        for name, ciphertext in entries:
            conn.execute(_UPSERT, (name, ciphertext, now))


def record_test(names, ok):
    """Stamp the outcome of a connection test on the rows named; names with no row are skipped."""
    names = list(names)
    if not names:
        return
    # Only the placeholder count is interpolated; every value stays a bound parameter.
    placeholders = ", ".join("?" for _ in names)
    sqlite.execute(
        f"UPDATE credentials SET last_tested_at = ?, last_test_ok = ? WHERE name IN ({placeholders})",
        (sqlite.iso_now(), 1 if ok else 0, *names),
    )


def delete(name):
    sqlite.execute("DELETE FROM credentials WHERE name = ?", (name,))
