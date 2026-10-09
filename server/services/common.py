"""Small helpers shared by more than one report service."""

from datetime import datetime

from report_rules import UDF_PENDING_RETIRED, VM_MODELS


def strip_domain(user):
    """'EXAMPLECORP\\jsmith' -> 'jsmith'. A bare username passes through.

    rsplit rather than split: a name is occasionally reported with more than
    one separator, and the account is always the last segment.
    """
    return (user or "").rsplit("\\", 1)[-1]


def is_virtual_machine(model):
    return isinstance(model, str) and model.strip() in VM_MODELS


def udf_values(item):
    """{name: value} for a configuration item's user-defined fields."""
    return {udf["name"]: udf.get("value", "") for udf in item.get("userDefinedFields") or []}


def is_pending_retired(udf_fields):
    return str(udf_fields.get(UDF_PENDING_RETIRED, "")).lower() == "pending"


def parse_autotask_datetime(value):
    """Autotask sends ISO 8601 with a trailing Z; returns an aware datetime or None."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def month_bounds(year, month):
    """(start, end) datetimes for a calendar month; end is exclusive."""
    start = datetime(year, month, 1)
    end = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)
    return start, end


def autotask_timestamp(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
