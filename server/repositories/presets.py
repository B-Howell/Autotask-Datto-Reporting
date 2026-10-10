"""A preset is one report configured the way a user had it on screen.

The `options` column holds the report-specific choices (device columns, the
Office/Windows file format and so on) as a JSON object; the services layer
decides which keys are valid, this module only stores and decodes them.
"""

import json

from repositories import sqlite

COLUMNS = ("name", "report_type", "agency_key", "agency_name", "options")


def _decode(row):
    if row is None:
        return None
    row = dict(row)
    row["options"] = json.loads(row["options"] or "{}")
    return row


def _fields(values):
    """Keep only real columns, encoding `options` to JSON on the way through."""
    fields = {k: v for k, v in values.items() if k in COLUMNS}
    if "options" in fields:
        fields["options"] = json.dumps(fields["options"] or {})
    return fields


def insert(preset):
    now = sqlite.iso_now()
    data = _fields({k: preset.get(k) for k in COLUMNS})
    return sqlite.execute(
        """
        INSERT INTO report_presets (name, report_type, agency_key, agency_name, options,
                                    created_at, updated_at)
        VALUES (:name, :report_type, :agency_key, :agency_name, :options, :now, :now)
        """,
        {**data, "now": now},
    )


def update(preset_id, changes):
    sqlite.update_row("report_presets", preset_id, _fields(changes), COLUMNS)


def get(preset_id):
    rows = sqlite.query("SELECT * FROM report_presets WHERE id = ?", (preset_id,))
    return _decode(rows[0]) if rows else None


def list_presets():
    return [_decode(r) for r in sqlite.query("SELECT * FROM report_presets ORDER BY name")]


def delete(preset_id):
    sqlite.execute("DELETE FROM report_presets WHERE id = ?", (preset_id,))
