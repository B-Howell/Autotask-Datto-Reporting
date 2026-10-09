"""Presets: validate and store one report's configuration for later scheduled runs.

A preset is what a schedule renders, so a bad preset would fail silently at
seven in the morning rather than in front of a user. Everything that can be
checked up front is checked here: the report type must be one the renderer
knows, agency-scoped reports must name an agency, and the options are cut
down to the keys the renderer reads for that report and type-checked.
"""

from repositories import presets as repo
from repositories import schedules

_NO_OPTIONS = ()


def _is_string_list(value):
    return isinstance(value, list) and all(isinstance(item, str) for item in value)


def _office_windows(options):
    if options.get("format", "docx") not in ("docx", "pdf"):
        raise ValueError("format must be docx or pdf")
    if "showLicenses" in options and not isinstance(options["showLicenses"], bool):
        raise ValueError("showLicenses must be true or false")


def _devices(options):
    columns = options.get("columns")
    if columns is not None and not _is_string_list(columns):
        raise ValueError("columns must be a list of column names")


def _annual_utilization(options):
    companies = options.get("companies")
    if companies is not None and not _is_string_list(companies):
        raise ValueError("companies must be a list of company names")
    rates = options.get("rates")
    if rates is not None and not (
        isinstance(rates, dict)
        and all(
            isinstance(name, str) and isinstance(rate, int | float | str)
            for name, rate in rates.items()
        )
    ):
        raise ValueError("rates must map a name to a number or a string")


# report type -> (needs an agency, allowed option keys, validator)
#
# The keys must match the renderer's handler table in client/renderer/render.ts
# exactly: a preset with a type the renderer does not know cannot be rendered.
# The allowed option keys are the ones each handler reads from its request.
REPORT_TYPES = {
    "devices": (True, ("columns",), _devices),
    "office_windows": (True, ("format", "showLicenses"), _office_windows),
    "patch": (True, _NO_OPTIONS, None),
    "hdd_tickets": (True, _NO_OPTIONS, None),
    "sla": (False, _NO_OPTIONS, None),
    "quarterly_utilization": (False, _NO_OPTIONS, None),
    # The annual report also takes `departments`, but that is not stored in a
    # preset: a scheduled run reads the tenant's ratedDepartments at run time
    # so a department rename never strands a schedule.
    "annual_utilization": (False, ("companies", "rates"), _annual_utilization),
}


def _validated(preset):
    report_type = preset.get("report_type")
    if report_type not in REPORT_TYPES:
        raise ValueError(f"Unknown report type: {report_type}")
    needs_agency, allowed, validate = REPORT_TYPES[report_type]
    agency_key = preset.get("agency_key")
    if needs_agency and not agency_key:
        raise ValueError("This report needs an agency")
    options = {k: v for k, v in (preset.get("options") or {}).items() if k in allowed}
    if validate:
        validate(options)
    name = (preset.get("name") or "").strip()
    if not name:
        raise ValueError("A preset needs a name")
    return {
        "name": name,
        "report_type": report_type,
        "agency_key": str(agency_key) if needs_agency else None,
        "agency_name": preset.get("agency_name") or "",
        "options": options,
    }


def create(preset):
    return repo.get(repo.insert(_validated(preset)))


def update(preset_id, changes):
    current = repo.get(preset_id)
    if current is None:
        raise LookupError("No such preset")
    repo.update(preset_id, _validated({**current, **changes}))
    return repo.get(preset_id)


def get(preset_id):
    return repo.get(preset_id)


def list_presets():
    return repo.list_presets()


def delete(preset_id):
    # A schedule renders its preset by id; deleting the preset underneath it
    # would turn the next run into an error nobody is watching for.
    if schedules.list_for_preset(preset_id):
        raise ValueError("Delete its schedules first")
    repo.delete(preset_id)
